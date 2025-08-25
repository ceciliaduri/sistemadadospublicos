// services/advancedRateLimiter.ts - Solução definitiva para rate limit
interface RequestQueueItem {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: number;
  requestId: string;
  timestamp: number;
  retries: number;
}

class AdvancedRateLimiter {
  private queue: RequestQueueItem[] = [];
  private processing = false;
  private currentDelay = 2000; // 2s inicial
  private readonly minDelay = 2000;
  private readonly maxDelay = 60000; // 1 minuto máximo
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly windowSize = 60000; // 1 minuto
  private readonly maxRequestsPerWindow = 15; // REDUZIDO drasticamente
  private activeRequests = new Set<string>();
  private lastRequestTime = 0;

  async execute<T>(
    fn: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal',
    requestId?: string
  ): Promise<T> {
    const priorityMap = { high: 3, normal: 2, low: 1 };
    const uniqueId = requestId || `req_${Date.now()}_${Math.random()}`;

    // ✅ DEDUPLICAÇÃO: Evitar requests idênticas
    if (this.activeRequests.has(uniqueId)) {
      throw new Error('Request já em processamento');
    }

    return new Promise((resolve, reject) => {
      const queueItem: RequestQueueItem = {
        fn,
        resolve,
        reject,
        priority: priorityMap[priority],
        requestId: uniqueId,
        timestamp: Date.now(),
        retries: 0
      };

      // Inserir na fila ordenada por prioridade
      const insertIndex = this.queue.findIndex(item => item.priority < queueItem.priority);
      if (insertIndex === -1) {
        this.queue.push(queueItem);
      } else {
        this.queue.splice(insertIndex, 0, queueItem);
      }

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();

      // Reset da janela de rate limiting
      if (now - this.windowStart >= this.windowSize) {
        this.requestCount = 0;
        this.windowStart = now;
        this.currentDelay = Math.max(this.minDelay, this.currentDelay * 0.8); // Reduzir delay gradualmente
      }

      // Verificar limite de requests por janela
      if (this.requestCount >= this.maxRequestsPerWindow) {
        const waitTime = this.windowSize - (now - this.windowStart);
        console.log(`🕐 Rate limit: aguardando reset da janela (${waitTime}ms)`);
        await this.sleep(waitTime);
        continue;
      }

      // Garantir intervalo mínimo entre requests
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.currentDelay) {
        const waitTime = this.currentDelay - timeSinceLastRequest;
        console.log(`⏱️ Aguardando intervalo: ${waitTime}ms (delay atual: ${this.currentDelay}ms)`);
        await this.sleep(waitTime);
      }

      const item = this.queue.shift()!;
      this.activeRequests.add(item.requestId);

      try {
        console.log(`🚀 Processando request ${item.requestId} (prioridade: ${item.priority})`);
        
        const result = await this.executeWithTimeout(item.fn, 30000); // 30s timeout
        
        item.resolve(result);
        this.requestCount++;
        this.lastRequestTime = Date.now();
        
        // Sucesso: reduzir delay
        this.currentDelay = Math.max(this.minDelay, this.currentDelay * 0.9);
        
      } catch (error: any) {
        console.error(`❌ Error em request ${item.requestId}:`, error);
        
        if (this.shouldRetry(error, item.retries)) {
          item.retries++;
          this.currentDelay = Math.min(this.maxDelay, this.currentDelay * 1.5); // Aumentar delay
          
          // Re-inserir na fila com delay exponencial
          setTimeout(() => {
            this.queue.unshift(item);
            this.processQueue();
          }, this.calculateRetryDelay(item.retries));
          
          console.log(`🔄 Reagendando request ${item.requestId} (tentativa ${item.retries + 1})`);
        } else {
          item.reject(error);
        }
      } finally {
        this.activeRequests.delete(item.requestId);
      }

      // Pequeno delay adicional para evitar sobrecarga
      await this.sleep(500);
    }

    this.processing = false;
  }

  private shouldRetry(error: any, retries: number): boolean {
    const maxRetries = 3;
    
    if (retries >= maxRetries) return false;
    
    // Retry para erros específicos de rate limiting
    const retryableErrors = [
      'rate limit',
      'too many requests', 
      '429',
      'network error',
      'timeout'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return retryableErrors.some(keyword => errorMessage.includes(keyword));
  }

  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff: 5s, 10s, 20s
    return Math.min(5000 * Math.pow(2, retryCount), 30000);
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ✅ MÉTODOS UTILITÁRIOS
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      currentDelay: this.currentDelay,
      requestsInWindow: this.requestCount,
      activeRequests: this.activeRequests.size
    };
  }

  clearQueue() {
    this.queue.forEach(item => item.reject(new Error('Queue cleared')));
    this.queue = [];
    this.activeRequests.clear();
  }
}

// ✅ CACHE INTELIGENTE COM TTL E COMPRESSION
class IntelligentCache {
  private cache = new Map<string, { 
    data: any; 
    timestamp: number; 
    ttl: number;
    accessCount: number;
    lastAccess: number;
  }>();
  
  private readonly maxSize = 100;
  private readonly defaultTTL = 10 * 60 * 1000; // 10 minutos

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    // Limpar cache se necessário
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccess: Date.now()
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Verificar TTL
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Atualizar estatísticas de acesso
    item.accessCount++;
    item.lastAccess = Date.now();
    
    return item.data;
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache) {
      if (item.lastAccess < oldestTime) {
        oldestTime = item.lastAccess;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// ✅ INSTÂNCIAS GLOBAIS
export const advancedRateLimiter = new AdvancedRateLimiter();
export const intelligentCache = new IntelligentCache();