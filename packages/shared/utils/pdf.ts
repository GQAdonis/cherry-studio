import pdfParse from 'pdf-parse'

/**
 * Extract text content from PDF data.
 * Works in Node.js environment via pdf-parse 2.x default function export.
 *
 * @param data - PDF content as Uint8Array, ArrayBuffer, or base64-encoded string
 * @returns Extracted text content
 */
export async function extractPdfText(data: Uint8Array | ArrayBuffer | string | URL): Promise<string> {
  let buffer: Buffer

  if (data instanceof URL) {
    throw new Error('URL-based PDF extraction is not supported in this environment')
  } else if (typeof data === 'string') {
    // base64 string → Buffer
    buffer = Buffer.from(data, 'base64')
  } else if (data instanceof ArrayBuffer) {
    buffer = Buffer.from(data)
  } else {
    buffer = Buffer.from(data)
  }

  const result = await pdfParse(buffer)
  return result.text
}
