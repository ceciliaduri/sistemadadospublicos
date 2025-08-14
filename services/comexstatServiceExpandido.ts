// services/comexstatServiceExpandido.ts - Serviço completo com NCM e Empresas
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

class ComexStatServiceExpandido {
  
  // ✅ MÉTODO PRINCIPAL - DADOS TEMPORAIS
  async getGeneralData(request: ComexstatRequest): Promise<ComexstatResponse> {
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

  // ✅ DADOS DE NCM - PRODUTOS MAIS NEGOCIADOS
  async getNCMRanking(flow: 'export' | 'import', period: { from: string; to: string }): Promise<any> {
    console.log('📦 Buscando ranking de NCM...');
    
    // Tentar diferentes parâmetros de details para NCM
    const ncmDetails = ['ncm', 'sh4', 'sh2', 'produto'];
    
    for (const detail of ncmDetails) {
      try {
        const request: ComexstatRequest = {
          flow,
          monthDetail: false,
          period,
          details: [detail],
          metrics: ['metricFOB', 'metricKG']
        };

        console.log(`🧪 Testando NCM com detail: ${detail}`);
        const response = await this.getGeneralData(request);
        
        if (response.data && response.data.list && Array.isArray(response.data.list)) {
          console.log(`✅ NCM encontrado com '${detail}':`, response.data.list.length, 'itens');
          return response;
        }
      } catch (error) {
        console.log(`❌ Falha NCM com '${detail}':`, error);
      }
    }

    throw new Error('Não foi possível obter dados de NCM com nenhum parâmetro testado');
  }

  // ✅ DADOS DE EMPRESAS - CNPJ E RAZÃO SOCIAL
  async getCompanyRanking(flow: 'export' | 'import', period: { from: string; to: string }): Promise<any> {
    console.log('🏢 Buscando ranking de empresas...');
    
    // Tentar diferentes parâmetros de details para empresas
    const companyDetails = ['empresa', 'importador', 'exportador', 'cnpj'];
    
    for (const detail of companyDetails) {
      try {
        const request: ComexstatRequest = {
          flow,
          monthDetail: false,
          period,
          details: [detail],
          metrics: ['metricFOB', 'metricKG']
        };

        console.log(`🧪 Testando empresas com detail: ${detail}`);
        const response = await this.getGeneralData(request);
        
        if (response.data && response.data.list && Array.isArray(response.data.list)) {
          console.log(`✅ Empresas encontrado com '${detail}':`, response.data.list.length, 'itens');
          return response;
        }
      } catch (error) {
        console.log(`❌ Falha empresas com '${detail}':`, error);
      }
    }

    throw new Error('Não foi possível obter dados de empresas com nenhum parâmetro testado');
  }

  // ✅ DADOS DE PAÍSES - PARCEIROS COMERCIAIS
  async getCountryRanking(flow: 'export' | 'import', period: { from: string; to: string }): Promise<any> {
    console.log('🌍 Buscando ranking de países...');
    
    try {
      const request: ComexstatRequest = {
        flow,
        monthDetail: false,
        period,
        details: ['pais'],
        metrics: ['metricFOB', 'metricKG']
      };

      console.log('🧪 Testando países...');
      const response = await this.getGeneralData(request);
      
      if (response.data && response.data.list && Array.isArray(response.data.list)) {
        console.log('✅ Países encontrado:', response.data.list.length, 'itens');
        return response;
      }
    } catch (error) {
      console.log('❌ Falha países:', error);
    }

    throw new Error('Não foi possível obter dados de países');
  }

  // ✅ DADOS DE ESTADOS - UFs BRASILEIRAS
  async getStateRanking(flow: 'export' | 'import', period: { from: string; to: string }): Promise<any> {
    console.log('🗺️ Buscando ranking de estados...');
    
    try {
      const request: ComexstatRequest = {
        flow,
        monthDetail: false,
        period,
        details: ['uf'],
        metrics: ['metricFOB', 'metricKG']
      };

      console.log('🧪 Testando estados...');
      const response = await this.getGeneralData(request);
      
      if (response.data && response.data.list && Array.isArray(response.data.list)) {
        console.log('✅ Estados encontrado:', response.data.list.length, 'itens');
        return response;
      }
    } catch (error) {
      console.log('❌ Falha estados:', error);
    }

    throw new Error('Não foi possível obter dados de estados');
  }

  // ✅ EXPLORAR TODOS OS DETAILS DISPONÍVEIS
  async exploreAvailableDetails(): Promise<any> {
    console.log('🔍 Explorando details disponíveis...');
    
    try {
      const response = await fetch(`${API_BASE}/general/details?language=pt`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar details:', error);
      return null;
    }
  }

  // ✅ EXPLORAR TODOS OS FILTROS DISPONÍVEIS
  async exploreAvailableFilters(): Promise<any> {
    console.log('🔍 Explorando filtros disponíveis...');
    
    try {
      const response = await fetch(`${API_BASE}/general/filters?language=pt`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar filtros:', error);
      return null;
    }
  }

  // ✅ EXPLORAR TODAS AS MÉTRICAS DISPONÍVEIS
  async exploreAvailableMetrics(): Promise<any> {
    console.log('🔍 Explorando métricas disponíveis...');
    
    try {
      const response = await fetch(`${API_BASE}/general/metrics?language=pt`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar métricas:', error);
      return null;
    }
  }

  // ✅ TESTE AVANÇADO COM MÚLTIPLOS DETAILS
  async testMultipleDetails(flow: 'export' | 'import', period: { from: string; to: string }): Promise<any> {
    console.log('🧪 Teste avançado com múltiplos details...');
    
    const allDetails = [
      ['ncm'],
      ['empresa'],
      ['pais'],
      ['uf'],
      ['ncm', 'pais'],
      ['ncm', 'empresa'],
      ['empresa', 'pais'],
      ['ncm', 'empresa', 'pais'],
      ['ncm', 'empresa', 'pais', 'uf']
    ];

    const results = [];

    for (const details of allDetails) {
      try {
        console.log(`🔍 Testando combinação: ${details.join(', ')}`);
        
        const request: ComexstatRequest = {
          flow,
          monthDetail: false,
          period,
          details,
          metrics: ['metricFOB', 'metricKG']
        };

        const response = await this.getGeneralData(request);
        
        if (response.data && response.data.list && Array.isArray(response.data.list)) {
          results.push({
            details,
            success: true,
            itemCount: response.data.list.length,
            sample: response.data.list.slice(0, 2)
          });
          console.log(`✅ Sucesso com ${details.join(', ')}: ${response.data.list.length} itens`);
        } else {
          results.push({
            details,
            success: false,
            error: 'Resposta vazia ou inválida'
          });
        }

        // Delay entre testes
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (error: any) {
        results.push({
          details,
          success: false,
          error: error.message
        });
        console.log(`❌ Falha com ${details.join(', ')}: ${error.message}`);
      }
    }

    return {
      testResults: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    };
  }

  // ✅ MÉTODOS AUXILIARES EXISTENTES
  async getAvailableYears(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/general/dates/years`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar anos:', error);
      return null;
    }
  }

  async getLastUpdate(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/general/dates/updated`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar última atualização:', error);
      return null;
    }
  }

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

  async getStates(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/tables/uf`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar UFs:', error);
      return null;
    }
  }

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
}

// Export único
export const comexstatServiceExpandido = new ComexStatServiceExpandido();

export type { ComexstatRequest, ComexstatResponse };