// services/advancedRateLimiter.ts - STUB SIMPLES (SUBSTITUI O ATUAL)
// ✅ VERSÃO SIMPLIFICADA - REMOVE A COMPLEXIDADE QUE ESTAVA CAUSANDO ERROS

// STUB para manter compatibilidade se algum import ainda existir
export const advancedRateLimiter = {
  execute: async (fn: () => Promise<any>, priority: string = 'medium', key?: string) => {
    // Rate limiting básico
    await new Promise(resolve => setTimeout(resolve, 1000));
    return fn();
  },
  
  getQueueStatus: () => ({
    queueLength: 0,
    processing: false,
    currentDelay: 1000,
    requestsInWindow: 0,
    activeRequests: 0
  }),
  
  clearQueue: () => {
    // Noop
  }
};

export const intelligentCache = {
  get: (key: string) => null,
  set: (key: string, value: any, ttl?: number) => {},
  clear: () => {},
  getStats: () => ({
    size: 0,
    hits: 0,
    misses: 0,
    hitRate: 0
  })
};

// ✅ DEPRECATION WARNING
console.warn('⚠️ advancedRateLimiter is deprecated. Use simplified rate limiting in comexstatServiceOptimized instead.');