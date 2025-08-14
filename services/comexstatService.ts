// services/comexstatService.ts - Versão Oficial ComexStat
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

class ComexStatService {
  
  // ✅ MÉTODO PRINCIPAL OFICIAL
  async getGeneralData(request: ComexstatRequest): Promise<ComexstatResponse> {
    // ⭐ PAYLOAD OFICIAL COMEXSTAT - Details opcionais
    const payload = {
      flow: request.flow,
      monthDetail: request.monthDetail,
      period: request.period,
      ...(request.details && request.details.length > 0 && { details: request.details }),
      ...(request.filters && request.filters.length > 0 && { filters: request.filters }),
      metrics: request.metrics || ['metricFOB', 'metricKG']
    };

    console.log('🚀 ComexStat API Request:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${API_BASE}/general?language=pt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ ComexStat API Response:', data);
      
      return data;

    } catch (error: any) {
      console.error('❌ ComexStat API Error:', error);
      throw error;
    }
  }

  // ✅ FILTROS DISPONÍVEIS
  async getAvailableFilters(language: string = 'pt'): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/general/filters?language=${language}`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar filtros:', error);
      return null;
    }
  }

  // ✅ MÉTRICAS DISPONÍVEIS
  async getAvailableMetrics(language: string = 'pt'): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/general/metrics?language=${language}`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar métricas:', error);
      return null;
    }
  }

  // ✅ DETALHES DISPONÍVEIS
  async getAvailableDetails(language: string = 'pt'): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/general/details?language=${language}`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar detalhes:', error);
      return null;
    }
  }

  // ✅ ANOS DISPONÍVEIS
  async getAvailableYears(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/general/dates/years`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar anos:', error);
      return null;
    }
  }

  // ✅ ÚLTIMA ATUALIZAÇÃO
  async getLastUpdate(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/general/dates/updated`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar última atualização:', error);
      return null;
    }
  }

  // ✅ PAÍSES DISPONÍVEIS
  async getCountries(search?: string): Promise<any> {
    try {
      const url = search ? 
        `${API_BASE}/tables/countries?search=${encodeURIComponent(search)}` :
        `${API_BASE}/tables/countries`;
      const response = await fetch(url);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar países:', error);
      return null;
    }
  }

  // ✅ UFs DISPONÍVEIS
  async getStates(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/tables/uf`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar UFs:', error);
      return null;
    }
  }

  // ✅ HEALTH CHECK MELHORADO
  async healthCheck(): Promise<{ status: boolean, message: string, data?: any }> {
    try {
      const response = await fetch(`${API_BASE}/general/dates/years`);
      
      if (response.ok) {
        const data = await response.json();
        return {
          status: true,
          message: `API operacional - Dados ${data.data?.min || 'N/A'} a ${data.data?.max || 'N/A'}`,
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

  // ✅ CONSULTA RÁPIDA PARA TESTES
  async quickTest(): Promise<any> {
    const testPayload: ComexstatRequest = {
      flow: 'export',
      monthDetail: true,
      period: { from: '2023-01', to: '2023-03' },
      metrics: ['metricFOB', 'metricKG']
    };

    return this.getGeneralData(testPayload);
  }
}

// Export único e simples
export const comexstatService = new ComexStatService();

export type { ComexstatRequest, ComexstatResponse };