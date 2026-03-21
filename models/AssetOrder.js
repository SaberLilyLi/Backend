const mongoose = require('mongoose')

const assetOrderSchema = new mongoose.Schema(
  {
    order_no: { type: String, required: true, unique: true },
    external_no: { type: String, default: null },
    order_type: { type: String, required: true },
    status: { type: String, required: true },
    priority: { type: String, default: 'medium' },
    project_code: { type: String, default: null },
    applicant_name: { type: String, default: null },
    applicant_phone: { type: String, default: null },
    approver_name: { type: String, default: null },
    department: { type: String, default: null },
    supplier_name: { type: String, default: null },
    warehouse_code: { type: String, default: null },
    contract_no: { type: String, default: null },
    serial_no: { type: String, default: null },
    asset_tag: { type: String, default: null },
    model_no: { type: String, default: null },
    batch_no: { type: String, default: null },
    payment_status: { type: String, default: null },
    risk_level: { type: String, default: null },
    city: { type: String, default: null },
    line_of_business: { type: String, default: null },
    category: { type: String, default: null },
    channel: { type: String, default: null },
    owner_name: { type: String, default: null },
    amount: { type: Number, default: null },
    currency: { type: String, default: 'CNY' },

    // 时间相关字段
    expect_arrival_time: { type: String, default: null }, // HH:mm:ss
    booking_start_date: { type: Date, default: null },
    booking_end_date: { type: Date, default: null },
    delivery_date: { type: Date, default: null },
    accept_datetime: { type: Date, default: null },
    closed_at: { type: Date, default: null },
    service_window: { type: String, default: null }, // HH:mm:ss
    maintenance_time_select: { type: String, default: null }, // HH:mm:ss
    date_pane_value: { type: Date, default: null },

    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
)

assetOrderSchema.index({ order_no: 1 }, { unique: true })
assetOrderSchema.index({ external_no: 1 })
assetOrderSchema.index({ status: 1 })
assetOrderSchema.index({ priority: 1 })
assetOrderSchema.index({ project_code: 1 })
assetOrderSchema.index({ applicant_name: 1 })
assetOrderSchema.index({ department: 1 })
assetOrderSchema.index({ supplier_name: 1 })
assetOrderSchema.index({ city: 1 })
assetOrderSchema.index({ owner_name: 1 })
assetOrderSchema.index({ created_at: -1 })
assetOrderSchema.index({ updated_at: -1 })
assetOrderSchema.index({ closed_at: -1 })

module.exports = mongoose.model('AssetOrder', assetOrderSchema)

