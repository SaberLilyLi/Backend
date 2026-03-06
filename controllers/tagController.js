// 标签控制器
const Tag = require('../models/Tag')
const { validationResult } = require('express-validator')
const sendResponse = require('../utils/response')

// @route   POST /api/tags
// @desc    Create a new tag
// @access  Private
exports.createTag = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return sendResponse(res, {
      success: false,
      code: 40001,
      message: '参数校验失败',
      data: errors.array(),
    })
  }

  const { name, color } = req.body
  const owner_id = req.user.id

  try {
    let tag = await Tag.findOne({ name, owner_id })

    if (tag) {
      return sendResponse(res, {
        success: false,
        code: 40004,
        message: '标签已存在',
      })
    }

    tag = new Tag({ name, color, owner_id })
    await tag.save()

    sendResponse(res, {
      message: '标签创建成功',
      data: tag,
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

// @route   POST /api/tags/query
// @route   GET /api/tags (兼容旧接口)
// @desc    查询标签列表（管理员看全部，普通用户看自己的 + 全局标签）
// @access  Private
exports.getTags = async (req, res) => {
  const owner_id = req.user.id
  const isAdmin = req.user.role === 'admin'
  const source = req.method === 'POST' ? req.body : req.query
  const { keyword, limit = 50, page = 1 } = source

  try {
    let query = {}

    if (isAdmin) {
      // 管理员看全部标签
    } else {
      // 普通用户：自己的标签 + 全局标签
      query = {
        $or: [{ owner_id }, { is_global: true }],
      }
    }

    // 关键词搜索
    if (keyword) {
      query.name = { $regex: keyword, $options: 'i' }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50))

    const total = await Tag.countDocuments(query)
    const tags = await Tag.find(query)
      .sort({ usage_count: -1, created_at: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('owner_id', 'username email')
      .lean()

    sendResponse(res, {
      message: '标签列表获取成功',
      data: {
        tags,
        total,
        page: pageNum,
        limit: limitNum,
      },
    })
  } catch (err) {
    console.error('[getTags]', err.message, err.stack)
    sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// @route   PUT /api/tags/:id
// @desc    Update a tag
// @access  Private
exports.updateTag = async (req, res) => {
  const { name, color, is_global } = req.body
  const tagId = req.params.id
  const owner_id = req.user.id
  const isAdmin = req.user.role === 'admin'

  try {
    let tag = await Tag.findById(tagId)

    if (!tag) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '标签不存在',
      })
    }

    // 权限检查：作者或管理员可更新
    const isOwner = tag.owner_id.toString() === owner_id
    if (!isOwner && !isAdmin) {
      return sendResponse(res, {
        success: false,
        code: 403,
        message: '无权更新此标签',
      })
    }

    // Update tag
    if (typeof name !== 'undefined') tag.name = name
    if (typeof color !== 'undefined') tag.color = color
    if (typeof is_global !== 'undefined' && isAdmin) tag.is_global = is_global
    tag.updated_at = new Date()

    await tag.save()

    sendResponse(res, {
      message: '标签更新成功',
      data: tag,
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

// @route   DELETE /api/tags/:id
// @desc    Delete a tag
// @access  Private
exports.deleteTag = async (req, res) => {
  const tagId = req.params.id
  const owner_id = req.user.id
  const isAdmin = req.user.role === 'admin'

  try {
    const tag = await Tag.findById(tagId)

    if (!tag) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '标签不存在',
      })
    }

    // 权限检查：作者或管理员可删除
    const isOwner = tag.owner_id.toString() === owner_id
    if (!isOwner && !isAdmin) {
      return sendResponse(res, {
        success: false,
        code: 403,
        message: '无权删除此标签',
      })
    }

    await Tag.findByIdAndDelete(tagId)

    sendResponse(res, {
      message: '标签已删除',
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
