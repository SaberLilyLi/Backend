const express = require('express')
const router = express.Router()
const { createCategory, getCategories, updateCategory, deleteCategory, autoArchive } = require('../controllers/categoryController')
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

// @route   POST /api/categories/query
// @desc    查询分类列表（推荐使用 POST）
// @access  Private
router.post('/query', protect, getCategories)

// @route   POST /api/categories/auto-archive
// @desc    自动归档30天内无改动且未收藏的文档
// @access  Private
router.post('/auto-archive', protect, autoArchive)

// @route   GET /api/categories
// @desc    查询分类列表（兼容旧接口）
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
