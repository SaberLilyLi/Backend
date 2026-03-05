const express = require('express')
const router = express.Router()
const { getKnowledgeGraph } = require('../controllers/graphController')
const { protect } = require('../middleware/auth')

// @route   GET /api/graph
// @desc    获取知识图谱数据（适用于前端 ECharts / AntV G6 可视化）
// @access  Private
router.get('/', protect, (req, res, next) => getKnowledgeGraph(req, res, next))

module.exports = router

