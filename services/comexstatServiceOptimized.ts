// services/comexstatServiceOptimized.ts - Substitui comexstatServiceFixed.ts
import { advancedRateLimiter, intelligentCache } from './advancedRateLimiter';

const API_BASE = 'https://api-comexstat.mdic.gov.br';

interface ComexstatRequest {
  flow: 'export' | 'import';
  monthDetail: boolean;
  period: { from: string; to: string };
  details?: string[];
  filters?: Array<{ filter: string; values: (string | number)[] }>;
  metrics?: string[];
}

interface ComexstatResponse {
  data: any;
  success: boolean;
  message?: string;
  processo_info?: any;
  language?: string;
}

class ComexStatServiceOptimized {
  // ✅ CACHE KEY INTELIGENTE
  private getCacheKey(payload: any): string {
    const normalized = JSON.stringify(payload, Object.keys(payload).sort());
    return btoa(normalized).substring(0, 32); // Base64 truncado
  }

  // ✅ REQUEST DEDUPLICATION
  private pendingRequests = new Map<string, Promise<any>>();

  // ✅ MÉTODO PRINCIPAL COM RATE LIMITING AVANÇADO
  async getGeneralData(request: ComexstatRequest): Promise<ComexstatResponse> {
    const payload = {
      flow: request.flow,
      monthDetail: request.monthDetail,
      period: request.period,
      ...(request.details && request.details.length > 0 && { details: request.details }),
      ...(request.filters && request.filters.length > 0 && { filters: request.filters }),
      metrics: request.metrics || ['metricFOB', 'metricKG']
    };

    const cacheKey = this.getCacheKey(payload);
    
    // Verificar cache primeiro
    const cachedData = intelligentCache.get(cacheKey);
    if (cachedData) {
      console.log('✅ Cache hit:', cacheKey);
      return cachedData;
    }

    // Verificar deduplicação
    if (this.pendingRequests.has(cacheKey)) {
      console.log('🔄 Request já pendente, aguardando...', cacheKey);
      return this.pendingRequests.get(cacheKey)!;
    }

    // Criar request com rate limiting
    const requestPromise = advancedRateLimiter.execute(
      async () => {
        console.log('🚀 ComexStat API Request:', JSON.stringify(payload, null, 2));
        
        const response = await fetch(`${API_BASE}/general?language=pt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'ComexStat-Dashboard/2.0',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ API Error ${response.status}:`, errorText);
          
          if (response.status === 429) {
            throw new Error(`Rate limit excedido - request será reagendado automaticamente`);
          }
          
          if (response.status === 400) {
            throw new Error(`Parâmetros inválidos: ${errorText}`);
          }
          
          if (response.status >= 500) {
            throw new Error(`Erro do servidor: ${response.status}`);
          }
          
          throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ ComexStat API Response:', {
          success: data.success,
          hasData: !!data.data,
          hasList: !!(data.data && data.data.list),
          listLength: data.data?.list?.length || 0
        });
        
        return data;
      },
      'high', // Prioridade alta para requests principais
      cacheKey
    );

    // Armazenar request pendente
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache com TTL baseado no tipo de dados
      const ttl = this.calculateTTL(request);
      intelligentCache.set(cacheKey, result, ttl);
      
      return result;
    } catch (error) {
      console.error('❌ ComexStat API Error:', error);
      throw error;
    } finally {
      // Remover da lista de pendentes
      this.pendingRequests.delete(cacheKey);
    }
  }

  // ✅ TTL INTELIGENTE BASEADO NO TIPO DE DADOS
  private calculateTTL(request: ComexstatRequest): number {
    const baseYear = new Date().getFullYear();
    const periodYear = parseInt(request.period.from.split('-')[0]);
    
    // Dados antigos: cache mais longo
    if (periodYear < baseYear - 1) return 60 * 60 * 1000; // 1 hora
    
    // Dados do ano passado: cache médio
    if (periodYear === baseYear - 1) return 30 * 60 * 1000; // 30 minutos
    
    // Dados do ano atual: cache curto
    return 10 * 60 * 1000; // 10 minutos
  }

  // ✅ MÉTODOS ESPECIALIZADOS COM RATE LIMITING

  async getNCMRanking(
    flow: 'export' | 'import',
    period: { from: string; to: string },
    limit: number = 20
  ): Promise<any[]> {
    console.log('📊 === NCM RANKING (SEM RATE LIMIT) ===');
    
    try {
      const request: ComexstatRequest = {
        flow,
        monthDetail: false,
        period,
        details: ['ncm'],
        metrics: ['metricFOB', 'metricKG', 'metricStatistic']
      };

      const response = await this.getGeneralData(request);
      
      if (!response.data || !response.data.list || response.data.list.length === 0) {
        console.log('⚠️ API retornou lista vazia para NCM');
        return [];
      }

      const processedData = this.processNCMData(response.data.list);
      return processedData.slice(0, limit);

    } catch (error: any) {
      console.error('❌ Erro ao buscar NCM ranking:', error);
      
      // Não lançar erro, retornar array vazio para UX melhor
      return [];
    }
  }

  async getEmpresaRanking(
    flow: 'export' | 'import',
    period: { from: string; to: string },
    limit: number = 20
  ): Promise<any[]> {
    console.log('🏢 === EMPRESA RANKING (SEM RATE LIMIT) ===');
    
    try {
      const request: ComexstatRequest = {
        flow,
        monthDetail: false,
        period,
        details: ['state'],
        metrics: ['metricFOB', 'metricKG']
      };

      const response = await this.getGeneralData(request);
      
      if (response.data && response.data.list && response.data.list.length > 0) {
        const processedData = this.processEstadualData(response.data.list);
        return processedData.slice(0, limit);
      }
      
      return [];
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar dados empresariais:', error);
      return [];
    }
  }

  // ✅ PROCESSAMENTO DE DADOS OTIMIZADO
  private processNCMData(rawData: any[]): any[] {
    console.log('🔄 Processando dados NCM:', rawData.length);
    
    const ncmMap = new Map<string, { fob: number; kg: number; qtEstat: number; descricao: string }>();
    let totalFOB = 0;

    rawData.forEach(item => {
      const fob = this.parseValue(item.metricFOB || item.vlFob);
      const kg = this.parseValue(item.metricKG || item.kgLiq);
      const qtEstat = this.parseValue(item.metricStatistic || item.qtEstat);
      
      const ncm = item.coNcm || item.ncm || item.codigo;
      const descricao = item.noNcm || item.descricao || item.description;
      
      if (!ncm || fob <= 0) return;

      const existing = ncmMap.get(ncm) || { 
        fob: 0, kg: 0, qtEstat: 0, 
        descricao: descricao || `Produto ${ncm}` 
      };
      
      ncmMap.set(ncm, {
        fob: existing.fob + fob,
        kg: existing.kg + kg,
        qtEstat: existing.qtEstat + qtEstat,
        descricao: existing.descricao
      });

      totalFOB += fob;
    });

    return Array.from(ncmMap.entries())
      .map(([ncm, data]) => ({
        ncm,
        descricao: data.descricao,
        fob: data.fob,
        kg: data.kg,
        qtEstat: data.qtEstat,
        participacao: totalFOB > 0 ? (data.fob / totalFOB) * 100 : 0
      }))
      .sort((a, b) => b.fob - a.fob);
  }

  private processEstadualData(rawData: any[]): any[] {
    const estadoMap = new Map<string, { fob: number; kg: number; nome: string }>();
    let totalFOB = 0;

    rawData.forEach(item => {
      const fob = this.parseValue(item.metricFOB || item.vlFob);
      const kg = this.parseValue(item.metricKG || item.kgLiq);
      const codigo = item.coUf || item.state || item.uf;
      const nome = item.noUf || item.estado || this.getEstadoNome(codigo);

      if (!codigo || fob <= 0) return;

      const existing = estadoMap.get(codigo) || { fob: 0, kg: 0, nome };
      estadoMap.set(codigo, {
        fob: existing.fob + fob,
        kg: existing.kg + kg,
        nome
      });

      totalFOB += fob;
    });

    return Array.from(estadoMap.entries())
      .map(([codigo, data]) => ({
        identificador: codigo,
        nome: `Estado: ${data.nome}`,
        tipo: 'ESTADO',
        fob: data.fob,
        kg: data.kg,
        participacao: totalFOB > 0 ? (data.fob / totalFOB) * 100 : 0
      }))
      .sort((a, b) => b.fob - a.fob);
  }

  // ✅ HEALTH CHECK OTIMIZADO
  async testConnection(): Promise<{ status: boolean; message: string; data?: any }> {
    try {
      const testPayload = {
        flow: 'export' as const,
        monthDetail: false,
        period: { from: '2023-01', to: '2023-01' }, // Período mínimo
        metrics: ['metricFOB']
      };

      const response = await advancedRateLimiter.execute(async () => {
        const res = await fetch(`${API_BASE}/general?language=pt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(testPayload)
        });

        if (res.ok) {
          return res.json();
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      }, 'low');

      return {
        status: true,
        message: `API operacional - ${response.data?.list?.length || 0} registros disponíveis`,
        data: response.data
      };
    } catch (error: any) {
      return {
        status: false,
        message: `Conexão falhou: ${error.message}`
      };
    }
  }

  // ✅ HELPERS
  private parseValue(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private getEstadoNome(codigo: any): string {
    const estados: Record<string, string> = {
      '11': 'Rondônia', '12': 'Acre', '13': 'Amazonas', '14': 'Roraima',
      '15': 'Pará', '16': 'Amapá', '17': 'Tocantins', '21': 'Maranhão',
      '22': 'Piauí', '23': 'Ceará', '24': 'Rio Grande do Norte', '25': 'Paraíba',
      '26': 'Pernambuco', '27': 'Alagoas', '28': 'Sergipe', '29': 'Bahia',
      '31': 'Minas Gerais', '32': 'Espírito Santo', '33': 'Rio de Janeiro',
      '35': 'São Paulo', '41': 'Paraná', '42': 'Santa Catarina',
      '43': 'Rio Grande do Sul', '50': 'Mato Grosso do Sul', '51': 'Mato Grosso',
      '52': 'Goiás', '53': 'Distrito Federal'
    };
    return estados[String(codigo)] || `Estado ${codigo}`;
  }

  // ✅ ESTATÍSTICAS DO SISTEMA
  getSystemStats() {
    return {
      rateLimiter: advancedRateLimiter.getQueueStatus(),
      cache: intelligentCache.getStats(),
      pendingRequests: this.pendingRequests.size
    };
  }

  // ✅ LIMPEZA DE EMERGÊNCIA
  clearAll() {
    advancedRateLimiter.clearQueue();
    intelligentCache.clear();
    this.pendingRequests.clear();
  }
}

export const comexstatServiceOptimized = new ComexStatServiceOptimized();
export type { ComexstatRequest, ComexstatResponse };