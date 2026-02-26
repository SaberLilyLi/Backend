const { randomUUID } = require('crypto')

/**
 * 统一响应函数
 * @param {Object} res - express response
 * @param {Object} opts - 选项
 * @param {boolean} [opts.success=true]
 * @param {number} [opts.code=0]
 * @param {string} [opts.message='success']
 * @param {any} [opts.data=null]
 * @param {number} [opts.status=200]
 * @param {string} [opts.traceId]
 */
function sendResponse(res, opts = {}) {
  const {
    success = true,
    code = 0,
    message = 'success',
    data = null,
    status = 200,
    traceId,
  } = opts

  const tid = traceId || randomUUID()
  const timestamp = new Date().toISOString()

  return res.status(status).json({
    success,
    code,
    message,
    data,
    meta: {
      timestamp,
      traceId: tid,
    },
  })
}

module.exports = sendResponse
