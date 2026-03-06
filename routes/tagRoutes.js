const express = require('express')
const router = express.Router()
const { createTag, getTags, updateTag, deleteTag } = require('../controllers/tagController')
const { protect, requireRole } = require('../middleware/auth')

// @route   POST /api/tags
// @desc    Create a new tag
// @access  Private
router.post(
  '/',
  protect,
  (req, res, next) => requireRole(['user', 'admin'])(req, res, next),
  createTag,
)

// @route   POST /api/tags/query
// @desc    查询标签列表（推荐使用 POST）
// @access  Private
router.post('/query', protect, getTags)

// @route   GET /api/tags
// @desc    查询标签列表（兼容旧接口）
// @access  Private
router.get('/', protect, getTags)

// @route   PUT /api/tags/:id
// @desc    Update a tag
// @access  Private
router.put(
  '/:id',
  protect,
  (req, res, next) => requireRole(['user', 'admin'])(req, res, next),
  updateTag,
)

// @route   DELETE /api/tags/:id
// @desc    Delete a tag
// @access  Private
router.delete(
  '/:id',
  protect,
  (req, res, next) => requireRole(['user', 'admin'])(req, res, next),
  deleteTag,
)

module.exports = router
