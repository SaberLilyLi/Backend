// 管理员专用：查询 user / viewer 用户列表
const User = require('../models/User')
const sendResponse = require('../utils/response')

/**
 * POST /api/admin/users/query
 * 查询所有 user 和 viewer（支持按权限、用户名、邮箱过滤，分页）
 * @access 仅 admin
 */
exports.queryUsers = async (req, res) => {
  const {
    role,
    username,
    email,
    keyword,
    page = 1,
    limit = 20,
  } = req.body || {}

  try {
    const query = {}

    // 权限：精确匹配，支持单个或数组
    if (role !== undefined && role !== '') {
      if (Array.isArray(role)) {
        query.role = { $in: role }
      } else {
        query.role = role
      }
    }

    // 用户名：模糊
    if (username !== undefined && username !== '') {
      query.username = { $regex: username, $options: 'i' }
    }

    // 邮箱：模糊
    if (email !== undefined && email !== '') {
      query.email = { $regex: email, $options: 'i' }
    }

    // 关键字：同时模糊匹配用户名和邮箱
    if (keyword !== undefined && keyword !== '') {
      const regex = { $regex: keyword, $options: 'i' }
      query.$or = [
        { username: regex },
        { email: regex },
      ]
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, Math.min(100, parseInt(limit, 10)))
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)))

    const [list, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ])

    return sendResponse(res, {
      message: '查询成功',
      data: {
        users: list,
        total,
        page: Math.max(1, parseInt(page, 10)),
        limit: limitNum,
      },
    })
  } catch (err) {
    console.error('[ADMIN_QUERY_USERS_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
      status: 500,
    })
  }
}
