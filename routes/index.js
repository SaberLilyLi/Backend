const express = require('express')

const router = express.Router()

// 模块路由按领域分组，便于后续扩展版本控制和权限控制
router.use('/auth', require('./authRoutes'))
router.use('/documents', require('./documentRoutes'))
router.use('/notes', require('./noteRoutes'))
router.use('/tags', require('./tagRoutes'))
router.use('/categories', require('./categoryRoutes'))
router.use('/search', require('./searchRoutes'))
router.use('/analytics', require('./analyticsRoutes'))
router.use('/graph', require('./graphRoutes'))
router.use('/admin', require('./adminRoutes'))
router.use('/notifications', require('./notificationRoutes'))

module.exports = router

