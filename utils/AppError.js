class AppError extends Error {
  constructor(message, code = 50000) {
    super(message)
    this.code = code
  }
}

module.exports = AppError
