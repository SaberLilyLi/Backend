const RoleRequest = require('../models/RoleRequest')
const User = require('../models/User')
const sendResponse = require('../utils/response')

// viewer 提交角色升级申请（例如 viewer -> user）
exports.createRoleRequest = async (req, res) => {
  const userId = req.user.id
  const { targetRole = 'user', reason } = req.body || {}

  try {
    const user = await User.findById(userId)
    if (!user) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '用户不存在',
        status: 404,
      })
    }

    if (user.role !== 'viewer') {
      return sendResponse(res, {
        success: false,
        code: 40010,
        message: '仅 viewer 角色需要提交权限申请',
        status: 400,
      })
    }

    if (targetRole !== 'user') {
      return sendResponse(res, {
        success: false,
        code: 40011,
        message: '当前仅支持申请升级为 user 角色',
        status: 400,
      })
    }

    // 若已存在待审批记录，避免重复提交
    const existingPending = await RoleRequest.findOne({
      userId,
      targetRole,
      status: 'pending',
    })
    if (existingPending) {
      return sendResponse(res, {
        success: false,
        code: 40012,
        message: '已存在待审批的权限申请，请等待管理员处理',
        status: 400,
      })
    }

    const request = await RoleRequest.create({
      userId,
      targetRole,
      reason,
    })

    return sendResponse(res, {
      message: '权限申请已提交',
      data: request,
      status: 201,
    })
  } catch (err) {
    console.error('[CREATE_ROLE_REQUEST_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
      status: 500,
    })
  }
}

// 管理员查看权限申请列表
exports.listRoleRequests = async (req, res) => {
  const { status } = req.query || {}

  const query = {}
  if (status) {
    query.status = status
  }

  try {
    const requests = await RoleRequest.find(query)
      .populate('userId', 'username email role')
      .populate('decidedBy', 'username email role')
      .sort({ createdAt: -1 })

    return sendResponse(res, {
      message: '权限申请列表获取成功',
      data: requests,
    })
  } catch (err) {
    console.error('[LIST_ROLE_REQUESTS_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
      status: 500,
    })
  }
}

async function handleDecision(req, res, nextStatus) {
  const { id } = req.params
  const { decisionComment } = req.body || {}
  const adminId = req.user.id

  try {
    const request = await RoleRequest.findById(id)
    if (!request) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '申请记录不存在',
        status: 404,
      })
    }

    if (request.status !== 'pending') {
      return sendResponse(res, {
        success: false,
        code: 40013,
        message: '该申请已处理，无需重复操作',
        status: 400,
      })
    }

    // 更新申请状态
    request.status = nextStatus
    request.decidedBy = adminId
    request.decidedAt = new Date()
    request.decisionComment = decisionComment

    // 若同意，则更新用户角色
    if (nextStatus === 'approved') {
      const user = await User.findById(request.userId)
      if (user) {
        user.role = request.targetRole
        await user.save()
      }
    }

    await request.save()

    return sendResponse(res, {
      message: nextStatus === 'approved' ? '申请已通过' : '申请已拒绝',
      data: request,
    })
  } catch (err) {
    console.error('[DECIDE_ROLE_REQUEST_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
      status: 500,
    })
  }
}

// 管理员同意申请
exports.approveRoleRequest = async (req, res) => {
  return handleDecision(req, res, 'approved')
}

// 管理员拒绝申请
exports.rejectRoleRequest = async (req, res) => {
  return handleDecision(req, res, 'rejected')
}

