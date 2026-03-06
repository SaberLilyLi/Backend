## 2026-03-05

- **认证与用户资料**
  - 新增头像上传能力：`POST /auth/register` 支持可选 `avatar` 文件字段，限制 2MB、JPG/PNG/WebP。
  - 新增用户资料修改接口：`PUT /auth/profile`，支持修改密码与头像。
  - `User` 模型增加 `avatarUrl` 和 `role` 字段，JWT 中携带 `role`，后续支持管理员能力。

- **应用框架与版本管理**
  - 引入 `config/config.js`，统一管理 `env/port/apiPrefix/apiVersion/apiStage/jwt` 等配置。
  - 拆分 `app.js` 与 `server.js`，`app.js` 负责应用实例与路由挂载；`server.js` 仅负责启动。
  - API 前缀支持 `/api/{stage?}/{version?}`，当前版本为 v1，同时为当前版本开放不带版本的兼容前缀。

- **文档管理与查询**
  - 新增 `POST /documents/query`，支持通过 JSON Body 传入 `keyword/category/tags/page/limit/sortBy/order` 等复杂查询条件。
  - 升级 `getDocuments` 控制器，统一支持 `GET /documents` 和 `POST /documents/query` 两种调用方式。
  - `Document` 模型新增权限相关字段：`visibility/publicFrom/publicTo/publicBlocked/publicBlockedAt/publicBlockedBy`。
  - 新增 `PUT /documents/:id/visibility` 接口，作者或管理员可设置文档公开范围和时间窗口。
  - 新增 `UserDocumentMeta` 模型，记录用户与文档的收藏、归档、最近访问时间等元数据。
  - 新增 `POST /documents/:id/favorite` 与 `POST /documents/:id/archive` 接口，支持“收藏 / 已归档”视图。
  - 文档列表查询响应中增加 `uploader` 字段，包含上传用户的 `username/email/avatarUrl` 信息，便于前端展示。

- **AI 搜索与统计**
  - 引入 `SearchLog` 模型，每次调用 `POST /search` 时记录用户搜索行为。
  - 新增统计接口 `GET /analytics/user-summary`，返回当前用户的文档/笔记数量以及最近 3/7/30 天的文档变更次数与搜索次数。

- **文档与需求**
  - 重构 `API_DOCUMENTATION.md`，按“用户认证 / 知识库主页 / 上传 / 详情 & 版本 / 标签与分类 / 统计与图谱”模块组织接口，移除重复定义。
  - 升级 `PROJECT_REQUIREMENTS.md` 至企业级版本，补充数据模型（User/Document/SearchLog 权限与字段）、统计需求和非功能要求。

- **文档共享与定向公开**
  - 新增 `DocumentShare` 模型，支持记录“文档对指定用户的共享关系”和共享过期时间。
  - 新增 `POST /documents/:id/share-with-users` 接口，作者或管理员可在最多 30 天内对指定用户开放访问权限，超过 30 天自动限制为 30 天。
  - 在文档访问权限校验中增加对 `DocumentShare` 的检查：不满足作者/管理员或全局公开条件时，会判断是否存在未过期的定向共享记录。

- **文件描述与编辑行为调整**
  - `Document` 模型新增 `description` 字段，用于文件描述 / 备注，仅用于展示说明。
  - 上传与创建接口（`POST /documents/upload`、`POST /documents`）支持可选 `description` 字段，并在 `API_DOCUMENTATION.md` 中补充参数说明。
  - 详情接口 `GET /documents/:id` 的响应中增加 `description` 字段，供预览/编辑状态展示文件备注。
  - 调整 `POST /documents/:id/save` 语义与实现：仅允许编辑并保存文档描述（备注），不再修改原有文件内容、标签、分类等字段；对应说明已同步更新至 `API_DOCUMENTATION.md` 与 `PROJECT_REQUIREMENTS.md`。

- **角色与权限管理**
  - 扩展 `User` 模型角色枚举为 `viewer/user/admin`，默认角色为 `user`。
  - 新增通用中间件 `requireRole`，用于在路由层按角色控制访问权限；`adminOnly` 基于 `requireRole(['admin'])` 封装。
  - 对文档、笔记、标签、分类等写操作路由增加角色限制：仅 `user` 和 `admin` 可以创建/编辑/删除，`viewer` 仅能调用只读接口。
  - 新增 `RoleRequest` 模型，用于记录权限申请（例如 viewer 申请升级为 user），包含申请人、目标角色、原因、状态、审批人及审批备注等信息。
  - 新增权限申请与审批接口：
    - `POST /auth/role-requests`：viewer 提交权限申请，当前仅支持申请升级为 `user`，避免重复 pending 申请。
    - `POST /auth/role-requests/query`：管理员按条件（状态等）查询权限申请列表。
    - `POST /auth/role-requests/:id/approve`：管理员同意申请，更新申请状态并将用户角色调整为目标角色。
    - `POST /auth/role-requests/:id/reject`：管理员拒绝申请，仅更新申请状态与审批备注。
  - 将上述角色策略与申请审批流程同步更新至 `API_DOCUMENTATION.md` 与 `PROJECT_REQUIREMENTS.md` 中的相关章节。

- **viewer 预览与配额规则（权限细化）**
  - 定义三种角色：`admin`、`user`、`viewer`。`user` 拥有正常业务功能（文档/笔记 CRUD、预览、导出等）；`viewer` 仅支持查看列表和有限预览，不具备任何写操作权限。
  - viewer 预览规则：
    - viewer 默认按“每日可预览文件数”进行限制（可在用户维度配置，默认值由 admin 决定）。
    - 单个文档在 24 小时内的首次成功预览记作 1 次，当天后续再次打开同一文档不再额外计数，仅记录首次预览时间。
    - viewer 每次成功预览（按上述 24 小时规则计数）都会在预览日志中写入一条记录（包含 viewer、文档、首次预览时间、配额来源等）。
  - viewer 申请新增预览次数：
    - 当某天可预览文件数用尽时，viewer 无法再预览新的文档，只能发起“申请新增预览次数”的请求。
    - 每次申请都会生成一条申请记录，记录目标额外配额、生效时间窗口、当前状态等信息；24 小时内未被管理员处理则自动标记为“超时自动拒绝”（带特殊标识）。
    - 管理员同意申请时可设置：生效时间（默认 24 小时，可配置为多天）和本次生效的额外可预览文件数；在该生效窗口内 viewer 不能再次发起新的配额申请。
    - 生效时间结束后自动进入 12 小时冷静期，在冷静期内 viewer 不能再次申请，管理员可手动提前结束或延长冷静期。
  - 管理员管理能力：
    - 可查看所有 user 与 viewer 的信息：
      - 对 user：可浏览其文档提交/修改记录表，并支持按记录下载相应文件版本。
      - 对 viewer：可查看其预览行为日志、申请新增预览次数的历史记录、当前生效配额与冷静期状态。
    - 可在“修改 viewer 信息”时长期调整该 viewer 的默认每日可预览文件数（例如从 10 调整为 20），并可在需要时将 viewer 提升为 user（临时或永久）。
    - 以上规则的详细需求说明与接口设计已同步更新到 `PROJECT_REQUIREMENTS.md` 与 `API_DOCUMENTATION.md`，用于前后端对接参考。

