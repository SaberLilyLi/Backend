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

