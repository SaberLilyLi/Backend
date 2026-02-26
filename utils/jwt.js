// JWT 相关工具函数
const jwt = require('jsonwebtoken')

// Generate JWT
exports.generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN },
  )
}
