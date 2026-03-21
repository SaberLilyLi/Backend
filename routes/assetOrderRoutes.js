const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const {
  pageAssetOrders,
  getAssetOrderOptions,
  getAssetOrderDetail,
  createAssetOrder,
  updateAssetOrder,
  deleteAssetOrder,
} = require('../controllers/assetOrderController')

// @route   POST /api/asset-orders/page
// @desc    资产工单分页查询
// @access  Private
router.post('/page', protect, pageAssetOrders)

// @route   POST /api/asset-orders
// @desc    创建资产工单
// @access  Private
router.post('/', protect, createAssetOrder)

// @route   GET /api/asset-orders/options/:field
// @desc    资产工单筛选项查询
// @access  Private
router.get('/options/:field', protect, getAssetOrderOptions)

// @route   GET /api/asset-orders/:id
// @desc    获取资产工单详情
// @access  Private
router.get('/:id', protect, getAssetOrderDetail)

// @route   PUT /api/asset-orders/:id
// @desc    更新资产工单
// @access  Private
router.put('/:id', protect, updateAssetOrder)

// @route   DELETE /api/asset-orders/:id
// @desc    删除资产工单（软删）
// @access  Private
router.delete('/:id', protect, deleteAssetOrder)

module.exports = router

