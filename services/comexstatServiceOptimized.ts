// services/comexstatServiceOptimized.ts - VERSÃO CORRIGIDA (SUBSTITUI O ATUAL)
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

// ✅ RATE LIMITING SIMPLES - SEM OVER-ENGINEERING
let lastRequest = 0;
const DELAY = 3000; // 3 segundos

async function simpleRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequest;
  
  if (timeSinceLastRequest < DELAY) {
    const waitTime = DELAY - timeSinceLastRequest;
    console.log(`⏱️ Rate limit: aguardando ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequest = Date.now();
}

// ✅ CACHE SIMPLES - SEM OVER-ENGINEERING  
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

function getCacheKey(payload: any): string {
  return JSON.stringify(payload, Object.keys(payload).sort());
}

function getFromCache(key: string): any | null {
  const cached = cache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('✅ Cache hit');
    return cached.data;
  }
  if (cached) {
    cache.delete(key);
  }
  return null;
}

function saveToCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
  
  // Limpeza automática do cache (manter apenas 50 itens)
  if (cache.size > 50) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

class ComexStatServiceOptimized {
  // ✅ MÉTODO PRINCIPAL SIMPLIFICADO
  async getGeneralData(request: ComexstatRequest): Promise<ComexstatResponse> {
    const payload = {
      flow: request.flow,
      monthDetail: request.monthDetail,
      period: request.period,
      ...(request.details && request.details.length > 0 && { details: request.details }),
      ...(request.filters && request.filters.length > 0 && { filters: request.filters }),
      metrics: request.metrics || ['metricFOB', 'metricKG']
    };

    const cacheKey = getCacheKey(payload);
    
    // Verificar cache primeiro
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Rate limiting simples
    await simpleRateLimit();

    try {
      console.log('🚀 API Request:', JSON.stringify(payload, null, 2));
      
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
      console.log('✅ API Response:', {
        success: data.success,
        hasData: !!data.data,
        hasList: !!(data.data && data.data.list),
        listLength: data.data?.list?.length || 0
      });
      
      // Salvar no cache
      saveToCache(cacheKey, data);
      
      return data;

    } catch (error: any) {
      console.error('❌ API Error:', error);
      throw error;
    }
  }

  // ✅ NCM RANKING SIMPLIFICADO
  async getNCMRanking(
    flow: 'export' | 'import',
    period: { from: string; to: string },
    limit: number = 20
  ): Promise<any[]> {
    console.log('📊 Buscando NCM ranking...');
    
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
      return []; // Retornar array vazio ao invés de throw para UX melhor
    }
  }

  // ✅ RANKING ESTADOS SIMPLIFICADO
  async getEmpresaRanking(
    flow: 'export' | 'import',
    period: { from: string; to: string },
    limit: number = 20
  ): Promise<any[]> {
    console.log('🏢 Buscando ranking por estado...');
    
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
      console.error('❌ Erro ao buscar dados por estado:', error);
      return [];
    }
  }

  // ✅ PROCESSAMENTO DE DADOS NCM
  private processNCMData(rawData: any[]): any[] {
    console.log(`🔄 Processando ${rawData.length} registros NCM`);
    
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

  // ✅ PROCESSAMENTO DE DADOS ESTADUAIS
  private processEstadualData(rawData: any[]): any[] {
    console.log(`🔄 Processando ${rawData.length} registros estaduais`);
    
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

    return Array.from(estadoMap.entries())
      .map(([codigo, data]) => ({
        cnpj: codigo,
        codigo: codigo,
        razaoSocial: `Estado: ${data.nome}`,
        nome: data.nome,
        fob: data.fob,
        kg: data.kg,
        participacao: totalFOB > 0 ? (data.fob / totalFOB) * 100 : 0,
        tipo: 'ESTADO'
      }))
      .sort((a, b) => b.fob - a.fob);
  }

  // ✅ HELPERS SIMPLES
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

  // ✅ LIMPEZA DE CACHE
  clearCache(): void {
    cache.clear();
    console.log('🗑️ Cache limpo');
  }
}

// ✅ EXPORT DA INSTÂNCIA
export const comexstatServiceOptimized = new ComexStatServiceOptimized();
export type { ComexstatRequest, ComexstatResponse };