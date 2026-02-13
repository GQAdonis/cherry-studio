/**
 * Cosine similarity and vector utility functions for skill matching.
 */

/**
 * Compute the cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical direction).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`)
  }
  if (a.length === 0) return 0

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  if (denom === 0) return 0

  return dot / denom
}

/**
 * Compute the mean (centroid) of a set of vectors.
 */
export function meanVector(vectors: number[][]): number[] {
  if (vectors.length === 0) return []
  const dim = vectors[0].length
  const result = new Array<number>(dim).fill(0)

  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      result[i] += vec[i]
    }
  }

  const n = vectors.length
  for (let i = 0; i < dim; i++) {
    result[i] /= n
  }

  return result
}

/**
 * L2-normalize a vector in-place (unit vector).
 */
export function normalizeVector(vec: number[]): number[] {
  let norm = 0
  for (const v of vec) {
    norm += v * v
  }
  norm = Math.sqrt(norm)
  if (norm === 0) return vec

  return vec.map((v) => v / norm)
}

/**
 * Find the top-K items from an array sorted by a scoring function.
 * Returns results sorted descending by score.
 */
export function topK<T>(items: T[], scoreFn: (item: T) => number, k: number): { item: T; score: number }[] {
  const scored = items.map((item) => ({ item, score: scoreFn(item) }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, k)
}

/**
 * Compute the maximum cosine similarity between a query vector and a set of
 * candidate vectors. Used when a skill has multiple example utterance embeddings.
 */
export function maxSimilarity(query: number[], candidates: number[][]): number {
  if (candidates.length === 0) return 0
  let max = -Infinity
  for (const candidate of candidates) {
    const sim = cosineSimilarity(query, candidate)
    if (sim > max) max = sim
  }
  return max
}

/**
 * Compute the average cosine similarity between a query vector and a set of
 * candidate vectors.
 */
export function avgSimilarity(query: number[], candidates: number[][]): number {
  if (candidates.length === 0) return 0
  let sum = 0
  for (const candidate of candidates) {
    sum += cosineSimilarity(query, candidate)
  }
  return sum / candidates.length
}
