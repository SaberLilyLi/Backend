const multer = require('multer')
const path = require('path')
const fs = require('fs')
const AppError = require('../utils/AppError')

const AVATAR_MAX_SIZE = 2 * 1024 * 1024 // 2MB
const AVATAR_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'avatars')

// 确保上传目录存在
if (!fs.existsSync(AVATAR_UPLOAD_DIR)) {
  fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AVATAR_UPLOAD_DIR)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png'
    const baseName = Date.now().toString(36)
    cb(null, `${baseName}-${Math.round(Math.random() * 1e9)}${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.mimetype)) {
    return cb(new AppError('仅支持上传 JPG/PNG/WebP 格式的头像', 40010))
  }
  cb(null, true)
}

const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: AVATAR_MAX_SIZE,
  },
  fileFilter,
})

module.exports = uploadAvatar

