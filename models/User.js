// src/models/User.js
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 4,
    maxlength: 20,
    validate: {
      validator: (v) => /^[a-zA-Z0-9_]+$/.test(v),
      message: '用户名只能包含字母、数字和下划线',
    },
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: '请输入有效的邮箱地址',
    },
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  avatarUrl: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// ✅ 关键修复：确保密码哈希处理正确
userSchema.pre('save', function (next) {
  if (!this.isModified('password')) {
    return next()
  }

  bcrypt.genSalt(10, (err, salt) => {
    if (err) return next(err)

    bcrypt.hash(this.password, salt, (err, hash) => {
      if (err) return next(err)

      this.password = hash
      next()
    })
  })
})

// ✅ 关键修复：确保 matchPassword 使用同步方法
userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password)
}

const User = mongoose.model('User', userSchema)
module.exports = User
