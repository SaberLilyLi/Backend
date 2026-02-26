// 标签控制器
const Tag = require('../models/Tag')
const { validationResult } = require('express-validator')

// @route   POST /api/tags
// @desc    Create a new tag
// @access  Private
exports.createTag = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { name, color } = req.body
  const owner_id = req.user.id

  try {
    // Check if tag already exists
    let tag = await Tag.findOne({ name, owner_id })

    if (tag) {
      return res.status(400).json({ message: '标签已存在' })
    }

    tag = new Tag({
      name,
      color,
      owner_id,
    })

    await tag.save()

    res.status(201).json(tag)
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
}

// @route   GET /api/tags
// @desc    Get all tags
// @access  Private
exports.getTags = async (req, res) => {
  const owner_id = req.user.id

  try {
    const tags = await Tag.find({ owner_id })
    res.json({ tags })
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
}

// @route   PUT /api/tags/:id
// @desc    Update a tag
// @access  Private
exports.updateTag = async (req, res) => {
  const { name, color } = req.body
  const tagId = req.params.id
  const owner_id = req.user.id

  try {
    let tag = await Tag.findById(tagId)

    if (!tag) {
      return res.status(404).json({ message: '标签不存在' })
    }

    // Check if tag belongs to current user
    if (tag.owner_id.toString() !== owner_id) {
      return res.status(403).json({ message: '无权更新此标签' })
    }

    // Update tag
    tag.name = name
    tag.color = color
    tag.updated_at = new Date()

    await tag.save()

    res.json(tag)
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
}

// @route   DELETE /api/tags/:id
// @desc    Delete a tag
// @access  Private
exports.deleteTag = async (req, res) => {
  const tagId = req.params.id
  const owner_id = req.user.id

  try {
    const tag = await Tag.findById(tagId)

    if (!tag) {
      return res.status(404).json({ message: '标签不存在' })
    }

    // Check if tag belongs to current user
    if (tag.owner_id.toString() !== owner_id) {
      return res.status(403).json({ message: '无权删除此标签' })
    }

    await Tag.findByIdAndDelete(tagId)

    res.status(204).json({ message: '标签已删除' })
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
}
