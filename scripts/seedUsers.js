/**
 * 种子脚本：注册 10 个 user、10 个 viewer，数据正常全面
 * 运行：node scripts/seedUsers.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const config = require('../config/config')
const User = require('../models/User')

const SEED_PASSWORD = 'Seed123456'

const USER_LIST = [
  { username: 'ZhangMing', email: 'zhang.ming@example.com' },
  { username: 'LiHua', email: 'li.hua@example.com' },
  { username: 'WangFang', email: 'wang.fang@example.com' },
  { username: 'LiuYang', email: 'liu.yang@example.com' },
  { username: 'ChenJing', email: 'chen.jing@example.com' },
  { username: 'YangLei', email: 'yang.lei@example.com' },
  { username: 'ZhaoMin', email: 'zhao.min@example.com' },
  { username: 'HuangTao', email: 'huang.tao@example.com' },
  { username: 'ZhouJie', email: 'zhou.jie@example.com' },
  { username: 'WuNa', email: 'wu.na@example.com' },
]

const VIEWER_LIST = [
  { username: 'SunLi', email: 'sun.li@example.com' },
  { username: 'ZhuQiang', email: 'zhu.qiang@example.com' },
  { username: 'LinXue', email: 'lin.xue@example.com' },
  { username: 'HeYong', email: 'he.yong@example.com' },
  { username: 'GaoTing', email: 'gao.ting@example.com' },
  { username: 'XuBo', email: 'xu.bo@example.com' },
  { username: 'MaLin', email: 'ma.lin@example.com' },
  { username: 'LuoGang', email: 'luo.gang@example.com' },
  { username: 'LiangYan', email: 'liang.yan@example.com' },
  { username: 'SongWei', email: 'song.wei@example.com' },
]

async function seed() {
  if (!config.mongoUri) {
    console.error('缺少 MONGODB_URI，请配置 .env')
    process.exit(1)
  }

  try {
    await mongoose.connect(config.mongoUri)

    const created = { user: 0, viewer: 0 }
    const skipped = { user: 0, viewer: 0 }

    for (const { username, email } of USER_LIST) {
      const exists = await User.findOne({ $or: [{ email }, { username }] })
      if (exists) {
        skipped.user++
        console.log(`跳过 user（已存在）: ${username} / ${email}`)
        continue
      }
      await User.create({
        username,
        email,
        password: SEED_PASSWORD,
        role: 'user',
      })
      created.user++
      console.log(`创建 user: ${username} (${email})`)
    }

    for (const { username, email } of VIEWER_LIST) {
      const exists = await User.findOne({ $or: [{ email }, { username }] })
      if (exists) {
        skipped.viewer++
        console.log(`跳过 viewer（已存在）: ${username} / ${email}`)
        continue
      }
      await User.create({
        username,
        email,
        password: SEED_PASSWORD,
        role: 'viewer',
      })
      created.viewer++
      console.log(`创建 viewer: ${username} (${email})`)
    }

    console.log('---')
    console.log(`完成: user 新建 ${created.user} 个，跳过 ${skipped.user} 个；viewer 新建 ${created.viewer} 个，跳过 ${skipped.viewer} 个`)
    console.log(`种子用户统一密码: ${SEED_PASSWORD}`)
  } catch (err) {
    console.error(err)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

seed()
