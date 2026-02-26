const express = require('express')
const router = express.Router()
const {
  createTag,
  getTags,
  updateTag,
  deleteTag,
} = require('../controllers/tagController')
const { protect } = require('../middleware/auth')

// @route   POST /api/tags
// @desc    Create a new tag
// @access  Private
router.post('/', protect, createTag)

// @route   GET /api/tags
// @desc    Get all tags
// @access  Private
router.get('/', protect, getTags)

// @route   PUT /api/tags/:id
// @desc    Update a tag
// @access  Private
router.put('/:id', protect, updateTag)

// @route   DELETE /api/tags/:id
// @desc    Delete a tag
// @access  Private
router.delete('/:id', protect, deleteTag)

module.exports = router
