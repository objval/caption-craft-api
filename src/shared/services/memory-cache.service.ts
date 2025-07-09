import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry {
  value: any;
  expiry: number;
}

@Injectable()
export class MemoryCacheService {
  private readonly logger = new Logger(MemoryCacheService.name);
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL

  set(key: string, value: any, ttl: number = this.defaultTTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
    this.logger.debug(`Cache SET: ${key}, TTL: ${ttl}ms`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.logger.debug(`Cache MISS: ${key}`);
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.logger.debug(`Cache EXPIRED: ${key}`);
      return null;
    }

    this.logger.debug(`Cache HIT: ${key}`);
    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.logger.debug(`Cache DELETE: ${key}`);
  }

  clear(): void {
    this.cache.clear();
    this.logger.debug('Cache cleared');
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    // Clean expired entries first
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Cleanup expired entries (can be called periodically)
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired cache entries`);
    }
  }
}
