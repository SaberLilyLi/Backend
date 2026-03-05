const express = require('express')
const router = express.Router()
const { getOverview, getTrends } = require('../controllers/analyticsController')
const { protect } = require('../middleware/auth')

// @route   GET /api/analytics/overview
// @desc    知识库概览统计
// @access  Private
router.get('/overview', protect, (req, res, next) => getOverview(req, res, next))

// @route   GET /api/analytics/trends
// @desc    使用趋势统计
// @access  Private
router.get('/trends', protect, (req, res, next) => getTrends(req, res, next))

module.exports = router

