const sendResponse = require('../utils/response')
const AppError = require('../utils/AppError')

// 统一错误处理中间件（企业级风格）
module.exports = (err, req, res, next) => {
  // 记录原始错误，生产环境可替换为专业日志系统
  console.error(err)

  // 标准化错误对象
  let statusCode = err.statusCode || 500
  let code = err.code || 50000
  let message = err.message || '服务器内部错误'

  // Mongoose 校验错误
  if (err.name === 'ValidationError') {
    statusCode = 400
    code = 40001
    message = '参数验证失败'
  }

  // Mongo 唯一索引冲突
  if (err.name === 'MongoServerError' && err.code === 11000) {
    statusCode = 400
    code = 40002
    const field = Object.keys(err.keyPattern || {})[0]
    message = `字段 ${field} 已存在`
  }

  // 自定义 AppError
  if (err instanceof AppError) {
    // AppError 已经带有业务 code，这里只尊重它的 code 和 message
    code = err.code
    message = err.message
    statusCode = statusCode || 400
  }

  return sendResponse(res, {
    success: false,
    code,
    message,
    status: statusCode,
  })
}
