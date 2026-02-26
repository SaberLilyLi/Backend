// 文档路由
const express = require('express')
const router = express.Router()
const {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
} = require('../controllers/documentController')
const { protect } = require('../middleware/auth')

// @route   POST /api/documents
// @desc    Create a new document
// @access  Private
router.post('/', protect, createDocument)

// @route   GET /api/documents
// @desc    Get all documents
// @access  Private
router.get('/', protect, getDocuments)

// @route   GET /api/documents/:id
// @desc    Get a document by ID
// @access  Private
router.get('/:id', protect, getDocument)

// @route   PUT /api/documents/:id
// @desc    Update a document
// @access  Private
router.put('/:id', protect, updateDocument)

// @route   DELETE /api/documents/:id
// @desc    Delete a document
// @access  Private
router.delete('/:id', protect, deleteDocument)

module.exports = router
