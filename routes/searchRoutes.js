const express = require('express')
const { check } = require('express-validator')
const router = express.Router()
const { semanticSearch } = require('../controllers/searchController')
const { protect } = require('../middleware/auth')

// @route   POST /api/search
// @desc    语义搜索 + 智能问答
// @access  Private
router.post(
  '/',
  protect,
  [
    check('query', 'query 为必填字段').isString().isLength({ min: 1 }),
    check('topK').optional().isInt({ min: 1, max: 20 }),
  ],
  (req, res, next) => semanticSearch(req, res, next),
)

module.exports = router

