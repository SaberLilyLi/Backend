// 文档控制器

const Document = require('../models/Document')
const { validationResult } = require('express-validator')

// @route   POST /api/documents
// @desc    Create a new document
// @access  Private
exports.createDocument = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { title, content, content_type, category, tags } = req.body
  const author_id = req.user.id

  try {
    const document = new Document({
      title,
      content,
      content_type,
      category,
      tags,
      author_id,
    })

    const newDocument = await document.save()

    res.status(201).json(newDocument)
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
}

// @route   GET /api/documents
// @desc    Get all documents
// @access  Private
exports.getDocuments = async (req, res) => {
  const { category, tags, limit = 20, page = 1 } = req.query
  const author_id = req.user.id

  try {
    // Build query
    let query = { author_id }

    if (category) {
      query.category = category
    }

    if (tags) {
      query.tags = { $in: tags.split(',') }
    }

    // Get total count
    const total = await Document.countDocuments(query)

    // Get documents
    const documents = await Document.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    res.json({
      documents,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    })
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
}

// @route   GET /api/documents/:id
// @desc    Get a document by ID
// @access  Private
exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)

    if (!document) {
      return res.status(404).json({ message: '文档不存在' })
    }

    // Check if document belongs to current user
    if (document.author_id.toString() !== req.user.id) {
      return res.status(403).json({ message: '无权访问此文档' })
    }

    res.json(document)
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
}

// @route   PUT /api/documents/:id
// @desc    Update a document
// @access  Private
exports.updateDocument = async (req, res) => {
  const { title, content, category } = req.body
  const documentId = req.params.id
  const author_id = req.user.id

  try {
    let document = await Document.findById(documentId)

    if (!document) {
      return res.status(404).json({ message: '文档不存在' })
    }

    // Check if document belongs to current user
    if (document.author_id.toString() !== author_id) {
      return res.status(403).json({ message: '无权更新此文档' })
    }

    // Update document
    document.title = title
    document.content = content
    document.category = category
    document.updated_at = new Date()

    await document.save()

    res.json(document)
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
}

// @route   DELETE /api/documents/:id
// @desc    Delete a document
// @access  Private
exports.deleteDocument = async (req, res) => {
  const documentId = req.params.id
  const author_id = req.user.id

  try {
    const document = await Document.findById(documentId)

    if (!document) {
      return res.status(404).json({ message: '文档不存在' })
    }

    // Check if document belongs to current user
    if (document.author_id.toString() !== author_id) {
      return res.status(403).json({ message: '无权删除此文档' })
    }

    await Document.findByIdAndDelete(documentId)

    res.status(204).json({ message: '文档已删除' })
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
}
