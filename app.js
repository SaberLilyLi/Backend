const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const config = require('./config/config')
const connectDB = require('./config/db')
const errorHandler = require('./middleware/errorHandler')
const path = require('path')

// 创建 Express 应用
const app = express()

// 连接数据库（应用启动时只执行一次）
connectDB()

// 基础中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// 静态资源（头像等），对外暴露只读访问
app.use('/static', express.static(path.join(__dirname, 'uploads')))

// 日志中间件（生产环境可替换为更完善的日志系统）
if (config.env !== 'test') {
  app.use(morgan('dev'))
}

// 统一 API 前缀 + 阶段标识 + 版本的兼容策略：
// - 当前版本为 v1：支持 /api(/stage)/v1/... 和 /api(/stage)/...
// - 当前版本为 v2：支持 /api(/stage)/v2/... 和 /api(/stage)/...
// - 未来若有 v3，同理，只为“当前版本”开放带版本和不带版本两种入口
function buildApiBasePaths() {
  const stageSegment = config.apiStage ? `/${config.apiStage}` : ''
  const baseWithoutVersion = `${config.apiPrefix}${stageSegment}` // /api[/q]
  const baseWithVersion = `${baseWithoutVersion}/${config.apiVersion}` // /api[/q]/v1 或 /v2
  return {
    versioned: baseWithVersion,
    unversioned: baseWithoutVersion,
  }
}

const { versioned, unversioned } = buildApiBasePaths()
const apiRouter = require('./routes')

// 带版本前缀（推荐生产使用，如 /api/v1）
app.use(versioned, apiRouter)
// 不带版本前缀（用于联调 / 测试，始终指向“当前版本”）
app.use(unversioned, apiRouter)

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    env: config.env,
    apiStage: config.apiStage || null,
    apiVersion: config.apiVersion,
    apiBaseVersioned: versioned,
    apiBaseUnversioned: unversioned,
  })
})

// 全局错误处理
app.use(errorHandler)

module.exports = app

