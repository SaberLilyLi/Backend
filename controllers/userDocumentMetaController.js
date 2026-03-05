const UserDocumentMeta = require('../models/UserDocumentMeta')
const sendResponse = require('../utils/response')

// @route   POST /api/documents/:id/favorite
// @desc    设置/取消收藏
// @access  Private
exports.setFavorite = async (req, res) => {
  const userId = req.user.id
  const documentId = req.params.id
  const { favorite } = req.body

  try {
    const meta = await UserDocumentMeta.findOneAndUpdate(
      { userId, documentId },
      {
        $set: {
          isFavorite: Boolean(favorite),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true },
    )

    return sendResponse(res, {
      message: favorite ? '已加入收藏' : '已取消收藏',
      data: meta,
    })
  } catch (err) {
    console.error('[SET_FAVORITE_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// @route   POST /api/documents/:id/archive
// @desc    设置/取消归档
// @access  Private
exports.setArchived = async (req, res) => {
  const userId = req.user.id
  const documentId = req.params.id
  const { archived } = req.body

  try {
    const meta = await UserDocumentMeta.findOneAndUpdate(
      { userId, documentId },
      {
        $set: {
          isArchived: Boolean(archived),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true },
    )

    return sendResponse(res, {
      message: archived ? '已归档' : '已取消归档',
      data: meta,
    })
  } catch (err) {
    console.error('[SET_ARCHIVED_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

