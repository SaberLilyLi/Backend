require('dotenv').config()

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  apiPrefix: '/api',
  apiVersion: 'v1',
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  mongoUri: process.env.MONGODB_URI,
}

module.exports = config

