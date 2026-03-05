## 智能个人知识库助手 API 文档（根据页面需求版）

本文档基于当前的产品需求（知识库主页、文档上传界面、文档详情界面）梳理后端接口，仅描述接口设计，不完全等同于当前代码实现，后续可以按本规范补齐/调整后端。

统一约定：
- **认证方式**：除标注为公开接口外，其他接口均需要在请求头中携带 `Authorization: Bearer <token>`。
- **HTTP 方法约定（偏企业级风格）**：
  - `GET`：仅用于**简单读取**，且参数极少的接口（例如：获取单条详情 `GET /resource/:id`）。
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

## 一、用户认证接口（简要）

### POST /api/auth/register

- **描述**：注册新用户。
- **权限**：公开
- **请求体（JSON）**：
  - `email` (string, 必填)：邮箱。
  - `username` (string, 必填)：用户名。
  - `password` (string, 必填)：密码。
- **响应**：
  - **data**：
    - `_id`：用户 ID。
    - `email`：邮箱。
    - `username`：用户名。
    - `token`：JWT 令牌。

### POST /api/auth/login

- **描述**：用户登录。
- **权限**：公开
- **请求体（JSON）**：
  - `email` (string, 必填)
  - `password` (string, 必填)
- **响应**：
  - **data**：
    - `_id`、`email`、`username`、`token` 同上。

---

## 二、知识库主页相关接口

对应页面：「知识库主页」
- 顶部：语义搜索、上传文档、新建文件夹、导出数据。
- 左侧：文件夹树、标签云。
- 中间：文档列表（卡片/列表视图切换）。
- 右侧：文档预览（点击文档时拉取）。

### 1. 文档列表查询

#### POST /api/documents/query

- **描述**：获取当前用户的文档列表，支持搜索、标签、文件夹（分类）、排序和分页。采用 POST + JSON Body 的方式承载查询条件，避免在 GET Query 中堆积复杂参数。
- **权限**：登录用户
- **请求体（JSON）**：
  - `keyword` (string, 可选)：普通关键字搜索（标题、内容内搜索，简单匹配）。
  - `category` (string, 可选)：分类/文件夹标识（如分类名称或 ID）。
  - `tags` (array<string>, 可选)：标签过滤，例如 `["AI","前端"]`。
  - `sortBy` (string, 可选)：排序字段，默认 `created_at`，可选 `updated_at`、`title` 等。
  - `order` (string, 可选)：排序方向，`asc` 或 `desc`，默认 `desc`。
  - `page` (number, 可选)：页码，默认 1。
  - `limit` (number, 可选)：每页条数，默认 20。
- **响应**：
  - **data**：
    - `documents` (array)：文档列表，单项字段建议：
      - `_id`
      - `title`
      - `excerpt`：内容摘要（后端可在返回时截断 content）。
      - `tags`：标签数组。
      - `category`：分类。
      - `updated_at`：最后修改时间。
      - `size`：文档大小（可选，字节数或估算）。
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
  - `sourceFileId` (string, 可选)：若有文件存储，可关联上传的原始文件 ID。
- **响应**：
  - **data**：创建后的完整文档对象。

### 3. 更新文档（编辑模式点击“保存”）

#### PUT /api/documents/:id

- **描述**：更新文档内容和元数据。
- **权限**：登录用户
- **请求体（JSON）**：
  - `title` (string, 可选)
  - `content` (string, 可选)
  - `content_type` (string, 可选)
  - `category` (string, 可选)
  - `tags` (array<string>, 可选)
- **响应**：
  - **data**：更新后的文档对象。

---

## 四、文档详情界面相关接口

对应页面：「文档详情界面」
- 标题栏：标题、保存、分享、导出、历史版本。
- 内容区域：Markdown 编辑 / 预览。
- 元数据区域：标签、分类、最后修改时间、文档大小。
- 版本历史：时间线 + 恢复。

### 1. 获取文档详情（点击文档标题或列表卡片）

#### GET /api/documents/:id

- **描述**：获取单个文档的完整信息，用于详情页展示和右侧预览。
- **权限**：登录用户
- **响应**：
  - **data**：
    - `_id`
    - `title`
    - `content`
    - `content_type`
    - `tags`
    - `category`
    - `created_at`
    - `updated_at`
    - `size`（可选）

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

## 五、标签与分类基础管理接口（供多个页面复用）

### 1. 标签管理

#### GET /api/tags

- **描述**：获取当前用户的全部标签列表。
- **权限**：登录用户
- **响应**：
  - **data**：
    - `tags` (array)：标签数组，每项至少包含：
      - `_id`
      - `name`
      - `color`（可选）

#### POST /api/tags

- **描述**：创建标签。
- **权限**：登录用户
- **请求体（JSON）**：
  - `name` (string, 必填)
  - `color` (string, 可选)

#### PUT /api/tags/:id

- **描述**：更新标签名称或颜色。

#### DELETE /api/tags/:id

- **描述**：删除标签。

### 2. 分类/文件夹管理

#### GET /api/categories

- **描述**：获取扁平的分类列表（可与 `/api/categories/tree` 结合使用）。

#### 其他

- 创建/更新/删除分类接口与前面“新建文件夹”部分的 `/api/categories`、`PUT /api/categories/:id`、`DELETE /api/categories/:id` 一致，此处不再赘述。

---

以上是根据你给出的三个核心界面（知识库主页、文档上传界面、文档详情界面）抽象出的接口设计。后续你给出具体的交互图后，可以在此基础上进一步补充字段或拆分/合并部分接口。+
# API 文档

## 用户认证接口

### POST /api/auth/register

- **描述**: 注册新用户。
- **访问权限**: 公共接口
- **请求参数**:
  - `email` (string, 必填): 用户的邮箱地址。
  - `username` (string, 必填): 用户名，至少 3 个字符。
  - `password` (string, 必填): 密码，至少 6 个字符。
- **响应**:
  - 成功: 返回用户信息和 JWT 令牌。
  - 失败: 返回错误信息。

### POST /api/auth/login

- **描述**: 用户登录。
- **访问权限**: 公共接口
- **请求参数**:
  - `email` (string, 必填): 用户的邮箱地址。
  - `password` (string, 必填): 用户的密码。
- **响应**:
  - 成功: 返回用户信息和 JWT 令牌。
  - 失败: 返回错误信息。

### POST /api/auth/logout

- **描述**: 用户登出。
- **访问权限**: 私有接口
- **响应**:
  - 成功: 返回登出成功信息。
  - 失败: 返回错误信息。

---

## 文档管理接口

### POST /api/documents

- **描述**: 创建新文档。
- **访问权限**: 私有接口
- **请求参数**:
  - `title` (string, 必填): 文档标题。
  - `content` (string, 必填): 文档内容。
  - `content_type` (string, 可选): 文档类型。
  - `category` (string, 可选): 文档分类。
  - `tags` (array, 可选): 文档标签。
- **响应**:
  - 成功: 返回创建的文档信息。
  - 失败: 返回错误信息。

### GET /api/documents

- **描述**: 获取所有文档。
- **访问权限**: 私有接口
- **请求参数**:
  - `category` (string, 可选): 分类过滤。
  - `tags` (array, 可选): 标签过滤。
  - `limit` (number, 可选): 每页文档数量，默认 20。
  - `page` (number, 可选): 页码，默认 1。
- **响应**:
  - 成功: 返回文档列表。
  - 失败: 返回错误信息。

### GET /api/documents/:id

- **描述**: 根据 ID 获取文档。
- **访问权限**: 私有接口
- **响应**:
  - 成功: 返回文档信息。
  - 失败: 返回错误信息。

### PUT /api/documents/:id

- **描述**: 更新文档。
- **访问权限**: 私有接口
- **请求参数**:
  - `title` (string, 可选): 文档标题。
  - `content` (string, 可选): 文档内容。
  - `content_type` (string, 可选): 文档类型。
  - `category` (string, 可选): 文档分类。
  - `tags` (array, 可选): 文档标签。
- **响应**:
  - 成功: 返回更新后的文档信息。
  - 失败: 返回错误信息。

### DELETE /api/documents/:id

- **描述**: 删除文档。
- **访问权限**: 私有接口
- **响应**:
  - 成功: 返回删除成功信息。
  - 失败: 返回错误信息。

---

## 笔记管理接口

### POST /api/notes

- **描述**: 创建新笔记。
- **访问权限**: 私有接口
- **请求参数**:
  - `title` (string, 必填): 笔记标题。
  - `content` (string, 必填): 笔记内容。
  - `content_type` (string, 可选): 内容类型。
  - `category` (string, 可选): 分类。
  - `tags` (array, 可选): 标签。
  - `priority` (string, 可选): 优先级。
- **响应**:
  - 成功: 返回创建的笔记信息。
  - 失败: 返回错误信息。

### GET /api/notes

- **描述**: 获取所有笔记。
- **访问权限**: 私有接口
- **请求参数**:
  - `category` (string, 可选): 分类过滤。
  - `tags` (array, 可选): 标签过滤。
  - `priority` (string, 可选): 优先级过滤。
  - `limit` (number, 可选): 每页数量，默认 20。
  - `page` (number, 可选): 页码，默认 1。
- **响应**:
  - 成功: 返回笔记列表及分页信息。
  - 失败: 返回错误信息。

### PUT /api/notes/:id

- **描述**: 更新笔记。
- **访问权限**: 私有接口
- **请求参数**:
  - `title` (string, 可选): 笔记标题。
  - `content` (string, 可选): 笔记内容。
  - `priority` (string, 可选): 优先级。
- **响应**:
  - 成功: 返回更新后的笔记信息。
  - 失败: 返回错误信息。

### DELETE /api/notes/:id

- **描述**: 删除笔记。
- **访问权限**: 私有接口
- **响应**:
  - 成功: 返回删除成功信息。
  - 失败: 返回错误信息。

---

## 标签管理接口

### POST /api/tags

- **描述**: 创建新标签。
- **访问权限**: 私有接口
- **请求参数**:
  - `name` (string, 必填): 标签名称。
  - `color` (string, 可选): 标签颜色。
- **响应**:
  - 成功: 返回创建的标签信息。
  - 失败: 返回错误信息。

### GET /api/tags

- **描述**: 获取当前用户所有标签。
- **访问权限**: 私有接口
- **响应**:
  - 成功: 返回标签列表。
  - 失败: 返回错误信息。

### PUT /api/tags/:id

- **描述**: 更新标签。
- **访问权限**: 私有接口
- **请求参数**:
  - `name` (string, 可选): 标签名称。
  - `color` (string, 可选): 标签颜色。
- **响应**:
  - 成功: 返回更新后的标签信息。
  - 失败: 返回错误信息。

### DELETE /api/tags/:id

- **描述**: 删除标签。
- **访问权限**: 私有接口
- **响应**:
  - 成功: 返回删除成功信息。
  - 失败: 返回错误信息。

---

## 分类管理接口

### POST /api/categories

- **描述**: 创建新分类。
- **访问权限**: 私有接口
- **请求参数**:
  - `name` (string, 必填): 分类名称。
  - `slug` (string, 必填): 唯一标识（URL 友好）。
  - `description` (string, 可选): 描述。
  - `icon` (string, 可选): 图标。
  - `color` (string, 可选): 颜色。
- **响应**:
  - 成功: 返回创建的分类信息。
  - 失败: 返回错误信息。

### GET /api/categories

- **描述**: 获取当前用户所有分类。
- **访问权限**: 私有接口
- **响应**:
  - 成功: 返回分类列表。
  - 失败: 返回错误信息。

### PUT /api/categories/:id

- **描述**: 更新分类。
- **访问权限**: 私有接口
- **请求参数**:
  - `name` (string, 可选): 分类名称。
  - `description` (string, 可选): 描述。
- **响应**:
  - 成功: 返回更新后的分类信息。
  - 失败: 返回错误信息。

### DELETE /api/categories/:id

- **描述**: 删除分类。
- **访问权限**: 私有接口
- **响应**:
  - 成功: 返回删除成功信息。
  - 失败: 返回错误信息。

---

## 语义搜索与智能问答接口

### POST /api/search

- **描述**: 基于用户知识库进行语义搜索和智能问答（当前为占位 RAG 实现，可后续接入 OpenAI / 本地模型）。
- **访问权限**: 私有接口
- **请求参数**:
  - `query` (string, 必填): 自然语言查询。
  - `topK` (number, 可选): 返回相关结果数量，默认 5，最大 20。
- **响应**:
  - 成功:
    - `query`: 原始查询。
    - `answer`: 基于最高相似度文档生成的答案片段。
    - `results`: 相似文档列表，每项包含：
      - `documentId`: 文档 ID。
      - `score`: 相似度得分。
      - `metadata`: 文档元数据（标题、标签、分类等）。
  - 失败: 返回错误信息。

---

## 数据统计与可视化接口

### GET /api/analytics/overview

- **描述**: 获取当前用户知识库概览统计数据。
- **访问权限**: 私有接口
- **响应**:
  - 成功: 返回对象：
    - `documents` (number): 文档总数。
    - `notes` (number): 笔记总数。
  - 失败: 返回错误信息。

### GET /api/analytics/trends

- **描述**: 获取按日期聚合的文档/笔记创建趋势数据，可用于折线图展示。
- **访问权限**: 私有接口
- **响应**:
  - 成功: 返回数组，每项包含：
    - `date` (string): 日期（YYYY-MM-DD）。
    - `documents` (number): 当日创建的文档数量。
    - `notes` (number): 当日创建的笔记数量。
  - 失败: 返回错误信息。

---

## 知识图谱接口

### GET /api/graph

- **描述**: 获取知识图谱数据（节点 + 关系），当前基于文档、标签、分类自动构造，可直接用于 ECharts / AntV G6 等前端可视化组件。
- **访问权限**: 私有接口
- **响应**:
  - 成功: 返回对象：
    - `nodes` (array): 节点列表，每项包含：
      - `id` (string): 节点唯一 ID（如 `doc:xxx`、`tag:xxx`、`cat:xxx`）。
      - `label` (string): 节点展示名称。
      - `type` (string): 节点类型（`document` | `tag` | `category`）。
    - `edges` (array): 边列表，每项包含：
      - `source` (string): 源节点 ID。
      - `target` (string): 目标节点 ID。
      - `type` (string): 关系类型（如 `belongs_to`、`has_tag`）。
  - 失败: 返回错误信息。
