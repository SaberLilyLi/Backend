// 文档控制器

const Document = require('../models/Document')
const { validationResult } = require('express-validator')
const sendResponse = require('../utils/response')
const UserDocumentMeta = require('../models/UserDocumentMeta')
const DocumentShare = require('../models/DocumentShare')

// @route   POST /api/documents
// @desc    Create a new document
// @access  Private
exports.createDocument = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return sendResponse(res, {
      success: false,
      code: 40001,
      message: '参数校验失败',
      data: errors.array(),
    })
  }

  const { title, content, content_type, category, tags, description } = req.body
  const author_id = req.user.id

  try {
    const document = new Document({
      title,
      content,
      content_type,
      category,
      tags,
      description,
      author_id,
    })

    const newDocument = await document.save()

    // 初始化当前作者的文档元数据记录（用于最近/归档等）
    await UserDocumentMeta.create({
      userId: author_id,
      documentId: newDocument._id,
    })

    sendResponse(res, {
      message: '文档创建成功',
      data: newDocument,
      status: 201,
    })
  } catch (err) {
    console.error(err.message)
    sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// @route   GET /api/documents
// @route   POST /api/documents/query
// @desc    Get all documents（支持 Query 或 JSON Body 方式传参）
// @access  Private
exports.getDocuments = async (req, res) => {
  // 兼容 GET Query 和 POST JSON Body 两种传参方式
  const source = req.method === 'POST' ? req.body : req.query
  const {
    category,
    tags,
    limit = 20,
    page = 1,
    keyword,
    sortBy = 'created_at',
    order = 'desc',
    mode = 'all', // all | favorite | recent | archived
    uploader, // 预留按上传用户过滤（目前等同于 author_id）
  } = source
  const author_id = req.user.id

  try {
    let documents
    let total

    // 排序规则
    const sort = {}
    sort[sortBy] = order === 'asc' ? 1 : -1

    if (['favorite', 'recent', 'archived'].includes(mode)) {
      // 通过 UserDocumentMeta 计算收藏 / 最近 / 已归档列表
      const metaQuery = { userId: author_id }

      if (mode === 'favorite') {
        metaQuery.isFavorite = true
      } else if (mode === 'archived') {
        metaQuery.isArchived = true
      } else if (mode === 'recent') {
        metaQuery.lastAccessedAt = { $ne: null }
      }

      const metaSort =
        mode === 'recent' ? { lastAccessedAt: -1 } : { updatedAt: -1 }

      const allMeta = await UserDocumentMeta.find(metaQuery)
        .sort(metaSort)
        .exec()

      total = allMeta.length

      const start = (page - 1) * limit
      const end = start + Number(limit)
      const pageMeta = allMeta.slice(start, end)
      const docIds = pageMeta.map((m) => m.documentId)

      documents = await Document.find({ _id: { $in: docIds } })
        .select('-content') // 列表查询不返回全文内容
        .populate('author_id', 'username email avatarUrl')
        .exec()
    } else {
      // 默认模式：查询当前用户创建的文档（可按条件过滤），并支持按上传用户 ID 过滤
      const query = { author_id }

      if (uploader) {
        query.author_id = uploader
      }

      if (category) {
        query.category = category
      }

      if (tags) {
        if (Array.isArray(tags)) {
          query.tags = { $in: tags }
        } else if (typeof tags === 'string') {
          query.tags = { $in: tags.split(',') }
        }
      }

      if (keyword) {
        const regex = new RegExp(keyword, 'i')
        query.$or = [{ title: regex }, { content: regex }]
      }

      total = await Document.countDocuments(query)

      documents = await Document.find(query)
        .select('-content') // 列表查询不返回全文内容
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author_id', 'username email avatarUrl')
        .exec()
    }

    sendResponse(res, {
      message: '文档列表获取成功',
      data: {
        documents,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    })
  } catch (err) {
    console.error(err.message)
    sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// @route   GET /api/documents/:id
// @desc    获取文档详情（预览 / 编辑用）
// @access  Private
exports.getDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).populate(
      'author_id',
      'username email avatarUrl',
    )

    if (!doc) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '文档不存在',
      })
    }

    // 权限校验：作者本人或管理员可以访问私有文档；
    // 其他用户仅能访问在公开窗口内且未被禁止公开的文档，或者存在未过期的定向共享记录。
    const isAuthor = doc.author_id._id.toString() === req.user.id
    const isAdmin = req.user.role === 'admin'

    if (!isAuthor && !isAdmin) {
      const now = new Date()

      if (doc.visibility === 'public' && !doc.publicBlocked) {
        if (
          (doc.publicFrom && now < doc.publicFrom) ||
          (doc.publicTo && now > doc.publicTo)
        ) {
          return sendResponse(res, {
            success: false,
            code: 403,
            message: '文档当前未在公开时间范围内',
          })
        }
      } else {
        const shared = await DocumentShare.findOne({
          documentId: doc._id,
          targetUserId: req.user.id,
          expiresAt: { $gte: now },
        })

        if (!shared) {
          return sendResponse(res, {
            success: false,
            code: 403,
            message: '无权访问此文档',
          })
        }
      }
    }

    // 更新用户文档元数据的最近访问时间
    await UserDocumentMeta.findOneAndUpdate(
      { userId: req.user.id, documentId: doc._id },
      {
        $set: { lastAccessedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    )

    // 构造前端需要的详情视图数据（不返回文件/正文本身，仅返回下载链接和元信息）
    const downloadUrl = `${req.baseUrl}/${doc._id.toString()}/export`

    return sendResponse(res, {
      message: '文档详情获取成功',
      data: {
        id: doc._id,
        title: doc.title,
        description: doc.description,
        tags: doc.tags,
        category: doc.category,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        visibility: doc.visibility,
        publicFrom: doc.publicFrom,
        publicTo: doc.publicTo,
        uploader: {
          id: doc.author_id._id,
          username: doc.author_id.username,
          email: doc.author_id.email,
          avatarUrl: doc.author_id.avatarUrl,
        },
        downloadUrl,
      },
    })
  } catch (err) {
    console.error('[GET_DOCUMENT_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// @route   PUT /api/documents/:id
// @desc    Update document metadata（不建议修改正文，用于轻量编辑）
// @access  Private
exports.updateDocument = async (req, res) => {
  const { title, category, tags, content_type } = req.body
  const documentId = req.params.id
  const author_id = req.user.id

  try {
    let document = await Document.findById(documentId)

    if (!document) {
      return sendResponse(res, {
        message: '文档不存在',
      })
    }

    // Check if document belongs to current user
    if (document.author_id.toString() !== author_id) {
      return sendResponse(res, {
        message: '无权更新此文档',
      })
    }

    // Update document（仅对传入的字段进行更新，避免覆盖为 undefined）
    if (typeof title !== 'undefined') {
      document.title = title
    }
    if (typeof category !== 'undefined') {
      document.category = category
    }
    if (typeof content_type !== 'undefined') {
      document.content_type = content_type
    }
    if (typeof tags !== 'undefined') {
      // 前端可传字符串数组，直接覆盖
      document.tags = Array.isArray(tags) ? tags : [tags]
    }

    document.updated_at = new Date()

    await document.save()

    sendResponse(res, {
      message: '文档元数据更新成功',
      data: document,
    })
  } catch (err) {
    console.error(err.message)
    sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// @route   DELETE /api/documents/:id
// @desc    Delete a document
// @access  Private
exports.deleteDocument = async (req, res) => {
  const documentId = req.params.id
  const author_id = req.user.id

  try {
    const document = await Document.findById(documentId)

    if (!document) {
      return sendResponse(res, {
        message: '文档不存在',
      })
    }

    // Check if document belongs to current user
    if (document.author_id.toString() !== author_id) {
      return sendResponse(res, {
        message: '无权删除此文档',
      })
    }

    await Document.findByIdAndDelete(documentId)

    sendResponse(res, {
      message: '文档已删除',
    })
  } catch (err) {
    console.error(err.message)
    sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// @route   POST /api/documents/:id/export
// @desc    导出文档内容为文件下载（仅作者或管理员）
// @access  Private
exports.exportDocument = async (req, res) => {
  const documentId = req.params.id
  const userId = req.user.id

  try {
    const document = await Document.findById(documentId)

    if (!document) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '文档不存在',
      })
    }

    const isAuthor = document.author_id.toString() === userId
    const isAdmin = req.user.role === 'admin'

    if (!isAuthor && !isAdmin) {
      return sendResponse(res, {
        success: false,
        code: 403,
        message: '无权导出此文档',
      })
    }

    const filename = `${document.title || 'document'}.md`

    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    )
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')

    return res.send(document.content || '')
  } catch (err) {
    console.error('[EXPORT_DOCUMENT_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// @route   POST /api/documents/:id/save
// @desc    编辑保存：仅更新文件描述（备注），不修改原文件内容
// @access  Private（仅作者或管理员）
exports.saveDocument = async (req, res) => {
  const { description } = req.body
  const documentId = req.params.id
  const userId = req.user.id

  try {
    const doc = await Document.findById(documentId)

    if (!doc) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '文档不存在',
      })
    }

    const isAuthor = doc.author_id.toString() === userId
    const isAdmin = req.user.role === 'admin'

    if (!isAuthor && !isAdmin) {
      return sendResponse(res, {
        success: false,
        code: 403,
        message: '无权编辑此文档',
      })
    }

    if (typeof description !== 'undefined') {
      doc.description = description
    }

    doc.updated_at = new Date()

    await doc.save()

    return sendResponse(res, {
      message: '文档保存成功',
      data: doc,
    })
  } catch (err) {
    console.error('[SAVE_DOCUMENT_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}
