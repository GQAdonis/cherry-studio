export interface MimeTypeInfo {
  type: string
  label: string
  category: 'document' | 'spreadsheet' | 'presentation' | 'image' | 'web' | 'text' | 'other'
  extensions: string[]
}

export const UNSTRUCTURED_SUPPORTED_MIME_TYPES: MimeTypeInfo[] = [
  // Documents
  { type: 'application/pdf', label: 'PDF', category: 'document', extensions: ['.pdf'] },
  { type: 'application/msword', label: 'Word (DOC)', category: 'document', extensions: ['.doc'] },
  {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Word (DOCX)',
    category: 'document',
    extensions: ['.docx']
  },
  { type: 'application/rtf', label: 'Rich Text Format', category: 'document', extensions: ['.rtf'] },
  {
    type: 'application/vnd.oasis.opendocument.text',
    label: 'OpenDocument Text',
    category: 'document',
    extensions: ['.odt']
  },

  // Spreadsheets
  { type: 'application/vnd.ms-excel', label: 'Excel (XLS)', category: 'spreadsheet', extensions: ['.xls'] },
  {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    label: 'Excel (XLSX)',
    category: 'spreadsheet',
    extensions: ['.xlsx']
  },
  { type: 'text/csv', label: 'CSV', category: 'spreadsheet', extensions: ['.csv'] },
  {
    type: 'application/vnd.oasis.opendocument.spreadsheet',
    label: 'OpenDocument Spreadsheet',
    category: 'spreadsheet',
    extensions: ['.ods']
  },

  // Presentations
  {
    type: 'application/vnd.ms-powerpoint',
    label: 'PowerPoint (PPT)',
    category: 'presentation',
    extensions: ['.ppt']
  },
  {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    label: 'PowerPoint (PPTX)',
    category: 'presentation',
    extensions: ['.pptx']
  },
  {
    type: 'application/vnd.oasis.opendocument.presentation',
    label: 'OpenDocument Presentation',
    category: 'presentation',
    extensions: ['.odp']
  },

  // Images (with OCR)
  { type: 'image/jpeg', label: 'JPEG Image', category: 'image', extensions: ['.jpg', '.jpeg'] },
  { type: 'image/png', label: 'PNG Image', category: 'image', extensions: ['.png'] },
  { type: 'image/tiff', label: 'TIFF Image', category: 'image', extensions: ['.tif', '.tiff'] },
  { type: 'image/bmp', label: 'BMP Image', category: 'image', extensions: ['.bmp'] },
  { type: 'image/heic', label: 'HEIC Image', category: 'image', extensions: ['.heic'] },

  // Web
  { type: 'text/html', label: 'HTML', category: 'web', extensions: ['.html', '.htm'] },
  { type: 'application/xhtml+xml', label: 'XHTML', category: 'web', extensions: ['.xhtml'] },
  { type: 'application/xml', label: 'XML', category: 'web', extensions: ['.xml'] },

  // Text
  { type: 'text/plain', label: 'Plain Text', category: 'text', extensions: ['.txt'] },
  { type: 'text/markdown', label: 'Markdown', category: 'text', extensions: ['.md'] },
  { type: 'application/json', label: 'JSON', category: 'text', extensions: ['.json'] },

  // Other
  { type: 'application/epub+zip', label: 'EPUB', category: 'other', extensions: ['.epub'] },
  { type: 'message/rfc822', label: 'Email (EML)', category: 'other', extensions: ['.eml'] },
  { type: 'application/vnd.ms-outlook', label: 'Outlook Message', category: 'other', extensions: ['.msg'] }
]

export const MIME_TYPE_CATEGORIES = {
  document: 'Documents',
  spreadsheet: 'Spreadsheets',
  presentation: 'Presentations',
  image: 'Images',
  web: 'Web',
  text: 'Text',
  other: 'Other'
} as const

export type MimeTypeCategory = keyof typeof MIME_TYPE_CATEGORIES

// Helper function to get MIME types by category
export function getMimeTypesByCategory(category: MimeTypeCategory): MimeTypeInfo[] {
  return UNSTRUCTURED_SUPPORTED_MIME_TYPES.filter((m) => m.category === category)
}

// Helper function to get all MIME type strings
export function getAllMimeTypeStrings(): string[] {
  return UNSTRUCTURED_SUPPORTED_MIME_TYPES.map((m) => m.type)
}

// Helper function to get default enabled MIME types
export function getDefaultEnabledMimeTypes(): string[] {
  return [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
}
