const PBKDF2_ITERATIONS = 310_000
const SALT_LENGTH = 16
const IV_LENGTH = 12

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encrypt(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(passphrase, salt)
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, SALT_LENGTH)
  combined.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH)

  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(ciphertextB64: string, passphrase: string): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0))
  const salt = combined.slice(0, SALT_LENGTH)
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH)

  const key = await deriveKey(passphrase, salt)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}

export async function testPassphrase(passphrase: string): Promise<boolean> {
  try {
    const test = await encrypt('probe', passphrase)
    const result = await decrypt(test, passphrase)
    return result === 'probe'
  } catch {
    return false
  }
}
