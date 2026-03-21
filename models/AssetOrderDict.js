const mongoose = require('mongoose')

const assetOrderDictSchema = new mongoose.Schema(
  {
    dict_type: { type: String, required: true },
    dict_value: { type: String, required: true },
    dict_label: { type: String, required: true },
    sort_no: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
)

assetOrderDictSchema.index({ dict_type: 1, dict_value: 1 }, { unique: true })
assetOrderDictSchema.index({ dict_type: 1, enabled: 1, sort_no: 1 })

module.exports = mongoose.model('AssetOrderDict', assetOrderDictSchema)

