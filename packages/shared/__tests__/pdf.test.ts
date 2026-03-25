import { PDFParse } from 'pdf-parse'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { extractPdfText } from '../utils/pdf'

const mockGetText = vi.fn()

vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn().mockImplementation(() => ({
    getText: mockGetText
  }))
}))

describe('extractPdfText', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetText.mockResolvedValue({ text: 'Hello World', pages: [], total: 1 })
  })

  it('should extract text from a base64-encoded PDF', async () => {
    const text = await extractPdfText('JVBERi0xLjA=')
    expect(text).toBe('Hello World')
    expect(PDFParse).toHaveBeenCalledWith({ data: expect.any(Uint8Array) })
  })

  it('should extract text from a Uint8Array PDF', async () => {
    const buffer = new Uint8Array([37, 80, 68, 70])
    const text = await extractPdfText(buffer)
    expect(text).toBe('Hello World')
    expect(PDFParse).toHaveBeenCalledWith({ data: expect.any(Uint8Array) })
  })

  it('should extract text from an ArrayBuffer PDF', async () => {
    const buffer = new Uint8Array([37, 80, 68, 70]).buffer
    const text = await extractPdfText(buffer)
    expect(text).toBe('Hello World')
    expect(PDFParse).toHaveBeenCalledWith({ data: expect.any(Uint8Array) })
  })

  it('should throw on invalid PDF data (URL)', async () => {
    await expect(extractPdfText(new URL('file:///tmp/test.pdf'))).rejects.toThrow()
  })

  it('should return empty string for PDF with no text', async () => {
    mockGetText.mockResolvedValue({ text: '', pages: [], total: 1 })
    const text = await extractPdfText('JVBERi0xLjA=')
    expect(text).toBe('')
  })
})
