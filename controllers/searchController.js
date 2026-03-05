const { validationResult } = require('express-validator')
const sendResponse = require('../utils/response')
const { semanticSearch } = require('../services/aiService')

// @route   POST /api/search
// @desc    语义搜索 + 智能问答（占位 RAG 实现） 
// @access  Private
exports.semanticSearch = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return sendResponse(res, {
      success: false,
      code: 40001,
      message: '参数校验失败',
      data: errors.array(),
    })
  }

  const { query, topK = 5 } = req.body
  const userId = req.user.id

  try {
    const { results, answer } = await semanticSearch({
      userId,
      query,
      topK: Math.min(Number(topK) || 5, 20),
    })

    return sendResponse(res, {
      message: '语义搜索成功',
      data: {
        query,
        answer,
        results,
      },
    })
  } catch (err) {
    console.error('[SEMANTIC_SEARCH_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

