// src/config/db.js
const mongoose = require('mongoose')
const dotenv = require('dotenv')

dotenv.config()

const connectDB = async () => {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MongoDB connection error: MONGODB_URI 未配置，请在 .env 中设置')
    process.exit(1)
  }

  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }

  try {
    await mongoose.connect(uri, options)
    console.log(`MongoDB Connected: ${mongoose.connection.host}`)
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`)
    if (error.message.includes('ECONNREFUSED')) {
      console.error('提示：请确认 MongoDB 已启动。若使用 localhost 连接失败，可在 .env 中改为 127.0.0.1，例如：MONGODB_URI=mongodb://127.0.0.1:27017/你的数据库名')
    }
    process.exit(1)
  }
}

module.exports = connectDB
