const { randomUUID } = require('crypto')

module.exports = (req, res, next) => {
  const start = Date.now()

  res.success = (data = null, message = 'success', code = 0) => {
    res.json({
      success: true,
      code,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        traceId: req.traceId,
        duration: `${Date.now() - start}ms`,
      },
    })
  }

  res.fail = (message = 'error', code = 50000) => {
    res.status(200).json({
      success: false,
      code,
      message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        traceId: req.traceId,
        duration: `${Date.now() - start}ms`,
      },
    })
  }

  next()
}
