const Document = require('../models/Document')
const Note = require('../models/Note')
const sendResponse = require('../utils/response')

// @route   GET /api/analytics/overview
// @desc    知识库概览统计（文档数量、笔记数量等）
// @access  Private
exports.getOverview = async (req, res) => {
  const userId = req.user.id

  try {
    const [docCount, noteCount] = await Promise.all([
      Document.countDocuments({ author_id: userId }),
      Note.countDocuments({ author_id: userId }),
    ])

    return sendResponse(res, {
      message: '统计获取成功',
      data: {
        documents: docCount,
        notes: noteCount,
      },
    })
  } catch (err) {
    console.error('[ANALYTICS_OVERVIEW_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// @route   GET /api/analytics/trends
// @desc    使用趋势（按日期统计创建文档和笔记数量）
// @access  Private
exports.getTrends = async (req, res) => {
  const userId = req.user.id

  try {
    const docs = await Document.find({ author_id: userId }).select(
      'created_at',
    )
    const notes = await Note.find({ author_id: userId }).select('created_at')

    const bucket = {}

    const addToBucket = (date) => {
      const key = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      )
        .toISOString()
        .slice(0, 10)
      if (!bucket[key]) {
        bucket[key] = { documents: 0, notes: 0 }
      }
      return key
    }

    docs.forEach((d) => {
      const key = addToBucket(d.created_at)
      bucket[key].documents += 1
    })

    notes.forEach((n) => {
      const key = addToBucket(n.created_at)
      bucket[key].notes += 1
    })

    const series = Object.keys(bucket)
      .sort()
      .map((date) => ({
        date,
        documents: bucket[date].documents,
        notes: bucket[date].notes,
      }))

    return sendResponse(res, {
      message: '趋势统计获取成功',
      data: series,
    })
  } catch (err) {
    console.error('[ANALYTICS_TRENDS_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

