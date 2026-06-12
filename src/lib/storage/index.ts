/**
 * In-memory file handling — no files are persisted to disk or cloud storage.
 * Files are processed as they come in and held in memory only for the
 * duration of the request (e.g., to forward to the LinkedIn API).
 */

export interface UploadResult {
  fileName: string
  originalName: string
  mimeType: string
  size: number
  /** Base64-encoded file data, held in memory only — never written to disk */
  data: string
}

/**
 * Process a File/Blob from a multipart form upload into an UploadResult.
 * Nothing is written to disk or any external storage.
 */
export async function processUpload(file: File): Promise<UploadResult> {
  const buffer = await file.arrayBuffer()
  const data = Buffer.from(buffer).toString('base64')
  return {
    fileName: crypto.randomUUID() + getExt(file.name),
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    data,
  }
}

/**
 * Convert a base64 data string back to a Buffer for downstream use (e.g., LinkedIn API).
 */
export function toBuffer(uploadResult: UploadResult): Buffer {
  return Buffer.from(uploadResult.data, 'base64')
}

function getExt(filename: string): string {
  const i = filename.lastIndexOf('.')
  return i >= 0 ? filename.slice(i) : ''
}
