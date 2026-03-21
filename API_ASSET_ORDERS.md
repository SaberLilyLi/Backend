## Asset Orders 数据库与接口定义

本定义与前端 `asset-orders` 页面字段保持一致，后端按此可直接落库并对接。

### 1) 数据库

- DDL 文件：`sql/asset_orders.sql`
- 包含两张表：
  - `asset_orders`：工单主表
  - `asset_order_dict`：字典表（用于多选项和下拉建议）

---

### 2) 接口定义

#### POST `/api/asset-orders/page`

- **描述**：分页查询工单列表
- **请求体**：

```json
{
  "page": 1,
  "size": 20,
  "query": {
    "keyword": "A2026",
    "order_no": "A2026-0001",
    "external_no": "EXT-001",
    "project_code": "PJT-01",
    "applicant_name": "张三",
    "status": ["pending", "approved"],
    "priority": ["high"],
    "order_type": ["purchase"],
    "payment_status": ["paid"],
    "risk_level": ["low", "medium"],
    "city": ["Shanghai"],
    "line_of_business": ["retail"],
    "category": ["server"],
    "channel": ["internal"],
    "owner_name": ["李四"],
    "booking_date_range": ["2026-03-01", "2026-03-31"],
    "created_at_range": ["2026-03-01 00:00:00", "2026-03-31 23:59:59"],
    "updated_at_range": ["2026-03-01 00:00:00", "2026-03-31 23:59:59"],
    "sortBy": "created_at",
    "order": "desc"
  }
}
```

- **返回**：

```json
{
  "records": [],
  "total": 0,
  "page": 1,
  "size": 20
}
```

---

#### GET `/api/asset-orders/options/{field}?keyword=xxx`

- **描述**：获取选项（下拉、筛选建议）
- **路径参数**：
  - `field`：如 `status`、`priority`、`order_type`、`city`、`owner_name`
- **查询参数**：
  - `keyword`：可选，模糊匹配
- **返回**：

```json
{
  "options": [
    { "label": "待处理", "value": "pending" },
    { "label": "已通过", "value": "approved" }
  ]
}
```

---

### 3) 查询字段映射规范

#### 模糊匹配字段（LIKE）

- `keyword`（建议统一匹配以下字段）
- `order_no`
- `external_no`
- `project_code`
- `applicant_name`
- `applicant_phone`
- `approver_name`
- `department`
- `supplier_name`
- `contract_no`
- `serial_no`
- `asset_tag`
- `model_no`
- `batch_no`

#### 多选字段（IN）

- `status`
- `priority`
- `order_type`
- `payment_status`
- `risk_level`
- `city`
- `line_of_business`
- `category`
- `channel`
- `owner_name`

#### 时间字段

- 单值：`expect_arrival_time`, `delivery_date`, `accept_datetime`, `closed_at`, `service_window`, `maintenance_time_select`, `date_pane_value`
- 区间：
  - `booking_start_date ~ booking_end_date`（建议统一入参 `booking_date_range`）
  - `created_at_range`
  - `updated_at_range`

---

### 4) 通用函数约定（复用风格）

按你要求，接口层建议采用“通用函数 + 业务拼装”的方式，和现有 `utils/tagUsage.js` 的复用思路一致：

- `normalizeArrayInput(v)`：统一把单值/数组转数组，过滤空值
- `buildLikeConditions(query, likeFields)`：构建模糊查询条件
- `buildInConditions(query, inFields)`：构建多选 IN 条件
- `buildRangeConditions(query)`：构建时间区间条件
- `buildPageParams(page, size)`：页码和分页大小兜底
- `buildSort(sortBy, order)`：排序白名单与方向兜底

> 这样后续新增筛选字段时，只改字段映射常量，不改主流程。

---

### 5) 后端落地建议（最小可用）

1. 先执行 `sql/asset_orders.sql` 建表。
2. 新增路由：
   - `POST /api/asset-orders/page`
   - `GET /api/asset-orders/options/:field`
3. Service 层按“通用函数”拼 SQL（参数化查询，防注入）。
4. `options` 优先查 `asset_order_dict`；若字典无配置可回退主表 `DISTINCT`。

