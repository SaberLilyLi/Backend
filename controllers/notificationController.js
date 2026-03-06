const Notification = require('../models/Notification')
const sendResponse = require('../utils/response')

// @route   POST /api/notifications/query
// @route   GET /api/notifications
// @desc    获取当前用户的消息列表（支持分页、仅未读）
// @access  Private
exports.getNotifications = async (req, res) => {
  const source = req.method === 'POST' ? req.body : req.query
  const { limit = 20, page = 1, unreadOnly } = source
  const userId = req.user.id

  try {
    const query = { userId }
    if (unreadOnly === true || unreadOnly === 'true') {
      query.read = false
    }

    const total = await Notification.countDocuments(query)
    const list = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('relatedDocumentId', 'title')
      .populate('relatedUserId', 'username')
      .lean()

    sendResponse(res, {
      message: '消息列表获取成功',
      data: {
        list,
        total,
        page: Number(page),
        limit: Number(limit),
      },
    })
  } catch (err) {
    console.error(err.message)
    sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// @route   POST /api/notifications/:id/read
// @desc    将一条消息标记为已读
// @access  Private
exports.markNotificationRead = async (req, res) => {
  const notificationId = req.params.id
  const userId = req.user.id

  try {
    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    })
    if (!notification) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '消息不存在或无权操作',
      })
    }
    notification.read = true
    await notification.save()
    sendResponse(res, {
      message: '已标记为已读',
      data: notification,
    })
  } catch (err) {
    console.error(err.message)
    sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}
