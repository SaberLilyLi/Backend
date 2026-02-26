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

// @route   GET /api/tags
// @desc    Get all tags
// @access  Private
exports.getTags = async (req, res) => {
  const owner_id = req.user.id
  console.log('Fetching tags for user:', req.user) // Debug log

  try {
    const tags = await Tag.find({ owner_id })
    sendResponse(res, { tags })
  } catch (err) {
    console.error(err.message)
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
  const { name, color } = req.body
  const tagId = req.params.id
  const owner_id = req.user.id

  try {
    let tag = await Tag.findById(tagId)

    if (!tag) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '标签不存在',
      })
    }

    // Check if tag belongs to current user
    if (tag.owner_id.toString() !== owner_id) {
      return sendResponse(res, {
        success: false,
        code: 403,
        message: '无权更新此标签',
      })
    }

    // Update tag
    tag.name = name
    tag.color = color
    tag.updated_at = new Date()

    await tag.save()
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

  try {
    const tag = await Tag.findById(tagId)

    if (!tag) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '标签不存在',
      })
    }

    // Check if tag belongs to current user
    if (tag.owner_id.toString() !== owner_id) {
      return sendResponse(res, {
        success: false,
        code: 403,
        message: '无权删除此标签',
      })
    }

    await Tag.findByIdAndDelete(tagId)

    sendResponse(res, {
      message: '标签已删除',
      status: 204,
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
