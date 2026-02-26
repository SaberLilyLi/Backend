// 分类控制器
const Category = require('../models/Category')
const { validationResult } = require('express-validator')
const sendResponse = require('../utils/response')

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

// @route   GET /api/categories
// @desc    Get all categories
// @access  Private
exports.getCategories = async (req, res) => {
  const owner_id = req.user.id

  try {
    const categories = await Category.find({ owner_id })
    sendResponse(res, {
      message: '分类获取成功',
      data: categories,
      status: 200,
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

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private
exports.updateCategory = async (req, res) => {
  const { name, description } = req.body
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

    // Check if category belongs to current user
    if (category.owner_id.toString() !== owner_id) {
      return sendResponse(res, {
        success: false,
        code: 403,
        message: '无权更新此分类',
      })
    }

    // Update category
    category.name = name
    category.description = description
    category.updated_at = new Date()

    await category.save()

    sendResponse(res, {
      message: '分类更新成功',
      data: category,
      status: 200,
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

    // Check if category belongs to current user
    if (category.owner_id.toString() !== owner_id) {
      return sendResponse(res, {
        success: false,
        code: 403,
        message: '无权删除此分类',
      })
    }

    await Category.findByIdAndDelete(categoryId)

    sendResponse(res, {
      message: '分类已删除',
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
