// 分类控制器
const Category = require('../models/Category')
const UserDocumentMeta = require('../models/UserDocumentMeta')
const Document = require('../models/Document')
const { validationResult } = require('express-validator')
const sendResponse = require('../utils/response')

// 系统默认文件夹（虚拟分类，基于文档状态动态计算）
const SYSTEM_FOLDERS = [
  { _id: 'favorite', name: '收藏', icon: '⭐', color: '#f59e0b', is_system: true, sort_order: -3 },
  { _id: 'recent', name: '最近', icon: '🕐', color: '#3b82f6', is_system: true, sort_order: -2 },
  { _id: 'archived', name: '已归档', icon: '📦', color: '#6b7280', is_system: true, sort_order: -1 },
]

// @route   POST /api/categories
// @desc    Create a new category
// @access  Private
exports.createCategory = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return sendResponse(res, {
      success: false,
      code: 40001,
      message: '参数校验失败',
      data: errors.array(),
    })
  }

  const { name, slug, description, icon, color } = req.body
  const owner_id = req.user.id

  try {
    let category = await Category.findOne({ $or: [{ name }, { slug }] })

    if (category) {
      return sendResponse(res, {
        success: false,
        code: 40004,
        message: '分类已存在',
      })
    }

    category = new Category({ name, slug, description, icon, color, owner_id })
    await category.save()

    sendResponse(res, {
      message: '分类创建成功',
      data: category,
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

// @route   POST /api/categories/query
// @route   GET /api/categories (兼容旧接口)
// @desc    查询分类列表（返回系统默认文件夹 + 用户自定义分类）
// @access  Private
exports.getCategories = async (req, res) => {
  const owner_id = req.user.id
  const source = req.method === 'POST' ? req.body : req.query
  const { keyword, limit = 50, page = 1, includeCount = true } = source

  try {
    // 1. 计算系统文件夹的文档数量
    const [favoriteCount, recentCount, archivedCount] = await Promise.all([
      UserDocumentMeta.countDocuments({ userId: owner_id, isFavorite: true }),
      UserDocumentMeta.countDocuments({ userId: owner_id, lastAccessedAt: { $ne: null } }),
      UserDocumentMeta.countDocuments({ userId: owner_id, isArchived: true }),
    ])

    const systemFolders = SYSTEM_FOLDERS.map((folder) => {
      let count = 0
      if (folder._id === 'favorite') count = favoriteCount
      else if (folder._id === 'recent') count = recentCount
      else if (folder._id === 'archived') count = archivedCount
      return { ...folder, count }
    })

    // 2. 查询用户自定义分类（私有 + 全局）
    let query = {
      $or: [{ owner_id }, { is_global: true }],
    }

    if (keyword) {
      query.name = { $regex: keyword, $options: 'i' }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50))

    const total = await Category.countDocuments(query)
    let categories = await Category.find(query)
      .sort({ sort_order: 1, created_at: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean()

    // 3. 为每个自定义分类计算文档数量
    if (includeCount) {
      const categoryIds = categories.map((c) => c._id.toString())
      const docCounts = await Document.aggregate([
        { $match: { author_id: owner_id, category: { $in: categoryIds.map((id) => id) } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ])
      const countMap = {}
      docCounts.forEach((item) => {
        countMap[item._id] = item.count
      })
      categories = categories.map((c) => ({
        ...c,
        count: countMap[c._id.toString()] || 0,
      }))
    }

    sendResponse(res, {
      message: '分类列表获取成功',
      data: {
        systemFolders,
        categories,
        total,
        page: pageNum,
        limit: limitNum,
      },
    })
  } catch (err) {
    console.error('[getCategories]', err.message, err.stack)
    sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private
exports.updateCategory = async (req, res) => {
  const { name, description, icon, color, sort_order } = req.body
  const categoryId = req.params.id
  const owner_id = req.user.id

  try {
    let category = await Category.findById(categoryId)

    if (!category) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '分类不存在',
      })
    }

    // 文件夹私有：只有创建者可以更新自己的分类
    const isOwner = category.owner_id.toString() === owner_id
    if (!isOwner) {
      return sendResponse(res, {
        success: false,
        code: 403,
        message: '无权更新此分类',
      })
    }

    // Update category
    if (typeof name !== 'undefined') category.name = name
    if (typeof description !== 'undefined') category.description = description
    if (typeof icon !== 'undefined') category.icon = icon
    if (typeof color !== 'undefined') category.color = color
    if (typeof sort_order !== 'undefined') category.sort_order = sort_order
    category.updated_at = new Date()

    await category.save()

    sendResponse(res, {
      message: '分类更新成功',
      data: category,
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

// @route   DELETE /api/categories/:id
// @desc    Delete a category
// @access  Private
exports.deleteCategory = async (req, res) => {
  const categoryId = req.params.id
  const owner_id = req.user.id

  try {
    const category = await Category.findById(categoryId)

    if (!category) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '分类不存在',
      })
    }

    // 文件夹私有：只有创建者可以删除自己的分类
    const isOwner = category.owner_id.toString() === owner_id
    if (!isOwner) {
      return sendResponse(res, {
        success: false,
        code: 403,
        message: '无权删除此分类',
      })
    }

    await Category.findByIdAndDelete(categoryId)

    sendResponse(res, {
      message: '分类已删除',
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

// @route   POST /api/categories/auto-archive
// @desc    自动归档：将30天内无改动且未收藏的文档标记为已归档
// @access  Private
exports.autoArchive = async (req, res) => {
  const userId = req.user.id

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 找出当前用户30天内无改动的文档
    const staleDocuments = await Document.find({
      author_id: userId,
      updated_at: { $lt: thirtyDaysAgo },
    }).select('_id')

    const staleDocIds = staleDocuments.map((d) => d._id)

    if (staleDocIds.length === 0) {
      return sendResponse(res, {
        message: '没有需要归档的文档',
        data: { archivedCount: 0 },
      })
    }

    // 批量更新：将这些文档标记为已归档（但不影响收藏状态）
    const result = await UserDocumentMeta.updateMany(
      {
        userId,
        documentId: { $in: staleDocIds },
        isFavorite: { $ne: true }, // 收藏的文档不自动归档
        isArchived: { $ne: true }, // 已归档的不重复处理
      },
      {
        $set: { isArchived: true, updatedAt: new Date() },
      }
    )

    sendResponse(res, {
      message: '自动归档完成',
      data: {
        checkedCount: staleDocIds.length,
        archivedCount: result.modifiedCount,
      },
    })
  } catch (err) {
    console.error('[autoArchive]', err.message, err.stack)
    sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}
