import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

/**
 * SecurityEngine
 * 
 * Manages local credential encryption (AES-256-GCM) and
 * verifies shell command safety to block malicious or hazardous agent actions.
 */
export class SecurityEngine {
  constructor(projectManager) {
    this.projectManager = projectManager;
    this.credentialsPath = path.join(this.projectManager.configDir, 'credentials.enc');
  }

  /**
   * Encrypt and store a key-value credential pair
   * @param {string} keyName 
   * @param {string} plainText 
   */
  async encryptCredential(keyName, plainText) {
    this._initializeConfigDir();

    // 1. Read existing credentials map (decrypt if exists)
    let map = {};
    if (fs.existsSync(this.credentialsPath)) {
      try {
        map = await this._decryptAll();
      } catch (err) {
        // If decryption fails (e.g. wrong password changed), start fresh
        console.warn('[SecurityEngine] Warning: Decryption failed for existing file. Overwriting...');
      }
    }

    // 2. Update map
    map[keyName] = plainText;

    // 3. Encrypt map
    const masterPassword = this._getMasterPassword();
    const salt = crypto.randomBytes(16);
    
    // Derive key using PBKDF2
    const key = crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintextString = JSON.stringify(map);
    
    let ciphertext = cipher.update(plaintextString, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // 4. Save to file
    const payload = {
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag,
      ciphertext
    };

    fs.writeFileSync(this.credentialsPath, JSON.stringify(payload, null, 2), 'utf-8');
  }

  /**
   * Decrypt and retrieve a saved credential value
   * @param {string} keyName 
   * @returns {Promise<string|null>} Decrypted value or null if not found
   */
  async decryptCredential(keyName) {
    if (!fs.existsSync(this.credentialsPath)) {
      return null;
    }

    const map = await this._decryptAll();
    return map[keyName] || null;
  }

  /**
   * Verify if a shell command is safe to execute
   * @param {string} command 
   * @returns {Promise<boolean>} True if safe, false if unsafe
   */
  async verifyExecutionSafety(command) {
    if (!command) return true;
    
    const normalized = command.toLowerCase().trim();

    // Blacklist Patterns
    const dangerousPatterns = [
      // 1. Dangerous deletions
      /rm\s+.*-[a-z]*r[a-z]*\s+.*[\/\~\\]/i,  // rm -rf / or rm -r \ or rm -rf ~
      /rm\s+.*-[a-z]*r[a-z]*\s+.*\.\./i,      // rm -rf ..
      /rm\s+.*--recursive\s+.*[\/\~\\\.]/i,   // rm --recursive / or ~ or ..
      /del\s+.*\/f/i,                         // del forceful deletion
      /rd\s+.*\/s/i,                          // rd recursive folder removal
      
      // 2. Raw disk operations
      /format\s+[a-z]:/i,                     // Disk format
      /fdisk/i,                               // Partition manager
      /mkfs/i,                                // Make filesystem
      
      // 3. Credentials & secret exfiltration
      /(curl|wget|http|fetch)\s+.*(\.env|credentials|\.enc|\.git)/i, // command accessing secrets
      
      // 4. System shut downs & power control
      /shutdown/i,                            // shutdown
      /init\s+[0-6]/i,                        // init 0, init 6 (reboot/shutdown)
      /poweroff/i,                            // poweroff
      /reboot/i,                              // reboot
      /halt/i                                 // halt
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(normalized)) {
        return false;
      }
    }

    return true;
  }

  async _decryptAll() {
    const raw = fs.readFileSync(this.credentialsPath, 'utf-8');
    const payload = JSON.parse(raw);

    const salt = Buffer.from(payload.salt, 'hex');
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const ciphertext = payload.ciphertext;

    const masterPassword = this._getMasterPassword();
    const key = crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  _getMasterPassword() {
    return process.env.AETHER_MASTER_PASSWORD || 'AETHER_PROJECT_FALLBACK_DEFAULT_SECRET_KEY';
  }

  _initializeConfigDir() {
    if (!fs.existsSync(this.projectManager.configDir)) {
      fs.mkdirSync(this.projectManager.configDir, { recursive: true });
    }
  }
}
