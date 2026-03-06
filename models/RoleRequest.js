const mongoose = require('mongoose')

const roleRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // 目标角色，目前主要用于 viewer -> user 升级
    targetRole: {
      type: String,
      enum: ['user'],
      required: true,
    },
    reason: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    decidedAt: {
      type: Date,
    },
    decisionComment: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model('RoleRequest', roleRequestSchema)

