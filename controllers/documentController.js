// 文档控制器

const Document = require('../models/Document')
const Notification = require('../models/Notification')
const { validationResult } = require('express-validator')
const sendResponse = require('../utils/response')
const UserDocumentMeta = require('../models/UserDocumentMeta')
const DocumentShare = require('../models/DocumentShare')
const { incrementTagUsage, decrementTagUsage, syncTagUsageDiff } = require('../utils/tagUsage')

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
    await newDocument.populate('author_id', 'username email avatarUrl')

    // 初始化当前作者的文档元数据记录（新文件自动进入"最近"）
    await UserDocumentMeta.create({
      userId: author_id,
      documentId: newDocument._id,
      lastAccessedAt: new Date(),
    })

    // 更新标签使用次数
    if (newDocument.tags && newDocument.tags.length) {
      await incrementTagUsage(newDocument.tags, author_id).catch((err) =>
        console.error('[createDocument] incrementTagUsage', err.message)
      )
    }

    const author = newDocument.author_id
    const uploader = author ? {
      id: author._id,
      username: author.username ?? null,
      email: author.email ?? null,
      avatarUrl: author.avatarUrl ?? null,
    } : null

    sendResponse(res, {
      message: '文档创建成功',
      data: {
        ...newDocument.toObject(),
        uploader,
        updated_at: newDocument.updated_at,
      },
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
  const isAdmin = req.user.role === 'admin'

  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))

  try {
    let documents
    let total

    // 排序规则（仅允许已知字段，避免非法 sort 导致异常）
    const allowedSortFields = ['created_at', 'updated_at', 'title']
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at'
    const sort = {}
    sort[sortField] = order === 'asc' ? 1 : -1

    if (['favorite', 'recent', 'archived'].includes(mode)) {
      // 通过 UserDocumentMeta 计算收藏 / 最近 / 已归档列表（所有用户都可使用）
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

      const start = (pageNum - 1) * limitNum
      const end = start + limitNum
      const pageMeta = allMeta.slice(start, end)
      const docIds = pageMeta.map((m) => m.documentId)

      documents = await Document.find({ _id: { $in: docIds } })
        .select('-content') // 列表查询不返回全文内容
        .populate('author_id', 'username email avatarUrl')
        .exec()
    } else {
      // 默认模式：普通用户只看自己的文档；管理员看全部，可用 uploader 按作者过滤
      const query = isAdmin ? {} : { author_id }
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
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('author_id', 'username email avatarUrl')
        .exec()
    }

    // 为每条文档增加 canEdit、uploader（上传人）、updated_at（最后更新时间）
    const userId = req.user && req.user.id ? String(req.user.id) : ''
    const buildUploader = (author) => {
      if (!author) return null
      const id = author._id != null ? author._id : author
      return {
        id: id,
        username: author.username ?? null,
        email: author.email ?? null,
        avatarUrl: author.avatarUrl ?? null,
      }
    }
    const documentsWithEdit = (Array.isArray(documents) ? documents : []).map((doc) => {
      const authorId = doc.author_id && (doc.author_id._id != null ? doc.author_id._id : doc.author_id)
      const canEdit = !!authorId && (String(authorId.toString()) === userId || isAdmin)
      const plain = doc && typeof doc.toObject === 'function' ? doc.toObject() : (doc && typeof doc === 'object' ? doc : {})
      return {
        ...plain,
        canEdit,
        uploader: buildUploader(doc.author_id),
        updated_at: plain.updated_at ?? plain.updatedAt ?? null,
      }
    })

    sendResponse(res, {
      message: '文档列表获取成功',
      data: {
        documents: documentsWithEdit,
        total,
        page: pageNum,
        limit: limitNum,
      },
    })
  } catch (err) {
    console.error('[getDocuments]', err.message, err.stack)
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
    const canEdit = isAuthor || isAdmin

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
        canEdit,
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

    const oldTags = document.tags ? [...document.tags] : []

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

    // 根据标签变化更新标签使用次数
    if (typeof tags !== 'undefined') {
      await syncTagUsageDiff(oldTags, document.tags, author_id).catch((err) =>
        console.error('[updateDocument] syncTagUsageDiff', err.message)
      )
    }
    await document.populate('author_id', 'username email avatarUrl')

    const author = document.author_id
    const uploader = author ? {
      id: author._id,
      username: author.username ?? null,
      email: author.email ?? null,
      avatarUrl: author.avatarUrl ?? null,
    } : null

    sendResponse(res, {
      message: '文档元数据更新成功',
      data: {
        ...document.toObject(),
        uploader,
        updated_at: document.updated_at,
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

// @route   PUT /api/documents/:id/visibility
// @desc    设置文档可见性及公开日期（作者可改自己的，管理员可改任意文档；管理员修改时通知原作者）
// @access  Private
exports.updateDocumentVisibility = async (req, res) => {
  const documentId = req.params.id
  const userId = req.user.id
  const isAdmin = req.user.role === 'admin'
  const { visibility, publicFrom, publicTo, publicBlocked } = req.body

  try {
    // 参数校验：可见性枚举
    if (typeof visibility !== 'undefined') {
      if (!['private', 'public'].includes(visibility)) {
        return sendResponse(res, {
          success: false,
          code: 40001,
          message: 'visibility 仅允许 private 或 public',
          status: 400,
        })
      }
    }
    // 日期校验：支持 ISO 字符串或时间戳，非法日期返回 400
    const parseDate = (val) => {
      if (val == null || val === '') return null
      const d = val instanceof Date ? val : new Date(val)
      return Number.isNaN(d.getTime()) ? undefined : d
    }
    if (publicFrom !== undefined) {
      const from = parseDate(publicFrom)
      if (publicFrom !== null && publicFrom !== '' && from === undefined) {
        return sendResponse(res, {
          success: false,
          code: 40001,
          message: 'publicFrom 日期格式无效，请使用 ISO 字符串或时间戳',
          status: 400,
        })
      }
    }
    if (publicTo !== undefined) {
      const to = parseDate(publicTo)
      if (publicTo !== null && publicTo !== '' && to === undefined) {
        return sendResponse(res, {
          success: false,
          code: 40001,
          message: 'publicTo 日期格式无效，请使用 ISO 字符串或时间戳',
          status: 400,
        })
      }
    }

    const document = await Document.findById(documentId)
    if (!document) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '文档不存在',
      })
    }

    const isAuthor = document.author_id.toString() === userId
    if (!isAuthor && !isAdmin) {
      return sendResponse(res, {
        success: false,
        code: 403,
        message: '无权修改此文档的可见性',
      })
    }

    let changed = false
    if (typeof visibility !== 'undefined') {
      document.visibility = visibility
      changed = true
    }
    if (typeof publicFrom !== 'undefined') {
      document.publicFrom = publicFrom == null || publicFrom === '' ? undefined : parseDate(publicFrom)
      changed = true
    }
    if (typeof publicTo !== 'undefined') {
      document.publicTo = publicTo == null || publicTo === '' ? undefined : parseDate(publicTo)
      changed = true
    }
    if (typeof publicBlocked !== 'undefined') {
      document.publicBlocked = !!publicBlocked
      changed = true
      if (document.publicBlocked) {
        document.publicBlockedAt = new Date()
        document.publicBlockedBy = userId
      } else {
        document.publicBlockedAt = undefined
        document.publicBlockedBy = undefined
      }
    }
    document.updated_at = new Date()
    await document.save()
    await document.populate('author_id', 'username email avatarUrl')

    // 管理员修改他人文档的可见性时，给原作者推送一条消息
    if (changed && isAdmin && !isAuthor) {
      await Notification.create({
        userId: document.author_id,
        type: 'visibility_changed',
        title: '文档可见性已由管理员修改',
        body: `管理员已修改文档《${document.title}》的可见性设置。`,
        relatedDocumentId: document._id,
        relatedUserId: userId,
      })
    }

    const author = document.author_id
    const uploader = author ? {
      id: author._id,
      username: author.username ?? null,
      email: author.email ?? null,
      avatarUrl: author.avatarUrl ?? null,
    } : null

    sendResponse(res, {
      message: '可见性更新成功',
      data: {
        ...document.toObject(),
        uploader,
        updated_at: document.updated_at,
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

    const docTags = document.tags || []
    const docAuthorId = document.author_id.toString()

    await Document.findByIdAndDelete(documentId)

    // 减少该文档所用标签的使用次数
    if (docTags.length) {
      await decrementTagUsage(docTags, docAuthorId).catch((err) =>
        console.error('[deleteDocument] decrementTagUsage', err.message)
      )
    }

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
// @desc    编辑保存文档：支持替换内容、修改标题/标签/分类/描述等（传入 content 则覆盖原有内容）
// @access  Private（仅作者或管理员）
exports.saveDocument = async (req, res) => {
  const { title, content, content_type, category, tags, description } = req.body
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

    const oldTags = doc.tags ? [...doc.tags] : []

    // 更新各字段（仅传入的才更新，未传入的保持原值）
    if (typeof title !== 'undefined') {
      doc.title = title
    }
    if (typeof content !== 'undefined') {
      // 传入 content 即视为"替换原有文件内容"
      doc.content = content
    }
    if (typeof content_type !== 'undefined') {
      doc.content_type = content_type
    }
    if (typeof category !== 'undefined') {
      doc.category = category
    }
    if (typeof tags !== 'undefined') {
      doc.tags = Array.isArray(tags) ? tags : [tags]
    }
    if (typeof description !== 'undefined') {
      doc.description = description
    }

    doc.updated_at = new Date()

    await doc.save()

    // 根据标签变化更新标签使用次数
    if (typeof tags !== 'undefined') {
      const authorId = doc.author_id.toString()
      await syncTagUsageDiff(oldTags, doc.tags, authorId).catch((err) =>
        console.error('[saveDocument] syncTagUsageDiff', err.message)
      )
    }
    await doc.populate('author_id', 'username email avatarUrl')

    const author = doc.author_id
    const uploader = author ? {
      id: author._id,
      username: author.username ?? null,
      email: author.email ?? null,
      avatarUrl: author.avatarUrl ?? null,
    } : null

    return sendResponse(res, {
      message: '文档保存成功',
      data: {
        ...doc.toObject(),
        uploader,
        updated_at: doc.updated_at,
      },
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
