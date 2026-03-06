const mongoose = require('mongoose')
const config = require('../config/config')
const User = require('../models/User')

async function main() {
  try {
    if (!config.mongoUri) {
      console.error('MONGODB_URI 未配置')
      process.exit(1)
    }

    await mongoose.connect(config.mongoUri)
    const res = await User.updateMany({}, { $set: { role: 'admin' } })
    console.log(
      'matched',
      res.matchedCount ?? res.n,
      'modified',
      res.modifiedCount ?? res.nModified,
    )
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

main()

