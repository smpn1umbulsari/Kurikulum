/**
 * LocalEncryptor.test - SIKAD v4.0
 * Simple unit test verifying AES-GCM local database encryption helper
 */

import { LocalEncryptor } from '../infrastructure/auth/LocalEncryptor';

export async function runLocalEncryptorTest(): Promise<boolean> {
  try {
    const payload = {
      user_id: 'test-user-id-123',
      name: 'Rian Hidayat',
      role: 'GURU',
    };

    console.log('[Test] Running LocalEncryptor tests...');
    
    // Test encryption
    const encrypted = await LocalEncryptor.encrypt(payload);
    if (!encrypted || !encrypted.includes(':')) {
      throw new Error('Encryption failed or output format is malformed');
    }
    console.log('[Test] Encryption passed. Encrypted string:', encrypted);

    // Test decryption
    const decrypted = await LocalEncryptor.decrypt<typeof payload>(encrypted);
    if (decrypted.user_id !== payload.user_id || decrypted.name !== payload.name) {
      throw new Error('Decryption passed but data content does not match original payload');
    }
    console.log('[Test] Decryption passed. Decrypted data:', decrypted);
    
    console.log('[Test] All LocalEncryptor unit tests passed! ✅');
    return true;
  } catch (error: any) {
    console.error('[Test] LocalEncryptor unit test failed: ❌', error.message);
    return false;
  }
}
