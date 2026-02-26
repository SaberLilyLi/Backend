const mongoose = require('mongoose')

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      // 新版MongoDB驱动不需要这些选项
    })

    console.log(`MongoDB Connected: ${mongoose.connection.host}`)
  } catch (err) {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  }
}

module.exports = connectDB
