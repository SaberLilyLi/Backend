// 认证路由

const express = require('express')
const router = express.Router()
const {
  register,
  login,
  logout,
  updateProfile,
} = require('../controllers/authController')
const {
  createRoleRequest,
  listRoleRequests,
  approveRoleRequest,
  rejectRoleRequest,
} = require('../controllers/roleRequestController')
const { check } = require('express-validator')
const asyncHandler = require('../middleware/asyncHandler')
const { protect, adminOnly, requireRole } = require('../middleware/auth')
const uploadAvatar = require('../middleware/uploadAvatar')

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post(
  '/register',
  uploadAvatar.single('avatar'),
  [
    check('email', '请输入有效邮箱').isEmail(),
    check('username', '用户名必须至少3个字符').isLength({ min: 3 }),
    check('password', '密码必须至少6个字符').isLength({ min: 6 }),
  ],
  asyncHandler(register),
)

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    check('email', '请输入有效邮箱').isEmail(),
    check('password', '密码必须至少6个字符').isLength({ min: 6 }),
  ],
  asyncHandler(login),
)

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', asyncHandler(logout))

// @route   PUT /api/auth/profile
// @desc    Update profile (password & avatar)
// @access  Private
router.put(
  '/profile',
  protect,
  uploadAvatar.single('avatar'),
  [
    check('newPassword')
      .optional()
      .isLength({ min: 6 })
      .withMessage('新密码至少需要 6 个字符'),
  ],
  asyncHandler(updateProfile),
)

// @route   POST /api/auth/role-requests
// @desc    viewer 提交权限申请（例如申请升级为 user）
// @access  Private (viewer)
router.post(
  '/role-requests',
  protect,
  // 限制 viewer 才能调用
  (req, res, next) => requireRole(['viewer'])(req, res, next),
  asyncHandler(createRoleRequest),
)

// @route   GET /api/auth/role-requests
// @desc    管理员查看权限申请列表
// @access  Private (admin)
router.get(
  '/role-requests',
  protect,
  adminOnly,
  asyncHandler(listRoleRequests),
)

// @route   POST /api/auth/role-requests/:id/approve
// @desc    管理员同意权限申请
// @access  Private (admin)
router.post(
  '/role-requests/:id/approve',
  protect,
  adminOnly,
  asyncHandler(approveRoleRequest),
)

// @route   POST /api/auth/role-requests/:id/reject
// @desc    管理员拒绝权限申请
// @access  Private (admin)
router.post(
  '/role-requests/:id/reject',
  protect,
  adminOnly,
  asyncHandler(rejectRoleRequest),
)

module.exports = router
