/**
 * Knowledge Bases REST API Routes
 *
 * Read-only endpoints for discovering exposed knowledge bases.
 * Data sourced from Redux state (state.knowledge.bases).
 */
import type { KnowledgeBase } from '@types'
import type { Request, Response } from 'express'
import express from 'express'

import { loggerService } from '../../services/LoggerService'
import { reduxService } from '../../services/ReduxService'

const logger = loggerService.withContext('KnowledgeBaseRoutes')

const router = express.Router()

/**
 * @swagger
 * /v1/knowledge-bases:
 *   get:
 *     summary: List exposed knowledge bases
 *     description: Retrieves all knowledge bases that are exposed via MCP
 *     tags: [Knowledge Bases]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of exposed knowledge bases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     knowledge_bases:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/KnowledgeBaseSummary'
 *                     count:
 *                       type: integer
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const bases = await reduxService.select<KnowledgeBase[]>('state.knowledge.bases')
    const exposed = (bases || []).filter((kb) => kb.exposedViaMcp === true)

    const result = exposed.map((kb) => ({
      id: kb.id,
      name: kb.name,
      description: kb.description,
      model: kb.model?.id || 'unknown',
      document_count: kb.documentCount || kb.items?.length || 0,
      dimensions: kb.dimensions,
      version: kb.version,
      created_at: kb.created_at,
      updated_at: kb.updated_at,
      mcp_endpoint: `/v1/mcp-servers/knowledge/${kb.id}`
    }))

    return res.json({
      success: true,
      data: {
        knowledge_bases: result,
        count: result.length
      }
    })
  } catch (error: any) {
    logger.error('Error listing knowledge bases', { error })
    return res.status(500).json({
      success: false,
      error: {
        message: `Failed to list knowledge bases: ${error.message}`,
        type: 'internal_error',
        code: 'kb_list_failed'
      }
    })
  }
})

/**
 * @swagger
 * /v1/knowledge-bases/{kbId}:
 *   get:
 *     summary: Get knowledge base by ID
 *     description: Retrieves a specific exposed knowledge base by its ID
 *     tags: [Knowledge Bases]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: kbId
 *         required: true
 *         schema:
 *           type: string
 *         description: Knowledge base ID
 *     responses:
 *       200:
 *         description: Knowledge base details
 *       404:
 *         description: Knowledge base not found or not exposed
 */
router.get('/:kbId', async (req: Request, res: Response) => {
  try {
    const { kbId } = req.params
    const bases = await reduxService.select<KnowledgeBase[]>('state.knowledge.bases')
    const kb = (bases || []).find((b) => b.id === kbId)

    if (!kb || !kb.exposedViaMcp) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Knowledge base not found or not exposed: ${kbId}`,
          type: 'not_found',
          code: 'kb_not_found'
        }
      })
    }

    return res.json({
      success: true,
      data: {
        id: kb.id,
        name: kb.name,
        description: kb.description,
        model: kb.model?.id || 'unknown',
        dimensions: kb.dimensions,
        chunk_size: kb.chunkSize,
        chunk_overlap: kb.chunkOverlap,
        threshold: kb.threshold,
        document_count: kb.documentCount || kb.items?.length || 0,
        version: kb.version,
        created_at: kb.created_at,
        updated_at: kb.updated_at,
        item_types: [...new Set(kb.items?.map((i) => i.type) || [])],
        mcp_endpoint: `/v1/mcp-servers/knowledge/${kb.id}`
      }
    })
  } catch (error: any) {
    logger.error('Error getting knowledge base', { error })
    return res.status(500).json({
      success: false,
      error: {
        message: `Failed to get knowledge base: ${error.message}`,
        type: 'internal_error',
        code: 'kb_get_failed'
      }
    })
  }
})

export { router as knowledgeBasesRoutes }
