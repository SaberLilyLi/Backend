const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const config = require('./config/config')
const connectDB = require('./config/db')
const errorHandler = require('./middleware/errorHandler')

// 创建 Express 应用
const app = express()

// 连接数据库（应用启动时只执行一次）
connectDB()

// 基础中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// 日志中间件（生产环境可替换为更完善的日志系统）
if (config.env !== 'test') {
  app.use(morgan('dev'))
}

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', env: config.env })
})

// 统一 API 前缀与版本，例如 /api/v1/...
const apiBasePath = `${config.apiPrefix}/${config.apiVersion}`
const apiRouter = require('./routes')
app.use(apiBasePath, apiRouter)

// 全局错误处理
app.use(errorHandler)

module.exports = app

