import type { MCPTool } from '@renderer/types'

export const unstructuredTool: MCPTool = {
  id: 'builtin-unstructured',
  serverId: 'builtin',
  serverName: 'Built-in Tools',
  name: 'process_document_with_unstructured',
  description:
    'Extract and process content from various document formats including PDF, Word, Excel, PowerPoint, images (with OCR), HTML, and more using Unstructured.io. Returns structured text content that can be analyzed, summarized, or used for further processing. Supports complex documents with tables, images, and multi-column layouts.',
  isBuiltIn: true,
  type: 'mcp',
  inputSchema: {
    type: 'object',
    title: 'Unstructured Document Processing',
    description: 'Process and extract content from documents using Unstructured.io',
    required: ['file_path'],
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute path to the document file to process (e.g., /path/to/document.pdf)'
      },
      strategy: {
        type: 'string',
        enum: ['auto', 'fast', 'hi_res', 'ocr_only'],
        description:
          'Processing strategy: auto (automatic detection, default), fast (quick processing), hi_res (best quality for complex documents), ocr_only (text extraction from images)',
        default: 'auto'
      },
      chunking_strategy: {
        type: 'string',
        enum: ['basic', 'by_title'],
        description:
          'How to chunk the document: basic (simple text chunking) or by_title (semantic chunking by document structure, default)',
        default: 'by_title'
      }
    }
  }
}
