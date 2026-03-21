const AssetOrder = require('../models/AssetOrder')
const AssetOrderDict = require('../models/AssetOrderDict')
const sendResponse = require('../utils/response')
const {
  buildLikeConditions,
  buildInConditions,
  buildRangeConditions,
  buildPageParams,
  buildSort,
} = require('../utils/assetOrderQuery')

const OPTION_FIELDS = new Set([
  'status',
  'priority',
  'order_type',
  'payment_status',
  'risk_level',
  'city',
  'line_of_business',
  'category',
  'channel',
  'owner_name',
])

const WRITABLE_FIELDS = [
  'order_no',
  'external_no',
  'order_type',
  'status',
  'priority',
  'project_code',
  'applicant_name',
  'applicant_phone',
  'approver_name',
  'department',
  'supplier_name',
  'warehouse_code',
  'contract_no',
  'serial_no',
  'asset_tag',
  'model_no',
  'batch_no',
  'payment_status',
  'risk_level',
  'city',
  'line_of_business',
  'category',
  'channel',
  'owner_name',
  'amount',
  'currency',
  'expect_arrival_time',
  'booking_start_date',
  'booking_end_date',
  'delivery_date',
  'accept_datetime',
  'closed_at',
  'service_window',
  'maintenance_time_select',
  'date_pane_value',
]

function pickWritableFields(body = {}) {
  const data = {}
  WRITABLE_FIELDS.forEach((field) => {
    if (typeof body[field] !== 'undefined') data[field] = body[field]
  })
  return data
}

// POST /api/asset-orders/page
exports.pageAssetOrders = async (req, res) => {
  const body = req.body || {}
  const page = body.page || 1
  const size = body.size || 20
  // 兼容两种入参：
  // 1) { page, size, query: {...} }
  // 2) { page, size, order_no, status, ... }（平铺）
  const query =
    body.query && typeof body.query === 'object' && !Array.isArray(body.query) ? body.query : body
  try {
    const { pageNum, sizeNum } = buildPageParams(page, size)
    const sort = buildSort(query.sortBy, query.order)

    const filter = {
      deleted_at: null,
      ...buildLikeConditions(query),
      ...buildInConditions(query),
      ...buildRangeConditions(query),
    }

    const total = await AssetOrder.countDocuments(filter)
    const records = await AssetOrder.find(filter)
      .sort(sort)
      .skip((pageNum - 1) * sizeNum)
      .limit(sizeNum)
      .lean()

    return sendResponse(res, {
      message: '工单分页查询成功',
      data: {
        records,
        total,
        page: pageNum,
        size: sizeNum,
      },
    })
  } catch (err) {
    console.error('[pageAssetOrders]', err.message, err.stack)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// GET /api/asset-orders/options/:field?keyword=xxx
exports.getAssetOrderOptions = async (req, res) => {
  const { field } = req.params
  const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : ''

  if (!OPTION_FIELDS.has(field)) {
    return sendResponse(res, {
      success: false,
      code: 40001,
      message: 'field 不支持',
    })
  }

  try {
    // 1) 优先读字典
    const dictQuery = { dict_type: field, enabled: true }
    if (keyword) {
      dictQuery.$or = [
        { dict_value: { $regex: keyword, $options: 'i' } },
        { dict_label: { $regex: keyword, $options: 'i' } },
      ]
    }

    const dictRows = await AssetOrderDict.find(dictQuery)
      .sort({ sort_no: 1, updated_at: -1 })
      .limit(100)
      .lean()

    if (dictRows.length > 0) {
      return sendResponse(res, {
        message: '选项获取成功',
        data: {
          options: dictRows.map((x) => ({ label: x.dict_label, value: x.dict_value })),
        },
      })
    }

    // 2) 回退主表 DISTINCT
    const mainQuery = { deleted_at: null, [field]: { $nin: [null, ''] } }
    if (keyword) mainQuery[field] = { $regex: keyword, $options: 'i' }

    const values = await AssetOrder.distinct(field, mainQuery)
    const options = values
      .filter((v) => v !== null && String(v).trim() !== '')
      .slice(0, 100)
      .map((v) => ({ label: String(v), value: String(v) }))

    return sendResponse(res, {
      message: '选项获取成功',
      data: { options },
    })
  } catch (err) {
    console.error('[getAssetOrderOptions]', err.message, err.stack)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// GET /api/asset-orders/:id
exports.getAssetOrderDetail = async (req, res) => {
  const { id } = req.params
  try {
    const record = await AssetOrder.findOne({ _id: id, deleted_at: null }).lean()
    if (!record) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '工单不存在',
        status: 404,
      })
    }
    return sendResponse(res, {
      message: '工单详情获取成功',
      data: record,
    })
  } catch (err) {
    console.error('[getAssetOrderDetail]', err.message, err.stack)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// POST /api/asset-orders
exports.createAssetOrder = async (req, res) => {
  try {
    const payload = pickWritableFields(req.body)
    if (!payload.order_no || !payload.order_type || !payload.status) {
      return sendResponse(res, {
        success: false,
        code: 40001,
        message: 'order_no、order_type、status 为必填',
      })
    }

    const exists = await AssetOrder.findOne({ order_no: payload.order_no, deleted_at: null }).lean()
    if (exists) {
      return sendResponse(res, {
        success: false,
        code: 40004,
        message: '工单号已存在',
      })
    }

    const created = await AssetOrder.create(payload)
    return sendResponse(res, {
      message: '工单创建成功',
      data: created,
      status: 201,
    })
  } catch (err) {
    console.error('[createAssetOrder]', err.message, err.stack)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// PUT /api/asset-orders/:id
exports.updateAssetOrder = async (req, res) => {
  const { id } = req.params
  try {
    const payload = pickWritableFields(req.body)
    if (Object.keys(payload).length === 0) {
      return sendResponse(res, {
        success: false,
        code: 40001,
        message: '缺少可更新字段',
      })
    }

    if (payload.order_no) {
      const duplicate = await AssetOrder.findOne({
        _id: { $ne: id },
        order_no: payload.order_no,
        deleted_at: null,
      }).lean()
      if (duplicate) {
        return sendResponse(res, {
          success: false,
          code: 40004,
          message: '工单号已存在',
        })
      }
    }

    const updated = await AssetOrder.findOneAndUpdate(
      { _id: id, deleted_at: null },
      { $set: payload },
      { new: true }
    ).lean()

    if (!updated) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '工单不存在',
        status: 404,
      })
    }

    return sendResponse(res, {
      message: '工单更新成功',
      data: updated,
    })
  } catch (err) {
    console.error('[updateAssetOrder]', err.message, err.stack)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

// DELETE /api/asset-orders/:id
exports.deleteAssetOrder = async (req, res) => {
  const { id } = req.params
  try {
    const deleted = await AssetOrder.findOneAndUpdate(
      { _id: id, deleted_at: null },
      { $set: { deleted_at: new Date() } },
      { new: true }
    ).lean()

    if (!deleted) {
      return sendResponse(res, {
        success: false,
        code: 404,
        message: '工单不存在',
        status: 404,
      })
    }

    return sendResponse(res, {
      message: '工单删除成功',
      data: { id: deleted._id },
    })
  } catch (err) {
    console.error('[deleteAssetOrder]', err.message, err.stack)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

