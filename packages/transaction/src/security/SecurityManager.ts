import crypto from 'crypto';

import type { SecurityConfig } from '../types';

export class SecurityManager {
  private config: SecurityConfig;

  constructor(config: SecurityConfig = {}) {
    this.config = {
      encryptionAlgorithm: 'aes-256-cbc',
      keySize: 32,
      saltRounds: 10,
      ...config,
    };
  }

  /**
   * Generate a secure random key
   */
  public generateKey(length = this.config.keySize): string {
    return crypto.randomBytes(length || 32).toString('hex');
  }

  /**
   * Encrypt sensitive data
   */
  public encrypt(data: string, key = this.config.secretKey): { encryptedData: string; iv: string } {
    if (!key) {
      throw new Error('Encryption key is required');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.config.encryptionAlgorithm || 'aes-256-cbc',
      Buffer.from(key, 'hex'),
      iv
    );

    let encryptedData = cipher.update(data, 'utf8', 'hex');
    encryptedData += cipher.final('hex');

    return {
      encryptedData,
      iv: iv.toString('hex'),
    };
  }

  /**
   * Decrypt encrypted data
   */
  public decrypt(encryptedData: string, iv: string, key = this.config.secretKey): string {
    if (!key) {
      throw new Error('Decryption key is required');
    }

    const decipher = crypto.createDecipheriv(
      this.config.encryptionAlgorithm || 'aes-256-cbc',
      Buffer.from(key, 'hex'),
      Buffer.from(iv, 'hex')
    );

    let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
    decryptedData += decipher.final('utf8');

    return decryptedData;
  }

  /**
   * Generate a secure hash of data
   */
  public hash(data: string, salt?: string): { hash: string; salt: string } {
    const useSalt = salt || crypto.randomBytes(16).toString('hex');
    const hmac = crypto.createHmac('sha256', useSalt);
    hmac.update(data);
    
    return {
      hash: hmac.digest('hex'),
      salt: useSalt,
    };
  }

  /**
   * Verify a hash against data
   */
  public verifyHash(data: string, hash: string, salt: string): boolean {
    const computedHash = this.hash(data, salt);
    return computedHash.hash === hash;
  }

  /**
   * Generate a HMAC signature
   */
  public generateSignature(data: string, key = this.config.secretKey): string {
    if (!key) {
      throw new Error('Signature key is required');
    }

    const hmac = crypto.createHmac('sha256', key);
    hmac.update(data);
    return hmac.digest('hex');
  }

  /**
   * Verify a HMAC signature
   */
  public verifySignature(data: string, signature: string, key = this.config.secretKey): boolean {
    if (!key) {
      throw new Error('Signature key is required');
    }

    const expectedSignature = this.generateSignature(data, key);
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  }
}
