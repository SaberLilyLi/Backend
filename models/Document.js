const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    // 文本内容（例如 Markdown），用于渲染与导出
    content: {
      type: String,
      required: true,
    },
    // 文件描述 / 备注，仅用于展示与说明
    description: {
      type: String,
    },
    content_type: {
      type: String,
      default: 'markdown',
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
    author_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // 文档可见性：private 仅作者 & 管理员可见；public 根据时间窗口向所有人公开
    visibility: {
      type: String,
      enum: ['private', 'public'],
      default: 'private',
    },
    publicFrom: {
      type: Date,
    },
    publicTo: {
      type: Date,
    },
    publicBlocked: {
      type: Boolean,
      default: false,
    },
    publicBlockedAt: {
      type: Date,
    },
    publicBlockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

module.exports = mongoose.model('Document', documentSchema)
