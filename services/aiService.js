const crypto = require('crypto')
const Document = require('../models/Document')
const Index = require('../models/Index')

/**
 * 生成一个简单的“伪向量”，用于占位实现。
 * 真正接入 OpenAI / 本地向量模型时，可替换为真实 embedding。
 */
function fakeEmbed(text) {
  const hash = crypto.createHash('sha256').update(text || '').digest()
  // 将前 64 字节映射为 32 维向量
  const dim = 32
  const vector = []
  for (let i = 0; i < dim; i++) {
    vector.push(hash[i] / 255)
  }
  return vector
}

/**
 * 为单篇文档构建或更新向量索引
 */
async function upsertDocumentIndex(doc) {
  const vector = fakeEmbed(`${doc.title}\n${doc.content}`)

  const payload = {
    documentId: doc._id,
    vector,
    metadata: {
      title: doc.title,
      tags: doc.tags || [],
      category: doc.category || '未分类',
      userId: doc.author_id,
    },
    updatedAt: new Date(),
  }

  const existing = await Index.findOne({ documentId: doc._id })
  if (existing) {
    existing.vector = payload.vector
    existing.metadata = payload.metadata
    existing.updatedAt = payload.updatedAt
    await existing.save()
    return existing
  }

  const index = new Index(payload)
  await index.save()
  return index
}

/**
 * 基于“伪向量”进行相似度检索。
 * 这里使用最简单的点积近似，相当于一个可替换的占位实现。
 */
async function semanticSearch({ userId, query, topK = 5 }) {
  const queryVector = fakeEmbed(query)

  const indexes = await Index.find({ 'metadata.userId': userId })

  const scored = indexes
    .map((idx) => {
      const v = idx.vector || []
      let score = 0
      const len = Math.min(v.length, queryVector.length)
      for (let i = 0; i < len; i++) {
        score += v[i] * queryVector[i]
      }
      return { index: idx, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  const documentIds = scored.map((s) => s.index.documentId)
  const documents = await Document.find({ _id: { $in: documentIds } })

  // 简单生成一个“答案”占位：取得分最高文档的前几百字
  let answer = ''
  if (documents.length > 0) {
    const topDoc = documents[0]
    const snippet = (topDoc.content || '').slice(0, 300)
    answer = `根据你的问题，系统在知识库中找到了一篇相关文档《${topDoc.title}》，其内容片段如下：\n\n${snippet}...`
  }

  return {
    results: scored.map((s) => ({
      documentId: s.index.documentId,
      score: s.score,
      metadata: s.index.metadata,
    })),
    answer,
  }
}

module.exports = {
  upsertDocumentIndex,
  semanticSearch,
}

