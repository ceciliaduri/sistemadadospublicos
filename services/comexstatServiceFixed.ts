// services/comexstatServiceFixed.ts - ZERO MOCK DATA - APENAS DADOS REAIS
const API_BASE = 'https://api-comexstat.mdic.gov.br';

interface ComexstatRequest {
  flow: 'export' | 'import';
  monthDetail: boolean;
  period: {
    from: string;
    to: string;
  };
  details?: string[];
  filters?: Array<{
    filter: string;
    values: (string | number)[];
  }>;
  metrics?: string[];
}

interface ComexstatResponse {
  data: any;
  success: boolean;
  message?: string;
  processo_info?: any;
  language?: string;
}

// ✅ RATE LIMITING INTELIGENTE
class RateLimiter {
  private lastRequest = 0;
  private requestCount = 0;
  private resetTime = 0;
  private readonly baseDelay = 3000; // 3 segundos base
  private readonly maxDelay = 15000; // máximo 15 segundos

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Reset contador a cada minuto
    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + 60000; // próximo reset em 1 minuto
    }

    // Calcular delay baseado no número de requests
    const dynamicDelay = Math.min(
      this.baseDelay + (this.requestCount * 1000), 
      this.maxDelay
    );
    
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < dynamicDelay) {
      const waitTime = dynamicDelay - timeSinceLastRequest;
      console.log(`🕐 Rate limit: aguardando ${waitTime}ms (request #${this.requestCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequest = Date.now();
    this.requestCount++;
  }
}

class ComexStatServiceFixed {
  private rateLimiter = new RateLimiter();
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutos

  // ✅ CACHE INTELIGENTE
  private getCacheKey(payload: any): string {
    return JSON.stringify(payload);
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log('✅ Cache hit para:', key.substring(0, 50) + '...');
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private saveToCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // ✅ MÉTODO PRINCIPAL COM RATE LIMITING
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
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    console.log('🚀 ComexStat API Request:', JSON.stringify(payload, null, 2));

    // Aplicar rate limiting antes da request
    await this.rateLimiter.waitForSlot();

    try {
      const response = await fetch(`${API_BASE}/general?language=pt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ComexStat-Dashboard/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error ${response.status}:`, errorText);
        
        if (response.status === 429) {
          throw new Error(`Rate limit excedido. Aguarde alguns segundos e tente novamente.`);
        }
        
        if (response.status === 400) {
          throw new Error(`Parâmetros inválidos: ${errorText}`);
        }
        
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ ComexStat API Response estrutura:', {
        success: data.success,
        hasData: !!data.data,
        hasList: !!(data.data && data.data.list),
        listLength: data.data?.list?.length || 0
      });
      
      this.saveToCache(cacheKey, data);
      return data;

    } catch (error: any) {
      console.error('❌ ComexStat API Error:', error);
      throw error;
    }
  }

  // ✅ NCM RANKING - APENAS DADOS REAIS
  async getNCMRanking(
    flow: 'export' | 'import',
    period: { from: string; to: string },
    limit: number = 20
  ): Promise<any[]> {
    console.log('📊 === BUSCANDO RANKING NCM (DADOS REAIS APENAS) ===');
    
    try {
      const request: ComexstatRequest = {
        flow,
        monthDetail: false,
        period,
        details: ['ncm'], // ✅ CRITICAL: NCM detalhamento
        metrics: ['metricFOB', 'metricKG', 'metricStatistic']
      };

      const response = await this.getGeneralData(request);
      
      if (!response.data || !response.data.list || response.data.list.length === 0) {
        console.log('⚠️ API retornou lista vazia para NCM');
        return []; // ❌ SEM MOCK DATA
      }

      const processedData = this.processNCMData(response.data.list);
      return processedData.slice(0, limit);

    } catch (error: any) {
      console.error('❌ Erro ao buscar NCM ranking:', error);
      return []; // ❌ SEM MOCK DATA
    }
  }

  // ✅ EMPRESA RANKING - APENAS DADOS REAIS (SE DISPONÍVEIS)
  async getEmpresaRanking(
    flow: 'export' | 'import',
    period: { from: string; to: string },
    limit: number = 20
  ): Promise<any[]> {
    console.log('🏢 === BUSCANDO RANKING EMPRESAS (DADOS REAIS APENAS) ===');
    
    try {
      // Tentar dados por estado (disponível na API)
      const request: ComexstatRequest = {
        flow,
        monthDetail: false,
        period,
        details: ['state'], // ✅ Estados disponíveis
        metrics: ['metricFOB', 'metricKG']
      };

      const response = await this.getGeneralData(request);
      
      if (response.data && response.data.list && response.data.list.length > 0) {
        console.log('✅ Dados por estado obtidos');
        const processedData = this.processEstadualData(response.data.list);
        return processedData.slice(0, limit);
      }
      
      console.log('⚠️ Dados empresariais não disponíveis');
      return []; // ❌ SEM MOCK DATA
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar dados empresariais:', error);
      return []; // ❌ SEM MOCK DATA
    }
  }

  // ✅ PROCESSAMENTO DE DADOS NCM
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

      const existing = ncmMap.get(ncm) || { fob: 0, kg: 0, qtEstat: 0, descricao: descricao || `Produto ${ncm}` };
      
      ncmMap.set(ncm, {
        fob: existing.fob + fob,
        kg: existing.kg + kg,
        qtEstat: existing.qtEstat + qtEstat,
        descricao: existing.descricao
      });

      totalFOB += fob;
    });

    const result = Array.from(ncmMap.entries())
      .map(([ncm, data]) => ({
        ncm,
        descricao: data.descricao,
        fob: data.fob,
        kg: data.kg,
        qtEstat: data.qtEstat,
        participacao: totalFOB > 0 ? (data.fob / totalFOB) * 100 : 0
      }))
      .sort((a, b) => b.fob - a.fob);

    console.log(`✅ Processados ${result.length} NCMs, total FOB: ${totalFOB.toLocaleString()}`);
    return result;
  }

  // ✅ PROCESSAMENTO DE DADOS ESTADUAIS
  private processEstadualData(rawData: any[]): any[] {
    console.log('🔄 Processando dados estaduais:', rawData.length);
    
    const estadoMap = new Map<string, { fob: number; kg: number; nome: string }>();
    let totalFOB = 0;

    rawData.forEach(item => {
      const fob = this.parseValue(item.metricFOB || item.vlFob);
      const kg = this.parseValue(item.metricKG || item.kgLiq);
      
      const codigo = item.coUf || item.state || item.uf;
      const nome = item.noUf || item.estado || this.getEstadoNome(codigo);
      
      if (!codigo || fob <= 0) return;

      const existing = estadoMap.get(codigo) || { fob: 0, kg: 0, nome: nome || `Estado ${codigo}` };
      
      estadoMap.set(codigo, {
        fob: existing.fob + fob,
        kg: existing.kg + kg,
        nome: existing.nome
      });

      totalFOB += fob;
    });

    const result = Array.from(estadoMap.entries())
      .map(([codigo, data]) => ({
        cnpj: codigo,
        razaoSocial: `Estado: ${data.nome}`,
        fob: data.fob,
        kg: data.kg,
        participacao: totalFOB > 0 ? (data.fob / totalFOB) * 100 : 0,
        tipo: 'ESTADO',
        observacao: 'Dados reais agregados por estado - fonte MDIC'
      }))
      .sort((a, b) => b.fob - a.fob);

    console.log(`✅ Processados ${result.length} estados`);
    return result;
  }

  // ✅ MÉTODO PARA DADOS MENSAIS
  async getMonthlyData(
    flow: 'export' | 'import',
    year: number,
    months?: number[]
  ): Promise<any> {
    const targetMonths = months || Array.from({ length: 12 }, (_, i) => i + 1);
    
    const monthlyPromises = targetMonths.map(async (month) => {
      const monthStr = month.toString().padStart(2, '0');
      const period = {
        from: `${year}-${monthStr}`,
        to: `${year}-${monthStr}`
      };
      
      try {
        const response = await this.getGeneralData({
          flow,
          monthDetail: true,
          period,
          metrics: ['metricFOB', 'metricKG']
        });
        
        return {
          month,
          period: `${year}-${monthStr}`,
          data: response.data?.list || [],
          success: true
        };
      } catch (error: any) {
        console.warn(`⚠️ Erro no mês ${month}/${year}:`, error);
        return {
          month,
          period: `${year}-${monthStr}`,
          data: [],
          success: false,
          error: error.message
        };
      }
    });

    const results = await Promise.all(monthlyPromises);
    return results;
  }

  // ✅ HEALTH CHECK SIMPLIFICADO
  async healthCheck(): Promise<{ status: boolean; message: string; data?: any }> {
    try {
      const testPayload = {
        flow: 'export' as const,
        monthDetail: false,
        period: { from: '2023-01', to: '2023-03' },
        metrics: ['metricFOB', 'metricKG']
      };

      await this.rateLimiter.waitForSlot();
      
      const response = await fetch(`${API_BASE}/general?language=pt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        const data = await response.json();
        return {
          status: true,
          message: `API operacional - ${data.data?.list?.length || 0} registros disponíveis`,
          data: data.data
        };
      } else {
        return {
          status: false,
          message: `API Error ${response.status}`
        };
      }
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
}

// Export da instância
export const comexstatServiceFixed = new ComexStatServiceFixed();
export type { ComexstatRequest, ComexstatResponse };