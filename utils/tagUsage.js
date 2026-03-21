/**
 * 更新标签使用次数（文档/笔记使用标签时调用）
 * 支持传入标签名称或标签 _id（前端可能传 ID 或 name）
 */
const mongoose = require('mongoose')
const Tag = require('../models/Tag')

/**
 * 将 tags 转为非空字符串数组（支持数组或单个值）
 * @param {string[]|string} tags
 * @returns {string[]}
 */
function normalizeTagNames(tags) {
  if (!tags) return []
  const arr = Array.isArray(tags) ? tags : [tags]
  return arr
    .map((t) => (typeof t === 'string' ? t.trim() : String(t).trim()))
    .filter(Boolean)
}

/** 判断是否为合法的 ObjectId 字符串（24 位十六进制） */
function isObjectIdString(str) {
  if (typeof str !== 'string' || str.length !== 24) return false
  return /^[a-fA-F0-9]{24}$/.test(str)
}

/**
 * 将标签列表拆分为：按 _id 匹配的 ID 列表、按 name 匹配的名称列表
 * 前端可能传 tag._id 或 tag.name
 */
function splitTagIdsAndNames(normalized) {
  const ids = []
  const names = []
  for (const s of normalized) {
    if (isObjectIdString(s)) {
      ids.push(new mongoose.Types.ObjectId(s))
    } else {
      names.push(s)
    }
  }
  return { ids, names }
}

/**
 * 增加标签使用次数（文档/笔记创建或编辑时新增的标签）
 * @param {string[]|string} tagNamesOrIds - 标签名称或 _id 列表（前端可能传 ID）
 * @param {string} [authorId] - 已废弃，保留兼容；实际按 name 或 _id 更新，不按作者过滤
 */
async function incrementTagUsage(tagNamesOrIds, authorId) {
  const normalized = normalizeTagNames(tagNamesOrIds)
  if (normalized.length === 0) return
  const { ids, names } = splitTagIdsAndNames(normalized)

  const conditions = []
  if (ids.length) conditions.push({ _id: { $in: ids } })
  if (names.length) conditions.push({ name: { $in: names } })
  if (conditions.length === 0) return

  await Tag.updateMany(
    { $or: conditions },
    { $inc: { usage_count: 1 }, $set: { updated_at: new Date() } }
  )
}

/**
 * 减少标签使用次数（文档/笔记删除或编辑时移除的标签）
 * 不会将 usage_count 减到 0 以下
 * @param {string[]|string} tagNamesOrIds - 标签名称或 _id 列表
 * @param {string} [authorId] - 已废弃，保留兼容
 */
async function decrementTagUsage(tagNamesOrIds, authorId) {
  const normalized = normalizeTagNames(tagNamesOrIds)
  if (normalized.length === 0) return
  const { ids, names } = splitTagIdsAndNames(normalized)

  const conditions = []
  if (ids.length) conditions.push({ _id: { $in: ids }, usage_count: { $gt: 0 } })
  if (names.length) conditions.push({ name: { $in: names }, usage_count: { $gt: 0 } })
  if (conditions.length === 0) return

  await Tag.updateMany(
    { $or: conditions },
    { $inc: { usage_count: -1 }, $set: { updated_at: new Date() } }
  )
}

/**
 * 根据「旧标签列表」与「新标签列表」的差异，更新使用次数
 * 新增的标签 +1，移除的标签 -1
 * @param {string[]} oldTags - 原标签名称列表
 * @param {string[]} newTags - 新标签名称列表
 * @param {string} authorId - 文档/笔记作者 ID
 */
async function syncTagUsageDiff(oldTags, newTags, authorId) {
  const oldSet = new Set(normalizeTagNames(oldTags))
  const newSet = new Set(normalizeTagNames(newTags))
  const toIncrement = [...newSet].filter((n) => !oldSet.has(n))
  const toDecrement = [...oldSet].filter((n) => !newSet.has(n))
  if (toIncrement.length) await incrementTagUsage(toIncrement, authorId)
  if (toDecrement.length) await decrementTagUsage(toDecrement, authorId)
}

module.exports = {
  normalizeTagNames,
  incrementTagUsage,
  decrementTagUsage,
  syncTagUsageDiff,
}
