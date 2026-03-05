// 文档控制器

const Document = require('../models/Document')
const { validationResult } = require('express-validator')
const sendResponse = require('../utils/response')
const UserDocumentMeta = require('../models/UserDocumentMeta')

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

  const { title, content, content_type, category, tags } = req.body
  const author_id = req.user.id

  try {
    const document = new Document({
      title,
      content,
      content_type,
      category,
      tags,
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
// @desc    Get a document by ID
// @access  Private
exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)

    if (!document) {
      return sendResponse(res, {
        message: '文档不存在',
      })
    }

    // 权限校验：作者本人或管理员可以访问私有文档；
    // 其他用户仅能访问在公开窗口内且未被禁止公开的文档。
    const isAuthor = document.author_id.toString() === req.user.id
    const isAdmin = req.user.role === 'admin'

    if (!isAuthor && !isAdmin) {
      if (document.visibility !== 'public' || document.publicBlocked) {
        return sendResponse(res, {
          message: '无权访问此文档',
        })
      }

      const now = new Date()
      if (
        (document.publicFrom && now < document.publicFrom) ||
        (document.publicTo && now > document.publicTo)
      ) {
        return sendResponse(res, {
          message: '文档当前未在公开时间范围内',
        })
      }
    }

    // 更新用户文档元数据的最近访问时间
    await UserDocumentMeta.findOneAndUpdate(
      { userId: req.user.id, documentId: document._id },
      {
        $set: { lastAccessedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    )

    sendResponse(res, document)
  } catch (err) {
    console.error(err.message)
    sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// @route   PUT /api/documents/:id
// @desc    Update a document
// @access  Private
exports.updateDocument = async (req, res) => {
  const { title, content, category } = req.body
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

    // Update document
    document.title = title
    document.content = content
    document.category = category
    document.updated_at = new Date()

    await document.save()

    sendResponse(res, document)
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
