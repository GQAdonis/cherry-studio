import pdfParse from 'pdf-parse'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { extractPdfText } from '../utils/pdf'

vi.mock('pdf-parse', () => ({
  default: vi.fn()
}))

const mockPdfParse = vi.mocked(pdfParse)

describe('extractPdfText', () => {
  beforeEach(() => {
    mockPdfParse.mockResolvedValue({
      text: 'Hello World',
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: '1.x'
    } as any)
  })

  it('should extract text from a base64-encoded PDF', async () => {
    const text = await extractPdfText('JVBERi0xLjA=')
    expect(text).toBe('Hello World')
    expect(mockPdfParse).toHaveBeenCalledWith(expect.any(Buffer))
  })

  it('should extract text from a Uint8Array PDF', async () => {
    const buffer = new Uint8Array([37, 80, 68, 70])
    const text = await extractPdfText(buffer)
    expect(text).toBe('Hello World')
    expect(mockPdfParse).toHaveBeenCalledWith(expect.any(Buffer))
  })

  it('should extract text from an ArrayBuffer PDF', async () => {
    const buffer = new Uint8Array([37, 80, 68, 70]).buffer
    const text = await extractPdfText(buffer)
    expect(text).toBe('Hello World')
    expect(mockPdfParse).toHaveBeenCalledWith(expect.any(Buffer))
  })

  it('should throw on invalid PDF data (URL)', async () => {
    await expect(extractPdfText(new URL('file:///tmp/test.pdf'))).rejects.toThrow()
  })

  it('should return empty string for PDF with no text', async () => {
    mockPdfParse.mockResolvedValue({
      text: '',
      numpages: 1,
      numrender: 0,
      info: {},
      metadata: null,
      version: '1.x'
    } as any)
    const text = await extractPdfText('JVBERi0xLjA=')
    expect(text).toBe('')
  })
})
