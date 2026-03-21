/**
 * 种子脚本：生成 30 条资产工单数据
 * 运行：node scripts/seedAssetOrders.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const config = require('../config/config')
const AssetOrder = require('../models/AssetOrder')

const ORDER_TYPES = ['purchase', 'maintenance', 'transfer', 'repair']
const STATUS_LIST = ['pending', 'approved', 'processing', 'completed', 'closed']
const PRIORITY_LIST = ['low', 'medium', 'high']
const PAYMENT_STATUS = ['unpaid', 'partial', 'paid']
const RISK_LEVEL = ['low', 'medium', 'high']
const CITIES = ['Shanghai', 'Beijing', 'Shenzhen', 'Guangzhou', 'Hangzhou']
const LOBS = ['retail', 'finance', 'manufacturing', 'education']
const CATEGORIES = ['server', 'network', 'storage', 'security', 'terminal']
const CHANNELS = ['internal', 'partner', 'direct', 'online']
const OWNERS = ['LiSi', 'WangWu', 'ZhaoLiu', 'SunQi', 'ZhouBa']
const APPLICANTS = ['ZhangSan', 'LiMing', 'WangFang', 'ChenLei', 'LiuYan']
const SUPPLIERS = ['TechSupply', 'CloudParts', 'NextInfra', 'DataHub', 'NetBridge']
const DEPARTMENTS = ['IT', 'Finance', 'Ops', 'Procurement', 'Admin']

const pick = (arr, i) => arr[i % arr.length]
const pad2 = (n) => String(n).padStart(2, '0')
const pad4 = (n) => String(n).padStart(4, '0')

function buildOrder(i) {
  const idx = i + 1
  const month = (idx % 9) + 1
  const day = (idx % 27) + 1
  const orderNo = `AO2026${pad2(month)}-${pad4(idx)}`
  const dateStr = `2026-${pad2(month)}-${pad2(day)}`
  return {
    order_no: orderNo,
    external_no: `EXT-${pad4(idx)}`,
    order_type: pick(ORDER_TYPES, idx),
    status: pick(STATUS_LIST, idx),
    priority: pick(PRIORITY_LIST, idx),
    project_code: `PJT-${pad2((idx % 20) + 1)}`,
    applicant_name: pick(APPLICANTS, idx),
    applicant_phone: `1380000${pad4(idx).slice(-4)}`,
    approver_name: pick(OWNERS, idx + 1),
    department: pick(DEPARTMENTS, idx),
    supplier_name: pick(SUPPLIERS, idx),
    warehouse_code: `WH-${pad2((idx % 7) + 1)}`,
    contract_no: `CT-${pad4(1000 + idx)}`,
    serial_no: `SN-${dateStr.replace(/-/g, '')}-${pad4(idx)}`,
    asset_tag: `AT-${pad4(5000 + idx)}`,
    model_no: `MODEL-${pad2((idx % 15) + 1)}`,
    batch_no: `BATCH-${pad2((idx % 12) + 1)}`,
    payment_status: pick(PAYMENT_STATUS, idx),
    risk_level: pick(RISK_LEVEL, idx),
    city: pick(CITIES, idx),
    line_of_business: pick(LOBS, idx),
    category: pick(CATEGORIES, idx),
    channel: pick(CHANNELS, idx),
    owner_name: pick(OWNERS, idx),
    amount: Number((1000 + idx * 123.45).toFixed(2)),
    currency: 'CNY',
    expect_arrival_time: `${pad2((idx % 8) + 9)}:00:00`,
    booking_start_date: new Date(`${dateStr}T00:00:00.000Z`),
    booking_end_date: new Date(`${dateStr}T23:59:59.000Z`),
    delivery_date: new Date(`${dateStr}T00:00:00.000Z`),
    accept_datetime: new Date(`${dateStr}T10:30:00.000Z`),
    closed_at: idx % 5 === 0 ? new Date(`${dateStr}T16:00:00.000Z`) : null,
    service_window: `${pad2((idx % 6) + 8)}:30:00`,
    maintenance_time_select: `${pad2((idx % 7) + 9)}:15:00`,
    date_pane_value: new Date(`${dateStr}T00:00:00.000Z`),
    deleted_at: null,
  }
}

async function seed() {
  if (!config.mongoUri) {
    console.error('缺少 MONGODB_URI，请配置 .env')
    process.exit(1)
  }

  try {
    await mongoose.connect(config.mongoUri)

    let created = 0
    let skipped = 0
    for (let i = 0; i < 30; i++) {
      const doc = buildOrder(i)
      const exists = await AssetOrder.findOne({ order_no: doc.order_no, deleted_at: null }).lean()
      if (exists) {
        skipped++
        continue
      }
      await AssetOrder.create(doc)
      created++
    }

    console.log(`资产工单种子完成：新建 ${created} 条，跳过 ${skipped} 条`)
  } catch (err) {
    console.error(err)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

seed()

