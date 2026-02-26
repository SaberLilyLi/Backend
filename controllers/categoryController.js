// 分类控制器
const Category = require('../models/Category')
const { validationResult } = require('express-validator')

// @route   POST /api/categories
// @desc    Create a new category
// @access  Private
exports.createCategory = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { name, slug, description, icon, color } = req.body
  const owner_id = req.user.id

  try {
    // Check if category already exists
    let category = await Category.findOne({ $or: [{ name }, { slug }] })

    if (category) {
      return res.status(400).json({ message: '分类已存在' })
    }

    category = new Category({
      name,
      slug,
      description,
      icon,
      color,
      owner_id,
    })

    await category.save()

    res.status(201).json(category)
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
}

// @route   GET /api/categories
// @desc    Get all categories
// @access  Private
exports.getCategories = async (req, res) => {
  const owner_id = req.user.id

  try {
    const categories = await Category.find({ owner_id })
    res.json({ categories })
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
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
      return res.status(404).json({ message: '分类不存在' })
    }

    // Check if category belongs to current user
    if (category.owner_id.toString() !== owner_id) {
      return res.status(403).json({ message: '无权更新此分类' })
    }

    // Update category
    category.name = name
    category.description = description
    category.updated_at = new Date()

    await category.save()

    res.json(category)
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
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
      return res.status(404).json({ message: '分类不存在' })
    }

    // Check if category belongs to current user
    if (category.owner_id.toString() !== owner_id) {
      return res.status(403).json({ message: '无权删除此分类' })
    }

    await Category.findByIdAndDelete(categoryId)

    res.status(204).json({ message: '分类已删除' })
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
}
