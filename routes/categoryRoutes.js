const express = require('express')
const router = express.Router()
const { createCategory, getCategories, updateCategory, deleteCategory } = require('../controllers/categoryController')
const { protect, requireRole } = require('../middleware/auth')

// @route   POST /api/categories
// @desc    Create a new category
// @access  Private
router.post(
  '/',
  protect,
  (req, res, next) => requireRole(['user', 'admin'])(req, res, next),
  createCategory,
)

// @route   GET /api/categories
// @desc    Get all categories
// @access  Private
router.get('/', protect, getCategories)

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private
router.put(
  '/:id',
  protect,
  (req, res, next) => requireRole(['user', 'admin'])(req, res, next),
  updateCategory,
)

// @route   DELETE /api/categories/:id
// @desc    Delete a category
// @access  Private
router.delete(
  '/:id',
  protect,
  (req, res, next) => requireRole(['user', 'admin'])(req, res, next),
  deleteCategory,
)

module.exports = router
