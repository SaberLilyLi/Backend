import axios from 'axios'

// 你可以改成项目里的统一 axios 实例
const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 在调用前设置 token（也可放到拦截器里）
export function setAuthToken(token: string) {
  request.defaults.headers.common.Authorization = `Bearer ${token}`
}

export type SortOrder = 'asc' | 'desc'

export interface AssetOrderRecord {
  _id: string
  order_no: string
  external_no?: string | null
  order_type: string
  status: string
  priority?: string
  project_code?: string | null
  applicant_name?: string | null
  applicant_phone?: string | null
  approver_name?: string | null
  department?: string | null
  supplier_name?: string | null
  warehouse_code?: string | null
  contract_no?: string | null
  serial_no?: string | null
  asset_tag?: string | null
  model_no?: string | null
  batch_no?: string | null
  payment_status?: string | null
  risk_level?: string | null
  city?: string | null
  line_of_business?: string | null
  category?: string | null
  channel?: string | null
  owner_name?: string | null
  amount?: number | null
  currency?: string | null
  expect_arrival_time?: string | null
  booking_start_date?: string | null
  booking_end_date?: string | null
  delivery_date?: string | null
  accept_datetime?: string | null
  closed_at?: string | null
  service_window?: string | null
  maintenance_time_select?: string | null
  date_pane_value?: string | null
  created_at: string
  updated_at: string
}

export interface AssetOrderPageQuery {
  keyword?: string
  order_no?: string
  external_no?: string
  project_code?: string
  applicant_name?: string
  applicant_phone?: string
  approver_name?: string
  department?: string
  supplier_name?: string
  contract_no?: string
  serial_no?: string
  asset_tag?: string
  model_no?: string
  batch_no?: string

  status?: string[]
  priority?: string[]
  order_type?: string[]
  payment_status?: string[]
  risk_level?: string[]
  city?: string[]
  line_of_business?: string[]
  category?: string[]
  channel?: string[]
  owner_name?: string[]

  booking_date_range?: [string, string]
  created_at_range?: [string, string]
  updated_at_range?: [string, string]

  sortBy?: 'created_at' | 'updated_at' | 'closed_at' | 'order_no' | 'status' | 'priority'
  order?: SortOrder
}

export interface ApiEnvelope<T> {
  success: boolean
  code: number
  message: string
  data: T
  meta: { timestamp: string; traceId: string }
}

export async function pageAssetOrders(params: {
  page: number
  size: number
  query?: AssetOrderPageQuery
}) {
  const { data } = await request.post<
    ApiEnvelope<{
      records: AssetOrderRecord[]
      total: number
      page: number
      size: number
    }>
  >('/asset-orders/page', params)
  return data.data
}

export async function getAssetOrderOptions(field: string, keyword?: string) {
  const { data } = await request.get<ApiEnvelope<{ options: { label: string; value: string }[] }>>(
    `/asset-orders/options/${field}`,
    { params: { keyword } }
  )
  return data.data.options
}

export async function getAssetOrderDetail(id: string) {
  const { data } = await request.get<ApiEnvelope<AssetOrderRecord>>(`/asset-orders/${id}`)
  return data.data
}

export async function createAssetOrder(payload: Partial<AssetOrderRecord>) {
  const { data } = await request.post<ApiEnvelope<AssetOrderRecord>>('/asset-orders', payload)
  return data.data
}

export async function updateAssetOrder(id: string, payload: Partial<AssetOrderRecord>) {
  const { data } = await request.put<ApiEnvelope<AssetOrderRecord>>(`/asset-orders/${id}`, payload)
  return data.data
}

export async function deleteAssetOrder(id: string) {
  const { data } = await request.delete<ApiEnvelope<{ id: string }>>(`/asset-orders/${id}`)
  return data.data
}

