const express = require('express')
const router = express.Router()
const { queryUsers } = require('../controllers/adminController')
const { protect, adminOnly } = require('../middleware/auth')
const asyncHandler = require('../middleware/asyncHandler')

// POST /api/admin/users/query - 管理员查询 user/viewer 列表（支持权限、用户名、邮箱）
router.post(
  '/users/query',
  protect,
  adminOnly,
  asyncHandler(queryUsers),
)

module.exports = router
