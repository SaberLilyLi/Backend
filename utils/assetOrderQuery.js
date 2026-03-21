const LIKE_FIELDS = [
  'order_no',
  'external_no',
  'project_code',
  'applicant_name',
  'applicant_phone',
  'approver_name',
  'department',
  'supplier_name',
  'contract_no',
  'serial_no',
  'asset_tag',
  'model_no',
  'batch_no',
]

const MULTI_FIELDS = [
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
]

const ALLOWED_SORT_FIELDS = ['created_at', 'updated_at', 'closed_at', 'order_no', 'status', 'priority']

function normalizeArrayInput(v) {
  if (typeof v === 'undefined' || v === null) return []
  const arr = Array.isArray(v) ? v : [v]
  return arr.map((x) => String(x).trim()).filter(Boolean)
}

function buildLikeConditions(query, likeFields = LIKE_FIELDS) {
  const mongo = {}
  const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : ''
  if (keyword) {
    mongo.$or = likeFields.map((f) => ({ [f]: { $regex: keyword, $options: 'i' } }))
  }
  likeFields.forEach((f) => {
    const value = typeof query[f] === 'string' ? query[f].trim() : ''
    if (value) mongo[f] = { $regex: value, $options: 'i' }
  })
  return mongo
}

function buildInConditions(query, inFields = MULTI_FIELDS) {
  const mongo = {}
  inFields.forEach((f) => {
    const values = normalizeArrayInput(query[f])
    if (values.length) mongo[f] = { $in: values }
  })
  return mongo
}

function toDate(v) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function buildRangeConditions(query) {
  const mongo = {}

  const bookingRange = normalizeArrayInput(query.booking_date_range)
  if (bookingRange.length === 2) {
    const from = toDate(bookingRange[0])
    const to = toDate(bookingRange[1])
    if (from && to) {
      mongo.booking_start_date = { $gte: from }
      mongo.booking_end_date = { $lte: to }
    }
  }

  ;['created_at', 'updated_at'].forEach((f) => {
    const range = normalizeArrayInput(query[`${f}_range`])
    if (range.length === 2) {
      const from = toDate(range[0])
      const to = toDate(range[1])
      if (from && to) mongo[f] = { $gte: from, $lte: to }
    }
  })

  return mongo
}

function buildPageParams(page, size) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const sizeNum = Math.min(200, Math.max(1, parseInt(size, 10) || 20))
  return { pageNum, sizeNum }
}

function buildSort(sortBy, order) {
  const field = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at'
  const direction = String(order || 'desc').toLowerCase() === 'asc' ? 1 : -1
  return { [field]: direction }
}

module.exports = {
  LIKE_FIELDS,
  MULTI_FIELDS,
  normalizeArrayInput,
  buildLikeConditions,
  buildInConditions,
  buildRangeConditions,
  buildPageParams,
  buildSort,
}

