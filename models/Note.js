const mongoose = require('mongoose')

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    content_type: {
      type: String,
      default: 'rich_text',
    },
    category: {
      type: String,
      default: '未分类',
    },
    tags: [
      {
        type: String,
      },
    ],
    priority: {
      type: String,
      default: 'medium',
      enum: ['low', 'medium', 'high'],
    },
    author_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
)

module.exports = mongoose.model('Note', noteSchema)
