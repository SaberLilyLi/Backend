// 认证中间件（企业级风格）
const jwt = require('jsonwebtoken')
const config = require('../config/config')
const sendResponse = require('../utils/response')

// Protect route
exports.protect = (req, res, next) => {
  let token

  const authHeader = req.headers.authorization || ''

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  }

  if (!token) {
    return sendResponse(res, {
      success: false,
      code: 40100,
      message: '未授权，缺少访问令牌',
      status: 401,
    })
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret)
    // 在后续处理中统一使用 req.user 访问当前用户信息
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
    }
    return next()
  } catch (err) {
    console.error('[AUTH_TOKEN_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 40101,
      message: '未授权，访问令牌无效或已过期',
      status: 401,
    })
  }
}

// 仅管理员可访问的路由守卫
exports.adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return sendResponse(res, {
      success: false,
      code: 40301,
      message: '无权限执行此操作，需要管理员身份',
      status: 403,
    })
  }
  return next()
}
