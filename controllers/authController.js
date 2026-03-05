// 认证控制器（企业级标准版）

const User = require('../models/User')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')
const { randomUUID } = require('crypto')
const sendResponse = require('../utils/response')
const config = require('../config/config')

// ========================= 注册 =========================
exports.register = async (req, res) => {
  const traceId = randomUUID()
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return sendResponse(res, {
      success: false,
      code: 40001,
      message: '参数校验失败',
      data: errors.array(),
      traceId,
    })
  }

  const { email, username, password } = req.body

  try {
    // 检查是否存在
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    })

    if (existingUser) {
      return sendResponse(res, {
        success: false,
        code: 40004,
        message: '用户已存在',
        traceId,
      })
    }

    // 创建用户（密码自动在 model 里加密）
    const user = new User({
      email,
      username,
      password,
    })

    await user.save()

    // 生成 JWT
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn,
      },
    )

    return sendResponse(res, {
      message: '注册成功',
      data: {
        _id: user._id,
        email: user.email,
        username: user.username,
        token,
      },
      status: 201,
      traceId,
    })
  } catch (err) {
    console.error(`[REGISTER ERROR]`, err)

    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
      traceId,
    })
  }
}

// ========================= 登录 =========================
exports.login = async (req, res) => {
  const traceId = randomUUID()
  const { email, password } = req.body

  try {
    const user = await User.findOne({ email })

    if (!user) {
      return sendResponse(res, {
        success: false,
        code: 40002,
        message: '用户不存在',
        traceId,
      })
    }

    const isMatch = await user.matchPassword(password)

    if (!isMatch) {
      return sendResponse(res, {
        success: false,
        code: 40003,
        message: '密码错误',
        traceId,
      })
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn,
      },
    )

    return sendResponse(res, {
      message: '登录成功',
      data: {
        _id: user._id,
        email: user.email,
        username: user.username,
        token,
      },
      traceId,
    })
  } catch (err) {
    console.error(`[LOGIN ERROR]`, err)

    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
      traceId,
    })
  }
}

// ========================= 登出 =========================
exports.logout = (req, res) => {
  const traceId = randomUUID()

  return sendResponse(res, {
    message: '登出成功',
    traceId,
  })
}
