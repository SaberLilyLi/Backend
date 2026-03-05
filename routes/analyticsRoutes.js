const express = require('express')
const router = express.Router()
const {
  getOverview,
  getTrends,
  getUserSummary,
} = require('../controllers/analyticsController')
const { protect } = require('../middleware/auth')

// @route   GET /api/analytics/overview
// @desc    知识库概览统计
// @access  Private
router.get('/overview', protect, (req, res, next) => getOverview(req, res, next))

// @route   GET /api/analytics/trends
// @desc    使用趋势统计
// @access  Private
router.get('/trends', protect, (req, res, next) => getTrends(req, res, next))

// @route   GET /api/analytics/user-summary
// @desc    用户级统计（文档/笔记数量 + 最近 3/7/30 天文档变更与搜索次数）
// @access  Private
router.get('/user-summary', protect, (req, res, next) =>
  getUserSummary(req, res, next),
)

module.exports = router

