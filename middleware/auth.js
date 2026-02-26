// 认证中间件
const jwt = require('jsonwebtoken')

// Protect route
exports.protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return res.status(401).json({ message: '未授权，无token' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    console.error(err)
    return res.status(401).json({ message: '未授权，token无效' })
  }
}
