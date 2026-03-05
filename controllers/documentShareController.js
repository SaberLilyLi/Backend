const { validationResult } = require('express-validator')
const sendResponse = require('../utils/response')
const Document = require('../models/Document')
const DocumentShare = require('../models/DocumentShare')

const MAX_SHARE_DAYS = 30

// @route   POST /api/documents/:id/share-with-users
// @desc    将文档在指定时间内对指定用户公开（最多 30 天）
// @access  Private（仅作者或管理员）
exports.shareWithUsers = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return sendResponse(res, {
      success: false,
      code: 40001,
      message: '参数校验失败',
      data: errors.array(),
    })
  }

  const documentId = req.params.id
  const ownerId = req.user.id
  const { targetUserIds, days } = req.body

  if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
    return sendResponse(res, {
      success: false,
      code: 40001,
      message: 'targetUserIds 不能为空',
    })
  }

  const shareDays = Math.min(Number(days) || MAX_SHARE_DAYS, MAX_SHARE_DAYS)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + shareDays * 24 * 60 * 60 * 1000)

  try {
    const document = await Document.findById(documentId)
    if (!document) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '文档不存在',
      })
    }

    const isAuthor = document.author_id.toString() === ownerId
    const isAdmin = req.user.role === 'admin'
    if (!isAuthor && !isAdmin) {
      return sendResponse(res, {
        success: false,
        code: 403,
        message: '仅作者或管理员可以共享此文档',
      })
    }

    const bulkOps = targetUserIds.map((uid) => ({
      updateOne: {
        filter: {
          documentId,
          ownerId,
          targetUserId: uid,
        },
        update: {
          $set: {
            expiresAt,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    }))

    await DocumentShare.bulkWrite(bulkOps)

    return sendResponse(res, {
      message: '文档共享设置成功',
      data: {
        documentId,
        ownerId,
        targetUserIds,
        expiresAt,
        days: shareDays,
      },
    })
  } catch (err) {
    console.error('[SHARE_WITH_USERS_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

