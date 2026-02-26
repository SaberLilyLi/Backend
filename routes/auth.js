// routes/auth.js
const express = require('express')
const router = express.Router()
const { login, register, logout } = require('../controllers/auth')
const { protect } = require('../middleware/auth')

// 公开路由
router.post('/login', login)
router.post('/register', register)

// 保护路由
router.post('/logout', protect, logout)

module.exports = router
