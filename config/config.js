require('dotenv').config()

// 根据不同环境配置 API 前缀 / 版本 / 阶段标识：
// - 本地或测试环境：API_STAGE 可设置为 q / n / o2 等
//   例如：API_STAGE=q  => /api/q/v1/auth/login
// - 生产环境：API_STAGE 为空或不配置 => /api/v1/auth/login
const env = process.env.NODE_ENV || 'development'
const apiStage = process.env.API_STAGE || ''

const config = {
  env,
  port: Number(process.env.PORT) || 5000,
  apiPrefix: '/api',
  apiVersion: 'v1',
  apiStage, // q / n / o2 / '' 等
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  mongoUri: process.env.MONGODB_URI,
}

module.exports = config

