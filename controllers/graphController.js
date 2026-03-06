const Document = require('../models/Document')
const sendResponse = require('../utils/response')

// @route   GET /api/graph
// @desc    知识图谱数据（节点 + 关系），当前为基于标签/分类的占位实现
// @access  Private
exports.getKnowledgeGraph = async (req, res) => {
  const userId = req.user.id
  const isAdmin = req.user.role === 'admin'

  try {
    const docQuery = isAdmin ? {} : { author_id: userId }
    const docs = await Document.find(docQuery).select(
      'title tags category',
    )

    const nodes = []
    const edges = []
    const nodeIndex = new Map()

    const ensureNode = (id, label, type) => {
      if (!nodeIndex.has(id)) {
        const node = { id, label, type }
        nodeIndex.set(id, node)
        nodes.push(node)
      }
      return nodeIndex.get(id)
    }

    docs.forEach((doc) => {
      const docId = `doc:${doc._id.toString()}`
      ensureNode(docId, doc.title, 'document')

      if (doc.category) {
        const catId = `cat:${doc.category}`
        ensureNode(catId, doc.category, 'category')
        edges.push({
          source: docId,
          target: catId,
          type: 'belongs_to',
        })
      }

      if (Array.isArray(doc.tags)) {
        doc.tags.forEach((tag) => {
          const tagId = `tag:${tag}`
          ensureNode(tagId, tag, 'tag')
          edges.push({
            source: docId,
            target: tagId,
            type: 'has_tag',
          })
        })
      }
    })

    return sendResponse(res, {
      message: '知识图谱数据获取成功',
      data: {
        nodes,
        edges,
      },
    })
  } catch (err) {
    console.error('[GRAPH_ERROR]', err)
    return sendResponse(res, {
      success: false,
      code: 50000,
      message: '服务器错误',
    })
  }
}

