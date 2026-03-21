// 笔记本控制器

const Note = require('../models/Note')
const { validationResult } = require('express-validator')
const sendResponse = require('../utils/response')
const { incrementTagUsage, decrementTagUsage } = require('../utils/tagUsage')

// @route   POST /api/notes
// @desc    Create a new note
// @access  Private
exports.createNote = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return sendResponse(res, {
      success: false,
      code: 40001,
      message: '参数校验失败',
      data: errors.array(),
    })
  }

  const { title, content, content_type, category, tags, priority } = req.body
  const author_id = req.user.id

  try {
    const note = new Note({
      title,
      content,
      content_type,
      category,
      tags,
      priority,
      author_id,
    })

    const newNote = await note.save()

    // 更新标签使用次数
    if (newNote.tags && newNote.tags.length) {
      await incrementTagUsage(newNote.tags, author_id).catch((err) =>
        console.error('[createNote] incrementTagUsage', err.message)
      )
    }

    sendResponse(res, {
      message: '笔记创建成功',
      data: newNote,
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

// @route   GET /api/notes
// @desc    Get all notes（管理员可见全部，普通用户仅自己的）
// @access  Private
exports.getNotes = async (req, res) => {
  const { category, tags, priority, limit = 20, page = 1, uploader } = req.query
  const author_id = req.user.id
  const isAdmin = req.user.role === 'admin'

  try {
    // Build query：管理员看全部，可用 uploader 按作者过滤；普通用户仅自己
    let query = isAdmin ? {} : { author_id }
    if (uploader) {
      query.author_id = uploader
    }

    if (category) {
      query.category = category
    }

    if (tags) {
      query.tags = { $in: tags.split(',') }
    }

    if (priority) {
      query.priority = priority
    }

    // Get total count
    const total = await Note.countDocuments(query)

    // Get notes
    const notes = await Note.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    sendResponse(res, {
      notes,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
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

// @route   PUT /api/notes/:id
// @desc    Update a note
// @access  Private
exports.updateNote = async (req, res) => {
  const { title, content, priority } = req.body
  const noteId = req.params.id
  const author_id = req.user.id

  try {
    let note = await Note.findById(noteId)

    if (!note) {
      return res.status(404).json({ message: '笔记不存在' })
    }

    // Check if note belongs to current user
    if (note.author_id.toString() !== author_id) {
      return res.status(403).json({ message: '无权更新此笔记' })
    }

    // Update note
    note.title = title
    note.content = content
    note.priority = priority
    note.updated_at = new Date()

    await note.save()

    sendResponse(res, {
      message: '笔记更新成功',
      data: note,
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

// @route   DELETE /api/notes/:id
// @desc    Delete a note
// @access  Private
exports.deleteNote = async (req, res) => {
  const noteId = req.params.id
  const author_id = req.user.id

  try {
    const note = await Note.findById(noteId)

    if (!note) {
      return res.status(404).json({ message: '笔记不存在' })
    }

    // Check if note belongs to current user
    if (note.author_id.toString() !== author_id) {
      return res.status(403).json({ message: '无权删除此笔记' })
    }

    const noteTags = note.tags || []
    const noteAuthorId = note.author_id.toString()

    await Note.findByIdAndDelete(noteId)

    // 减少该笔记所用标签的使用次数
    if (noteTags.length) {
      await decrementTagUsage(noteTags, noteAuthorId).catch((err) =>
        console.error('[deleteNote] decrementTagUsage', err.message)
      )
    }

    sendResponse(res, {
      message: '笔记已删除',
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
