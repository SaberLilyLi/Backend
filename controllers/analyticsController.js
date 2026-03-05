const Document = require('../models/Document')
const Note = require('../models/Note')
const sendResponse = require('../utils/response')
const SearchLog = require('../models/SearchLog')

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

// @route   GET /api/analytics/user-summary
// @desc    用户级统计：文档/笔记数量 + 最近 3/7/30 天文档变更与搜索次数
// @access  Private
exports.getUserSummary = async (req, res) => {
  const userId = req.user.id
  const now = new Date()

  const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

  try {
    const [docCount, noteCount, changes3, changes7, changes30, search3, search7, search30] =
      await Promise.all([
        Document.countDocuments({ author_id: userId }),
        Note.countDocuments({ author_id: userId }),
        Document.countDocuments({
          author_id: userId,
          updated_at: { $gte: daysAgo(3) },
        }),
        Document.countDocuments({
          author_id: userId,
          updated_at: { $gte: daysAgo(7) },
        }),
        Document.countDocuments({
          author_id: userId,
          updated_at: { $gte: daysAgo(30) },
        }),
        SearchLog.countDocuments({
          userId,
          createdAt: { $gte: daysAgo(3) },
        }),
        SearchLog.countDocuments({
          userId,
          createdAt: { $gte: daysAgo(7) },
        }),
        SearchLog.countDocuments({
          userId,
          createdAt: { $gte: daysAgo(30) },
        }),
      ])

    return sendResponse(res, {
      message: '用户统计获取成功',
      data: {
        counts: {
          documents: docCount,
          notes: noteCount,
        },
        documentChanges: {
          last3Days: changes3,
          last7Days: changes7,
          last30Days: changes30,
        },
        searches: {
          last3Days: search3,
          last7Days: search7,
          last30Days: search30,
        },
      },
    })
  } catch (err) {
    console.error('[ANALYTICS_USER_SUMMARY_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}


