const config = require('./config/config')
const app = require('./app')

const PORT = config.port

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${config.env} mode`)
})
