/**
 * LocalEncryptor - SIKAD v4.0
 * Persistent local database encryption helper using AES-GCM (Web Crypto API)
 */

export class LocalEncryptor {
  private static KEY_ALIAS = 'sikad-local-key';

  /**
   * Lazy load and import a persistent symmetric key.
   * Generates a random key if none exists.
   */
  private static async getCryptoKey(): Promise<CryptoKey> {
    let rawKey = localStorage.getItem(this.KEY_ALIAS);
    if (!rawKey) {
      const keyBuf = crypto.getRandomValues(new Uint8Array(32)); // 256-bit key
      rawKey = Array.from(keyBuf)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      localStorage.setItem(this.KEY_ALIAS, rawKey);
    }

    const matches = rawKey.match(/.{1,2}/g);
    if (!matches) {
      throw new Error('Invalid encryption key stored in local storage');
    }

    const keyBuf = new Uint8Array(matches.map((byte) => parseInt(byte, 16)));

    return await crypto.subtle.importKey(
      'raw',
      keyBuf,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt arbitrary payload to a hex-encoded string containing IV and Ciphertext
   */
  static async encrypt(data: unknown): Promise<string> {
    try {
      const key = await this.getCryptoKey();
      const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM standard IV
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(JSON.stringify(data));

      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        key,
        encodedData
      );

      const ivHex = Array.from(iv)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const ctHex = Array.from(new Uint8Array(encrypted))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      return `${ivHex}:${ctHex}`;
    } catch (error) {
      console.error('[LocalEncryptor] Encryption failed:', error);
      throw new Error('Local encryption failed');
    }
  }

  /**
   * Decrypt hex-encoded string back to typed payload
   */
  static async decrypt<T = unknown>(encryptedStr: string): Promise<T> {
    try {
      const [ivHex, ctHex] = encryptedStr.split(':');
      if (!ivHex || !ctHex) {
        throw new Error('Invalid encrypted payload format');
      }

      const key = await this.getCryptoKey();

      const ivMatches = ivHex.match(/.{1,2}/g);
      const ctMatches = ctHex.match(/.{1,2}/g);
      if (!ivMatches || !ctMatches) {
        throw new Error('Malformed IV or ciphertext hex string');
      }

      const iv = new Uint8Array(ivMatches.map((byte) => parseInt(byte, 16)));
      const ct = new Uint8Array(ctMatches.map((byte) => parseInt(byte, 16)));

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        key,
        ct
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decrypted)) as T;
    } catch (error) {
      console.error('[LocalEncryptor] Decryption failed:', error);
      throw new Error('Local decryption failed');
    }
  }
}
