const mongoose = require('mongoose')

// 用于存储文档向量索引（RAG 检索层）
const indexSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    // 向量可以根据实际模型维度调整，这里用 Number 数组占位
    vector: {
      type: [Number],
      required: true,
    },
    metadata: {
      title: String,
      tags: [String],
      category: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
)

module.exports = mongoose.model('Index', indexSchema)

