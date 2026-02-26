module.exports = (err, req, res, next) => {
  console.error(`[${req.traceId}]`, err)

  res.status(200).json({
    success: false,
    code: err.code || 50000,
    message: err.message || '服务器错误',
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
      traceId: req.traceId,
    },
  })
}
