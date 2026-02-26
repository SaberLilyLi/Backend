// src/config/db.js
const mongoose = require('mongoose')
const dotenv = require('dotenv')

dotenv.config()

const connectDB = async () => {
  try {
    // ✅ 移除所有连接选项（Mongoose 5.12.14 默认启用）
    await mongoose.connect(process.env.MONGODB_URI)

    console.log(`MongoDB Connected: ${mongoose.connection.host}`)
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`)
    process.exit(1)
  }
}

module.exports = connectDB
