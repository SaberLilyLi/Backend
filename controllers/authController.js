// 认证控制器

const User = require('../models/User')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
exports.register = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { email, username, password } = req.body

  try {
    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { username }] })

    if (user) {
      return res.status(400).json({ message: '用户已存在' })
    }

    // Create new user
    user = new User({
      email,
      username,
      password,
    })

    await user.save()

    // Create JWT
    const payload = {
      id: user._id,
      email: user.email,
      username: user.username,
    }

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
      (err, token) => {
        if (err) throw err
        res.status(201).json({
          _id: user._id,
          email: user.email,
          username: user.username,
          token,
        })
      },
    )
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
}

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body

  try {
    // Check if user exists
    let user = await User.findOne({ email })
    console.log(user, 666)

    if (!user) {
      return res.status(400).json({ message: '无效的邮箱或密码' })
    }
    console.log(password, 777)
    // Check password
    const isMatch = await user.matchPassword(password)
    console.log(isMatch, 888)
    if (!isMatch) {
      return res.status(400).json({ message: '无效的邮箱或密码' })
    }

    // Create JWT
    const payload = {
      id: user._id,
      email: user.email,
      username: user.username,
    }

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
      (err, token) => {
        if (err) throw err
        res.json({
          _id: user._id,
          email: user.email,
          username: user.username,
          token,
        })
      },
    )
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
}

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
exports.logout = (req, res) => {
  res.status(200).json({ message: '登出成功' })
}
