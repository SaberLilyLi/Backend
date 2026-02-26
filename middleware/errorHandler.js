// 错误处理中间件
// Error handler middleware
module.exports = (err, req, res, next) => {
  console.error(err.stack)

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: '验证错误', errors: err.errors })
  }

  // Handle duplicate key error (e.g., unique constraint)
  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0]
    return res.status(400).json({ message: `字段 ${field} 已存在` })
  }

  // Handle 404 errors
  if (err.status === 404) {
    return res.status(404).json({ message: err.message })
  }

  // Default error response
  res.status(500).json({ message: '服务器内部错误' })
}
