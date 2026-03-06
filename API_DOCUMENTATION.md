## 智能个人知识库助手 API 文档（根据页面需求版）

本文档基于当前的产品需求（知识库主页、文档上传界面、文档详情界面）梳理后端接口，仅描述接口设计，不完全等同于当前代码实现，后续可以按本规范补齐/调整后端。

统一约定：
- **认证方式**：除标注为公开接口外，其他接口均需要在请求头中携带 `Authorization: Bearer <token>`。
- **HTTP 方法约定（偏企业级风格）**：
  - 历史接口中保留少量 `GET`（如健康检查、部分统计/详情），**自本次版本起，新接口一律不再使用 `GET`**。
  - `POST`：用于创建资源，以及**带有复杂查询条件或分页排序参数的查询接口**（不再在 GET 的 Query / Header 中堆叠大量参数）。
  - `PUT / PATCH`：更新资源。
  - `DELETE`：删除资源。
- **返回结构**（示例）：
  - 成功：
    ```json
    {
      "success": true,
      "code": 0,
      "message": "success",
      "data": { ... },
      "meta": {
        "timestamp": "2026-03-05T12:00:00.000Z",
        "traceId": "xxxx-xxxx"
      }
    }
    ```
  - 失败：`success = false`，`code` 为业务错误码，`message` 为错误描述。

---

## 一、用户认证接口

### POST /api/auth/register

- **描述**: 注册新用户，支持可选上传头像。
- **权限**: 公开
- **请求格式**:
  - 推荐使用 `multipart/form-data`，以便同时上传图片和文本字段。
- **请求参数**:
  - 文本字段:
    - `email` (string, 必填): 用户的邮箱地址。
    - `username` (string, 必填): 用户名，至少 3 个字符。
    - `password` (string, 必填): 密码，至少 6 个字符。
  - 文件字段（可选）:
    - `avatar` (file, 可选): 头像图片（`jpg` / `png` / `webp`），大小不超过 2MB。
- **响应**:
  - 成功: 返回用户基础信息、角色以及 JWT 令牌：
    - `_id`、`email`、`username`、`role`、`token`，以及可选的 `avatarUrl`。
  - 失败: 返回错误信息（如图片格式/大小不符合、邮箱已存在等）。

### POST /api/auth/login

- **描述**: 用户登录。
- **权限**: 公开
- **请求体（JSON）**:
  - `email` (string, 必填): 用户的邮箱地址。
  - `password` (string, 必填): 用户的密码。
- **响应**:
  - 成功: 返回用户基础信息、角色以及 JWT 令牌：
    - `_id`、`email`、`username`、`role`、`token`。
    - 前端可根据 `role` 渲染不同菜单和权限（如 admin 后台入口、viewer 受限操作提示等）。
  - 失败: 返回错误信息。

### POST /api/auth/logout

- **描述**: 用户登出。
- **权限**: 私有
- **响应**:
  - 成功: 返回登出成功信息。
  - 失败: 返回错误信息。

### PUT /api/auth/profile

- **描述**: 更新当前登录用户的个人资料，包括修改密码和头像（均为可选）。
- **权限**: 私有
- **请求格式**: `multipart/form-data`
- **请求参数**:
  - 文本字段:
    - `currentPassword` (string, 可选): 当前密码。**当需要修改密码时必填，用于校验。**
    - `newPassword` (string, 可选): 新密码，至少 6 个字符。
  - 文件字段:
    - `avatar` (file, 可选): 新头像图片，`jpg` / `png` / `webp` 格式，大小不超过 2MB。
- **行为规则**:
  - 仅修改头像: 不传 `newPassword`，只上传 `avatar` 即可。
  - 仅修改密码: 需同时传 `currentPassword` 和 `newPassword`，通过校验后更新密码。
  - 同时修改: 同时上传 `avatar` 并传入密码相关字段。
- **响应**:
  - 成功: 返回更新后的用户基础信息:
    - `_id`、`email`、`username`、`avatarUrl`。
  - 失败: 返回错误信息（如当前密码错误、头像不合规等）。

### POST /api/auth/role-requests

- **描述**: viewer 角色用户提交权限申请（例如申请升级为普通用户 user，以便创建和编辑文档/笔记）。
- **权限**: 私有（仅 `viewer`）
- **请求体（JSON）**:
  - `targetRole` (string, 可选): 目标角色，目前仅支持 `"user"`，不传时默认 `"user"`。
  - `reason` (string, 可选): 申请原因说明，供管理员审批参考。
- **行为规则**:
  - 若当前用户不是 `viewer`，接口返回错误（普通用户和管理员无需通过此接口变更角色）。
  - 相同用户 + 相同目标角色在存在状态为 `pending` 的申请时，禁止重复提交。
- **响应**:
  - 成功: 返回创建的申请记录对象。
  - 失败: 返回参数错误或角色不匹配等错误信息。

### POST /api/auth/role-requests/query

- **描述**: 管理员按条件查询权限申请列表，用于审批 viewer 的权限升级。
- **权限**: 私有（仅 `admin`）
- **请求体（JSON，可选）**:
  - `status` (string, 可选): 按状态过滤，`pending` | `approved` | `rejected` | `auto_rejected`，默认返回全部。
  - `userEmail` / `username` (string, 可选): 按用户信息模糊查询。
  - `dateRange` (object, 可选): 申请时间范围，例如 `{ "from": "2026-03-01", "to": "2026-03-31" }`。
- **响应**:
  - 成功: 返回申请列表，每项包含:
    - `userId`（附带 `username/email/role`）
    - `targetRole`
    - `reason`
    - `status`
    - `decidedBy`（如已处理，附带管理员基本信息）
    - `decidedAt`
    - `decisionComment`

### POST /api/auth/role-requests/:id/approve

- **描述**: 管理员同意某条权限申请，通常为将 viewer 升级为 user。
- **权限**: 私有（仅 `admin`）
- **请求体（JSON，可选）**:
  - `decisionComment` (string, 可选): 审批备注。
- **行为规则**:
  - 仅允许对状态为 `pending` 的申请执行操作。
  - 同意后:
    - 更新申请状态为 `approved`，记录 `decidedBy/decidedAt/decisionComment`。
    - 将对应用户的 `role` 更新为申请中的 `targetRole`（当前为 `user`）。
- **响应**:
  - 成功: 返回更新后的申请记录。

### POST /api/auth/role-requests/:id/reject

- **描述**: 管理员拒绝某条权限申请。
- **权限**: 私有（仅 `admin`）
- **请求体（JSON，可选）**:
  - `decisionComment` (string, 可选): 拒绝原因。
- **行为规则**:
  - 仅允许对状态为 `pending` 的申请执行操作。
  - 拒绝后:
    - 更新申请状态为 `rejected`，记录 `decidedBy/decidedAt/decisionComment`。
- **响应**:
  - 成功: 返回更新后的申请记录。

---

## 二、角色与预览管理相关接口（viewer 专用与管理员管理）

本节补充定义 viewer 在文档预览上的配额控制接口，以及管理员对 viewer 预览行为和配额的管理接口。

### 1. viewer 预览行为入口

#### POST /api/viewer/previews/initiate

- **描述**：viewer 发起对某个文档的预览请求。后端根据当前用户的默认日配额、已使用次数、额外配额窗口和冷静期等规则判断：
  - 若仍有可用配额（默认或额外），则允许预览，并在预览行为日志中记录“首次预览时间”。
  - 若配额已用尽但允许申请，则引导创建新增配额申请记录。
- **权限**：私有（仅 `viewer`）
- **请求体（JSON）**：
  - `documentId` (string, 必填)：欲预览的文档 ID。
  - `reason` (string, 可选)：本次预览的用途说明，便于管理员审查（例如“临时查看项目文档”）。
- **行为规则（概要）**：
  - 若该 viewer 在过去 24 小时内首次预览过该文档：
    - 本次调用不再额外消耗文档计数，仅视为再次访问，接口直接返回“允许预览”。
  - 若该文档在 24 小时内尚未被该 viewer 预览过：
    - 若该 viewer 在当前计数周期内尚未用尽（默认日配额 + 生效中的额外配额）：
      - 允许预览，并记录一条 ViewerPreviewLog（日计数 +1）。
    - 若已用尽：
      - 返回“配额已用完，需要申请新增预览次数”的错误码，前端可跳转到申请接口。
- **响应**：
  - 成功（允许预览）：
    - `allowed: true`
    - `reasonCode`: `"within_quota"` 或 `"within_24h_same_document"`
  - 失败（需要申请或处于冷静期）：
    - `allowed: false`
    - `reasonCode`: `"quota_exhausted"` / `"cooldown"` / 其他业务码
    - `message`: 详细提示。

> 实际“拉取文档内容/下载链接”的行为仍通过现有文档详情/导出接口完成，前端需在调用本接口并获得允许后，才触发文档预览相关接口。

### 2. viewer 申请新增预览配额

#### POST /api/viewer/preview-quota/requests

- **描述**：viewer 在配额不足时，申请在一定时间窗口内增加可预览文件数量。
- **权限**：私有（仅 `viewer`）
- **请求体（JSON）**：
  - `suggestedExtraTotal` (number, 可选)：期望增加的额外可预览文件数（仅作参考，最终由管理员决定）。
  - `comment` (string, 可选)：申请说明。
- **行为规则**：
  - 若当前 viewer 仍有未过期的额外配额窗口，或处于冷静期内，则拒绝创建新申请。
  - 创建成功后，状态为 `pending`，等待管理员审批；若 24 小时内未处理，将自动标记为 `auto_rejected`。
- **响应**：
  - 成功：返回创建的申请记录（含 `status = "pending"`）。
  - 失败：返回错误信息（如当前不能申请、已有 pending 申请等）。

### 3. 管理员查看与审批 viewer 预览配额申请

#### POST /api/admin/preview-quota/requests/query

- **描述**：管理员按条件查询 viewer 的预览配额申请列表。
- **权限**：私有（仅 `admin`）
- **请求体（JSON，可选）**：
  - `status` (string, 可选)：按状态过滤，`pending` | `approved` | `rejected` | `auto_rejected`。
  - `viewerEmail` / `viewerName` (string, 可选)：按 viewer 信息模糊过滤。
  - `dateRange` (object, 可选)：申请时间范围。
- **响应**：
  - 成功：返回申请列表，每项包含：
    - 申请基本信息（viewer、创建时间、状态、申请说明）。
    - 审批信息（如已处理：`decidedBy/decidedAt/decisionComment`）。
    - 生效配置（`effectiveFrom/effectiveTo/extraTotal/extraRemaining/cooldownUntil`）。

#### POST /api/admin/preview-quota/requests/:id/approve

- **描述**：管理员同意一条预览配额申请，并设置生效时间与额外配额数量。
- **权限**：私有（仅 `admin`）
- **请求体（JSON）**：
  - `effectiveFrom` (string, 可选)：生效开始时间，ISO 时间字符串；不传时默认当前时间。
  - `effectiveDurationHours` (number, 可选)：生效时长（单位小时），默认 24 小时，可配置为 72 等。
  - `extraTotal` (number, 必填)：本次批准的额外可预览文件数（例如 10）。
  - `cooldownHours` (number, 可选)：生效窗口结束后冷静期时长（单位小时），默认 12。
  - `decisionComment` (string, 可选)：审批说明。
- **行为规则**：
  - 仅允许对 `pending` 状态的申请执行审批。
  - 设置：
    - `effectiveFrom` / `effectiveTo`（按时长计算）。
    - `extraTotal` / `extraRemaining`（初始相等）。
    - `cooldownUntil` = `effectiveTo` + 冷静期时长。
  - 更新申请的 `status = "approved"`，并写入审批人信息。
- **响应**：
  - 成功：返回更新后的申请记录。

#### POST /api/admin/preview-quota/requests/:id/reject

- **描述**：管理员拒绝一条预览配额申请。
- **权限**：私有（仅 `admin`）
- **请求体（JSON，可选）**：
  - `decisionComment` (string, 可选)：拒绝原因。
- **行为规则**：
  - 仅允许对 `pending` 状态的申请执行操作。
  - 更新申请 `status = "rejected"`，记录审批人和时间。
- **响应**：
  - 成功：返回更新后的申请记录。

### 4. 管理员查看 user / viewer 详情与日志

> 以下接口建议挂在统一的管理员前缀下，以免与普通用户接口混淆；此处仅给出路径示例，具体路径可根据后端实现微调。

#### POST /api/admin/users/query

- **描述**：管理员按条件查询系统中的 user 和 viewer 用户列表，支持按权限、用户名、邮箱筛选及分页。
- **权限**：私有（仅 `admin`）
- **请求体（JSON，可选）**：
  - `role` (string | array&lt;string&gt;, 可选)：按角色过滤。单值：`user` | `viewer` | `admin`；数组时匹配其中任一角色。
  - `username` (string, 可选)：用户名模糊搜索（不区分大小写）。
  - `email` (string, 可选)：邮箱模糊搜索（不区分大小写）。
  - `keyword` (string, 可选)：关键字，同时模糊匹配用户名和邮箱（与 `username`/`email` 可同时使用，条件为 AND）。
  - `page` (number, 可选)：页码，默认 1。
  - `limit` (number, 可选)：每页条数，默认 20，最大 100。
- **响应**：
  - 成功：`data` 包含：
    - `users` (array)：用户列表，每项含 `_id`、`email`、`username`、`role`、`avatarUrl`、`createdAt`，不包含 `password`。
    - `total`：符合条件的总条数。
    - `page`、`limit`：当前页码与每页条数。

#### POST /api/admin/users/:userId/detail

- **描述**：管理员查看某用户的详情。
- **权限**：私有（仅 `admin`）
- **请求体（JSON，可选）**：
  - `includeActivityLogs` (boolean, 可选)：是否返回文档提交/修改记录（针对 user）。
  - `includePreviewLogs` (boolean, 可选)：是否返回预览/配额相关日志（针对 viewer）。
- **响应**（示例结构）：
  - 对 user：
    - `basicInfo`：用户基础信息。
    - `documentActivityLogs`：文档提交/修改记录，支持前端按记录下载文件。
  - 对 viewer：
    - `basicInfo`：用户基础信息。
    - `previewLogs`：ViewerPreviewLog 列表。
    - `quotaRequests`：PreviewQuotaRequest 列表。
    - `currentQuotaConfig`：当前默认每日配额、已生效的额外配额信息、冷静期状态等。

### 5. 管理员修改 viewer 权限与预览配置

#### POST /api/admin/viewers/:viewerId/update-role

- **描述**：管理员调整 viewer 角色，可进行临时或永久的升级为 user。
- **权限**：私有（仅 `admin`）
- **请求体（JSON）**：
  - `mode` (string, 必填)：`"temporary"` 或 `"permanent"`。
  - `temporaryUntil` (string, 可选)：临时升级截止时间，ISO 时间字符串，仅在 `mode = "temporary"` 时使用。
  - `decisionComment` (string, 可选)：说明。
- **行为规则**：
  - `mode = "temporary"`：设置用户在 `temporaryUntil` 之前视为 user，到期自动恢复为 viewer。
  - `mode = "permanent"`：直接将 `role` 更新为 user，不再自动回退。

#### POST /api/admin/viewers/:viewerId/update-preview-config

- **描述**：管理员长期调整某个 viewer 的默认每日预览配额（如从 10 次/天调整为 20 次/天），并可手动调整冷静期。
- **权限**：私有（仅 `admin`）
- **请求体（JSON）**：
  - `dailyLimit` (number, 可选)：新的默认每日可预览文件数。
  - `cooldownUntil` (string, 可选)：新的冷静期结束时间；若要立即结束冷静期，可传当前时间之前的时间戳或专门的标志位。
  - `comment` (string, 可选)：调整说明。
- **响应**：
  - 成功：返回更新后的 viewer 配置摘要。

---

## 三、知识库主页相关接口

对应页面：「知识库主页」
- 顶部：语义搜索、上传文档、新建文件夹、导出数据。
- 左侧：文件夹树、标签云。
- 中间：文档列表（卡片/列表视图切换）。
- 右侧：文档预览（点击文档时拉取）。

### 1. 文档列表查询

#### POST /api/documents/query

- **描述**：获取当前用户可见范围内的文档**列表元数据**（不返回文档全文内容），支持“默认/收藏/最近/已归档”四种模式，以及标签、名称、上传用户等条件过滤与分页。采用 POST + JSON Body 的方式承载查询条件，避免在 GET Query 中堆积复杂参数。若需要查看或编辑具体内容，请调用 `GET /api/documents/:id`。
- **权限**：登录用户
- **请求体（JSON）**：
  - `mode` (string, 可选)：查询模式，`all`（默认）| `favorite` | `recent` | `archived`。
  - `keyword` (string, 可选)：普通关键字搜索（标题、内容内搜索，简单匹配）。
  - `category` (string, 可选)：分类/文件夹标识（如分类名称或 ID）。
  - `tags` (array<string>, 可选)：标签过滤，例如 `["AI","前端"]`。
  - `uploader` (string, 可选)：上传用户 ID（当前实现等同于按 `author_id` 过滤，后续可扩展为用户名搜索）。
  - `sortBy` (string, 可选)：排序字段，默认 `created_at`，可选 `updated_at`、`title` 等。
  - `order` (string, 可选)：排序方向，`asc` 或 `desc`，默认 `desc`。
  - `page` (number, 可选)：页码，默认 1。
  - `limit` (number, 可选)：每页条数，默认 20，前端可提供 10/20/30/50/100 等选项。
- **响应**：
  - **data**：
    - `documents` (array)：文档列表，每项均包含：
      - `_id`、`title`、`tags`、`category`、`author_id`
      - `updated_at`：最后一次更新时间（ISO 或时间戳）。
      - `uploader`：上传人信息对象（必返），含 `id`、`username`、`email`、`avatarUrl`。
      - `canEdit`：当前用户是否可编辑该文档（作者或管理员为 true）。
      - `size`：文档大小（可选，若有）。
    - `page`、`limit`、`total`：分页信息。

### 2. 语义搜索（顶部搜索框）

#### POST /api/search

- **描述**：基于用户个人知识库进行语义搜索和智能问答（RAG 入口），用于顶部搜索框。
- **权限**：登录用户
- **请求体（JSON）**：
  - `query` (string, 必填)：自然语言查询。
  - `topK` (number, 可选)：返回相关文档数量，默认 5，最大 20。
- **响应**：
  - **data**：
    - `query`：原始查询。
    - `answer`：根据检索结果生成的答案摘要（字符串）。
    - `results` (array)：相关文档列表，每项：
      - `documentId`
      - `score`
      - `metadata`（标题、标签、分类等）。

### 3. 文件夹树（左侧导航）

#### POST /api/categories/tree

- **描述**：获取当前用户的文件夹树结构。采用 POST 以便后续支持按空间、权限等复杂条件过滤。
- **权限**：登录用户
- **请求体（JSON，可选）**：
  - `rootId` (string, 可选)：指定从某个节点开始拉取子树，不传则默认从根节点开始。
- **响应**：
  - **data**：
    - `nodes` (array)：节点列表，示例结构：
      - `id`：节点 ID。
      - `name`：文件夹名称。
      - `parentId`：父节点 ID，根节点为 `null`。
      - `children`：子节点数组（可选，视实现情况）。

> 若暂不实现多级文件夹，可以直接在该接口中返回一层扁平列表，由前端自行组织树结构。

### 4. 标签云（左侧导航）

#### POST /api/tags/hot

- **描述**：返回按使用频次排序的标签列表，用于标签云展示。采用 POST 以便后续按空间、时间范围等进行筛选。
- **权限**：登录用户
- **请求体（JSON，可选）**：
  - `limit` (number, 可选)：返回前多少个热门标签，默认 50。
  - `from` / `to` (string, 可选)：统计时间范围，格式 `YYYY-MM-DD`。
- **响应**：
  - **data**：
    - `tags` (array)：标签列表，每项：
      - `name`
      - `count`：该标签被多少文档/笔记使用（热度）。

### 5. 新建文件夹（左上角按钮）

#### POST /api/categories

- **描述**：创建新的分类/文件夹。
- **权限**：登录用户
- **请求体（JSON）**：
  - `name` (string, 必填)：文件夹名称。
  - `parentId` (string, 可选)：父节点 ID，根节点可为空。
  - 其他展示字段（如 `icon`、`color`）可选。
- **响应**：
  - **data**：创建后的分类对象。

### 6. 导出数据（顶部“导出数据”按钮）

#### POST /api/documents/export

- **描述**：导出当前用户的文档数据，可按筛选条件导出为文件（如 zip / json）。
- **权限**：登录用户
- **请求体（JSON）**：
  - `scope` (string, 可选)：导出范围，例如 `all`、`currentFilter`。
  - `format` (string, 可选)：导出格式，如 `json`、`markdown_zip` 等。
  - `filters` (object, 可选)：与 `/api/documents` 相同的过滤条件（分类、标签、关键字等）。
- **响应**：
  - 若采用异步任务：
    - 返回任务 ID，前端轮询下载链接。
  - 若采用同步下载：
    - 返回文件流（`Content-Disposition: attachment`）。

> 具体实现可根据实际需要简化，目前接口设计层面保留此能力。

---

## 三、文档上传界面相关接口

### （补充）文档浏览与搜索整体调用流程示例

结合“文档浏览与搜索流程”交互图，前端典型调用顺序可以参考下面步骤：

1. **进入知识库主页，展示默认文档列表**
   - 调用 `POST /api/documents/query`
   - Body 中可仅传分页与排序信息（或为空），例如 `{ "page": 1, "limit": 20 }`。
2. **用户输入关键字进行普通列表搜索**
   - 仍然调用 `POST /api/documents/query`，Body 例如：
     ```json
     {
       "keyword": "前端",
       "category": "面试题",
       "tags": ["Vue3","性能优化"],
       "page": 1,
       "limit": 20
     }
     ```
   - 后端按关键字 + 分类 + 标签过滤并返回新的列表。
3. **用户使用语义搜索（智能问答）**
   - 调用 `POST /api/search`，请求体 `{ "query": "...", "topK": 5 }`
   - 根据返回的 `results` 渲染“搜索结果列表”，可展示 `metadata.title`、`metadata.tags` 等。
4. **用户从搜索结果或普通列表中点击某一条文档**
   - 调用 `GET /api/documents/:id`
   - 用于右侧预览区或文档详情页展示完整内容。
5. **用户切换标签 / 文件夹进一步筛选文档**
   - 重新调用 `POST /api/documents/query`，在 Body 中组合 `category`、`tags`、`keyword` 等参数。

以上流程只基于 `GET /api/documents` 和 `POST /api/search` 两类接口完成列表浏览与搜索体验，其他接口（如标签云、文件夹树）用于辅助构建筛选条件。

对应页面：「文档上传界面」
- 支持拖放 / 选择文件。
- 展示上传进度。
- 自动解析文档。
- 编辑元数据（标题、标签、分类）。

### 1. 上传文件并解析

#### POST /api/documents/upload

- **描述**：上传文档文件（支持 Markdown、PDF、Word 等），后端保存原始文件并尝试解析出文本内容和基础元数据。
- **权限**：登录用户
- **请求格式**：`multipart/form-data`
  - `file` (file, 必填)：上传的文档文件。
  - `category` (string, 可选)：初始分类。
  - `tags` (string, 可选)：标签字符串，多个用逗号分隔。
  - `description` (string, 可选)：文件描述 / 备注说明。
- **响应**：
  - **data**：
    - `tempId` 或 `_id`：临时文档 ID（若直接保存则为正式文档 ID）。
    - `title`：从文件名或内容解析出的标题建议。
    - `contentPreview`：截断后的内容预览。
    - `fileInfo`：文件相关信息（大小、类型等）。

> 上传进度通常由前端通过 `XMLHttpRequest` 或 `fetch` 的进度事件实现，后端无需特殊接口。

### 2. 保存（或更新）文档元数据

#### POST /api/documents

- **描述**：基于解析后的内容，最终保存文档（也可直接用于创建纯文本文档）。
- **权限**：登录用户
- **请求体（JSON）**：
  - `title` (string, 必填)：文档标题。
  - `content` (string, 必填)：文档内容（Markdown / 文本）。
  - `content_type` (string, 可选)：内容类型，默认 `markdown`。
  - `category` (string, 可选)：分类/文件夹。
  - `tags` (array<string>, 可选)：标签数组。
  - `description` (string, 可选)：文件描述 / 备注说明。
  - `sourceFileId` (string, 可选)：若有文件存储，可关联上传的原始文件 ID。
- **响应**：
  - **data**：创建后的完整文档对象。

### 3. 更新文档（轻量编辑，仅元数据）

#### PUT /api/documents/:id

- **描述**：更新文档的元数据（标题、类型、分类、标签等），**不建议在此接口中修改正文内容**。用于简单编辑场景，例如只改标题或标签。
- **权限**：登录用户
- **请求体（JSON）**：
  - `title` (string, 可选)
  - `content_type` (string, 可选)
  - `category` (string, 可选)
  - `tags` (array<string>, 可选)
- **响应**：
  - **data**：更新后的文档对象。

### 3.1 编辑保存文档（支持替换内容）

#### POST /api/documents/:id/save

- **描述**：编辑保存文档，支持删除原有“文件内容”并替换为新的内容，也支持只修改标签、分类等元数据而不动原内容。建议在用户点击“编辑并保存”时调用本接口。
- **权限**：登录用户（仅作者或管理员可操作）
- **请求体（JSON）**：
  - `title` (string, 可选)：文档标题。
  - `content` (string, 可选)：新的文档正文内容（例如 Markdown 文本）。**传入即覆盖原有内容**；不传则保留原有内容不变。
  - `content_type` (string, 可选)：内容类型，如 `markdown`、`text` 等。
  - `category` (string, 可选)：分类/文件夹。
  - `tags` (array<string>, 可选)：标签数组。
  - `description` (string, 可选)：文档描述/备注。
- **行为规则**：
  - 若传入 `content`：视为“上传了新文件内容”，后端会用新的正文**覆盖**原有内容。
  - 若未传 `content`：仅更新其他字段（如标题、标签、分类、描述），原有文件内容保持不变。
  - 所有字段均为可选，只更新传入的字段。
- **响应**：
  - 成功：返回保存后的完整文档对象（包含 `uploader`、`updated_at` 等）。
  - 失败：返回权限或参数错误信息。

### 4. 收藏与归档操作

#### POST /api/documents/:id/favorite

- **描述**：设置或取消当前用户对某文档的收藏状态。
- **权限**：登录用户
- **请求体（JSON）**：
  - `favorite` (boolean, 必填)：`true` 表示加入收藏，`false` 表示取消收藏。
- **说明**：
  - 收藏是“用户-文档”级别的元数据：同一篇文档可以被多个用户收藏，每个用户的收藏列表互相独立。
- **响应**：
  - 成功：返回当前用户与该文档的元数据记录（`isFavorite` 等）。

#### POST /api/documents/:id/archive

- **描述**：设置或取消当前用户对某文档的归档状态。
- **权限**：登录用户
- **请求体（JSON）**：
  - `archived` (boolean, 必填)：`true` 表示标记为已归档，`false` 表示取消归档。
- **说明**：
  - 归档同样是“用户-文档”级别的元数据，用于前端“已归档”视图。
- **响应**：
  - 成功：返回当前用户与该文档的元数据记录（`isArchived` 等）。

### 4. 更新文档权限与公开时间窗口

#### PUT /api/documents/:id/visibility

- **描述**：作者（或管理员）设置文档的**可见性**与**公开日期**（公开时间窗口）。
- **权限**：私有（仅作者本人和管理员可操作）
- **请求体（JSON）**：
  - `visibility` (string, 可选)：`private` | `public`。不传则不修改原值。
  - `publicFrom` (string/number, 可选)：公开开始时间，支持 ISO 8601 字符串或时间戳（毫秒）；传 `null` 或空字符串表示清除。
  - `publicTo` (string/number, 可选)：公开结束时间，格式同 `publicFrom`；不传表示不修改，清除表示长期公开。
  - `publicBlocked` (boolean, 可选)：是否禁止对外公开（仅管理员可设置）；为 `true` 时即使 `visibility=public` 且在时间窗内也不对非作者/管理员开放。
- **规则说明**：
  - 当 `visibility = private` 时，文档仅作者和管理员可见。
  - 当 `visibility = public` 且当前时间在 `publicFrom`～`publicTo` 内，且未设置 `publicBlocked`，文档对所有登录用户可见。
  - 管理员修改他人文档的可见性/日期后，会向该文档作者推送一条通知。
- **响应**：
  - 成功：返回更新后的文档对象（含 `visibility`、`publicFrom`、`publicTo`、`publicBlocked` 等）。
  - 失败：400 参数错误（如 `visibility` 非枚举、日期格式无效）；403 无权限；404 文档不存在。

### 5. 指定用户共享（定向公开）

#### POST /api/documents/:id/share-with-users

- **描述**：将文档在指定时间内对指定用户公开，最多 30 天，到期后自动失效（默认行为为私有，除非显式调用本接口或设置全局公开）。
- **权限**：私有（仅作者或管理员）
- **请求体（JSON）**：
  - `targetUserIds` (array<string>, 必填)：需要共享的目标用户 ID 列表。
  - `days` (number, 可选)：共享天数，最大 30；不传或超过 30 时按 30 天处理。
- **规则说明**：
  - 若未调用本接口，文档默认仅对作者和管理员可见（私有）。
  - 对目标用户的共享有效期由 `days` 决定，到期后用户再访问会被拒绝，无需额外手动清理。
  - 全局公开（`visibility = public`）与定向共享相互独立：
    - 全局公开：对所有用户生效，受 `publicFrom/publicTo` 控制。
    - 定向共享：即使文档仍为 `private`，被共享用户也可在有效期内访问。
- **响应**：
  - 成功：返回共享设置结果（文档 ID、目标用户列表、生效天数与过期时间）。
  - 失败：返回权限错误或参数错误信息。

---

## 四、文档详情界面相关接口

对应页面：「文档详情界面」
- 标题栏：标题、保存、分享、导出、历史版本。
- 内容区域：Markdown 编辑 / 预览。
- 元数据区域：标签、分类、最后修改时间、文档大小。
- 版本历史：时间线 + 恢复。

### 1. 获取文档详情（点击文档标题或列表卡片）

#### GET /api/documents/:id

- **描述**：获取单个文档的详细元信息（不直接返回上传文件/正文内容），用于详情页展示和右侧预览的基础信息。若需要下载文件，请使用返回的 `downloadUrl` 字段调用导出接口。  
  > 说明：该接口为历史保留的 `GET` 接口，自本次版本起，新接口将统一使用 `POST/PUT/DELETE`，不再新增 `GET`。
- **权限**：登录用户（在 viewer 场景下，实际内容预览需结合预览配额接口判断，见下文）
- **响应**：
  - **data**：
    - `_id`
    - `title`
    - `description`
    - `tags`
    - `category`
    - `created_at`
    - `updated_at`
    - `visibility`、`publicFrom`、`publicTo`
    - `uploader`：上传用户信息（`id/username/email/avatarUrl`）
    - `downloadUrl`：文件下载接口地址（如 `/api/v1/documents/:id/export`）

### 2. 文档导出（详情页“导出”按钮）

#### POST /api/documents/:id/export

- **描述**：将单篇文档导出为指定格式（例如 Markdown 文件、PDF 等）。
- **权限**：登录用户
- **请求体（JSON）**：
  - `format` (string, 必填)：导出格式，如 `markdown`、`pdf` 等。
- **响应**：
  - 若采用文件下载：返回文件流。
  - 若采用预生成链接：返回下载 URL。

### 3. 文档分享（详情页“分享”按钮）

> 是否开启对外分享视产品策略而定，这里给出一个典型设计占位。

#### POST /api/documents/:id/share

- **描述**：生成可分享链接或分享配置（如只读、有效期）。
- **权限**：登录用户
- **请求体（JSON，可选）**：
  - `mode` (string)：分享模式，如 `public_readonly`。
  - `expiresIn` (number)：有效期（秒）。
- **响应**：
  - **data**：
    - `shareUrl` (string)：分享链接。
    - 其他策略字段。

### 4. 文档版本历史（详情页“历史版本”）

版本控制是文档详情页的关键需求：展示每个版本的摘要、时间、操作者，并支持查看与恢复。

#### GET /api/documents/:id/versions

- **描述**：获取某文档的版本历史列表。
- **权限**：登录用户
- **响应**：
  - **data**：
    - `versions` (array)：按时间倒序排列，每项包含：
      - `versionId`：版本 ID。
      - `versionNumber`：版本号（如 v1、v2）。
      - `createdAt`：版本创建时间。
      - `updatedBy`：修改人（当前场景一般为用户自己）。
      - `summary`：该版本的修改摘要（可选）。

#### GET /api/documents/:id/versions/:versionId

- **描述**：查看某个具体版本的完整内容。
- **权限**：登录用户
- **响应**：
  - **data**：
    - `versionId`
    - `title`
    - `content`
    - `content_type`
    - `tags`
    - `category`
    - `createdAt`

#### POST /api/documents/:id/versions/:versionId/restore

- **描述**：将文档恢复到指定历史版本。
- **权限**：登录用户
- **请求体（JSON，可选）**：
  - `keepCurrentAsVersion` (boolean, 可选，默认 true)：是否把当前版本另存为一个历史版本再恢复。
- **响应**：
  - **data**：恢复后的当前文档对象。

> 具体的版本存储实现（如独立集合 `document_versions` 或在文档中嵌套历史数组）可以在后端设计时确定，本接口文档仅约定交互契约。

### （补充）版本管理整体调用流程示例

结合“版本管理流程”交互图，前端典型调用顺序可以参考下面步骤：

1. **用户进入文档详情页**
   - 调用 `GET /api/documents/:id` 获取当前最新版本内容和元数据。
2. **用户点击“版本”或“历史版本”标签**
   - 调用 `GET /api/documents/:id/versions` 获取该文档的所有版本列表，在页面以时间线或列表形式展示。
3. **用户选择某一个版本进行查看**
   - 调用 `GET /api/documents/:id/versions/:versionId` 获取该版本的完整内容。
   - 前端可：
     - 单独展示这个版本的内容；或
     - 与当前版本在前端做 Diff 高亮（不额外依赖后端接口）。
4. **用户决定是否恢复到该版本**
   - 若只想查看，不恢复：不再调用接口，仅停留在预览状态。
   - 若确认恢复：
     - 调用 `POST /api/documents/:id/versions/:versionId/restore`（可带上 `keepCurrentAsVersion` 配置）。
     - 后端将该版本内容写回为“当前版本”，并可在内部记录操作日志（用户、时间、来源版本等）。
5. **恢复成功后**
   - 前端可以重新调用：
     - `GET /api/documents/:id` 刷新当前文档内容；
     - 或 `GET /api/documents/:id/versions` 刷新版本列表，使刚才的“旧当前版本”出现在历史中。

---

## 五、标签与分类管理接口

### 1. 标签管理

#### POST /api/tags/query（推荐）

- **描述**：查询标签列表。
- **权限**：登录用户
- **查询规则**：
  - **管理员**：可看到所有标签。
  - **普通用户**：只能看到自己创建的标签 + 全局标签（`is_global = true`）。
- **请求体（JSON）**：
  - `keyword` (string, 可选)：标签名称搜索。
  - `page` (number, 可选)：页码，默认 1。
  - `limit` (number, 可选)：每页条数，默认 50。
- **响应**：
  - **data**：
    - `tags` (array)：标签数组，每项包含 `_id`、`name`、`color`、`owner_id`、`is_global`、`usage_count`。
    - `total`、`page`、`limit`：分页信息。

#### GET /api/tags

- **描述**：获取标签列表（兼容旧接口）。
- **说明**：查询规则同 `POST /api/tags/query`。

#### POST /api/tags

- **描述**：创建标签。
- **权限**：登录用户（`user` / `admin`）
- **请求体（JSON）**：
  - `name` (string, 必填)
  - `color` (string, 可选)

#### PUT /api/tags/:id

- **描述**：更新标签。
- **权限**：标签创建者或管理员。

#### DELETE /api/tags/:id

- **描述**：删除标签。
- **权限**：标签创建者或管理员。

### 2. 分类/文件夹管理

#### GET /api/categories

- **描述**：查询分类列表，返回系统默认文件夹 + 用户自定义分类。
- **权限**：登录用户
- **查询规则**：每个用户只能看到自己创建的分类 + 全局分类（`is_global = true`）。

#### PUT /api/categories/:id

- **描述**：更新分类。
- **权限**：仅分类创建者本人。

#### DELETE /api/categories/:id

- **描述**：删除分类。
- **权限**：仅分类创建者本人。

#### POST /api/categories/auto-archive

- **描述**：自动归档30天内无改动的文档（收藏文档除外）。

### 3. 系统默认文件夹

| 文件夹 | 说明 |
|--------|------|
| 收藏 | 用户收藏的文档 |
| 最近 | 最近访问的文档 |
| 已归档 | 30天无改动自动归档 |

---

## 六、通知系统接口

### POST /api/notifications/query

- **描述**：查询当前用户的通知/消息列表。

### POST /api/notifications/:id/read

- **描述**：标记一条通知为已读。

> **通知触发场景**：管理员修改他人文档的可见性时，向原作者发送 `visibility_changed` 通知。

---


- 创建/更新/删除分类接口与前面“新建文件夹”部分的 `/api/categories`、`PUT /api/categories/:id`、`DELETE /api/categories/:id` 一致，此处不再赘述。

---


---

## 七、统计与图谱相关接口

### 1. 数据统计与可视化接口

#### GET /api/analytics/overview

- **描述**：获取当前用户知识库概览统计数据。
- **权限**：私有
- **响应**：
  - 成功: 返回对象：
    - `documents` (number): 文档总数。
    - `notes` (number): 笔记总数。

#### GET /api/analytics/trends

- **描述**：获取按日期聚合的文档/笔记创建趋势数据，可用于折线图展示。
- **权限**：私有
- **响应**：
  - 成功: 返回数组，每项包含：
    - `date` (string): 日期（YYYY-MM-DD）。
    - `documents` (number): 当日创建的文档数量。
    - `notes` (number): 当日创建的笔记数量。

#### GET /api/analytics/user-summary

- **描述**：获取当前用户的综合统计信息，包括文档/笔记数量，以及最近 3/7/30 天的文档变更次数与搜索次数。
- **权限**：私有
- **响应**：
  - 成功: 返回对象：
    - `counts`:
      - `documents` (number): 文档总数。
      - `notes` (number): 笔记总数。
    - `documentChanges`:
      - `last3Days` (number)
      - `last7Days` (number)
      - `last30Days` (number)
    - `searches`:
      - `last3Days` (number)
      - `last7Days` (number)
      - `last30Days` (number)

### 2. 知识图谱接口

#### GET /api/graph

- **描述**：获取知识图谱数据（节点 + 关系），当前基于文档、标签、分类自动构造，可直接用于 ECharts / AntV G6 等前端可视化组件。
- **权限**：私有
- **响应**：
  - 成功: 返回对象：
    - `nodes` (array): 节点列表，每项包含：
      - `id` (string): 节点唯一 ID（如 `doc:xxx`、`tag:xxx`、`cat:xxx`）。
      - `label` (string): 节点展示名称。
      - `type` (string): 节点类型（`document` | `tag` | `category`）。
    - `edges` (array): 边列表，每项包含：
      - `source` (string): 源节点 ID。
      - `target` (string): 目标节点 ID。
      - `type` (string): 关系类型（如 `belongs_to`、`has_tag`）。
