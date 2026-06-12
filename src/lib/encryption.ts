import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const ENCODING = 'hex'

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) {
    throw new Error('ENCRYPTION_KEY is required in environment variables')
  }
  // Hash the secret to ensure it is exactly 32 bytes for AES-256
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns: iv:tag:ciphertext (all hex encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', ENCODING)
  encrypted += cipher.final(ENCODING)

  const tag = cipher.getAuthTag()
  return `${iv.toString(ENCODING)}:${tag.toString(ENCODING)}:${encrypted}`
}

/**
 * Decrypts AES-256-GCM ciphertext produced by encrypt().
 */
export function decrypt(ciphertext: string): string {
  const key = getKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format')
  }

  const [ivHex, tagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, ENCODING)
  const tag = Buffer.from(tagHex, ENCODING)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encryptedHex, ENCODING, 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Safe decrypt — returns null instead of throwing on failure
 */
export function safeDecrypt(ciphertext: string): string | null {
  try {
    return decrypt(ciphertext)
  } catch {
    return null
  }
}
