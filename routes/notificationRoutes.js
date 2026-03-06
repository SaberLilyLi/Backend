const express = require('express')
const router = express.Router()
const { getNotifications, markNotificationRead } = require('../controllers/notificationController')
const { protect } = require('../middleware/auth')

router.post('/query', protect, getNotifications)
router.get('/', protect, getNotifications)
router.post('/:id/read', protect, markNotificationRead)

module.exports = router
