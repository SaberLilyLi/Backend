const express = require('express')
const router = express.Router()
const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController')
const { protect } = require('../middleware/auth')

// @route   POST /api/categories
// @desc    Create a new category
// @access  Private
router.post('/', protect, createCategory)

// @route   GET /api/categories
// @desc    Get all categories
// @access  Private
router.get('/', protect, getCategories)

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private
router.put('/:id', protect, updateCategory)

// @route   DELETE /api/categories/:id
// @desc    Delete a category
// @access  Private
router.delete('/:id', protect, deleteCategory)

module.exports = router
