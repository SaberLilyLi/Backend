// 笔记本路由
const express = require('express')
const router = express.Router()
const {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
} = require('../controllers/noteController')
const { protect } = require('../middleware/auth')

// @route   POST /api/notes
// @desc    Create a new note
// @access  Private
router.post('/', protect, createNote)

// @route   GET /api/notes
// @desc    Get all notes
// @access  Private
router.get('/', protect, getNotes)

// @route   PUT /api/notes/:id
// @desc    Update a note
// @access  Private
router.put('/:id', protect, updateNote)

// @route   DELETE /api/notes/:id
// @desc    Delete a note
// @access  Private
router.delete('/:id', protect, deleteNote)

module.exports = router
