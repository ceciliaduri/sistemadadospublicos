// services/comexstatService.ts - Versão Expandida: NCM + Empresas + Rankings
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

// ✅ INTERFACES PARA NOVOS DADOS
interface NCMData {
  ncm: string;
  descricao: string;
  fob: number;
  kg: number;
  participacao: number;
}

interface EmpresaData {
  cnpj: string;
  razaoSocial: string;
  fob: number;
  kg: number;
  participacao: number;
  uf?: string;
}

class ComexStatService {
  
  // ✅ MÉTODO PRINCIPAL MANTIDO
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
          'User-Agent': 'Duri-Trading-Dashboard/2.0'
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

  // ✅ NOVO: DADOS NCM (TOP PRODUTOS)
  async getNCMRanking(
    flow: 'export' | 'import',
    period: { from: string; to: string },
    limit: number = 20
  ): Promise<NCMData[]> {
    console.log('📊 === BUSCANDO RANKING NCM ===');
    
    try {
      const request: ComexstatRequest = {
        flow,
        monthDetail: false, // Agregar por período total
        period,
        details: ['ncm'], // Detalhar por NCM
        metrics: ['metricFOB', 'metricKG']
      };

      const response = await this.getGeneralData(request);
      
      if (!response.data || !response.data.list) {
        console.log('❌ Nenhum dado NCM retornado');
        return [];
      }

      // Processar dados NCM
      const ncmData = response.data.list.map((item: any) => {
        console.log('🔍 Item NCM:', item);
        
        return {
          ncm: item.coNcm || item.ncm || 'N/A',
          descricao: item.noNcm || item.descricaoNcm || item.descricao || 'Produto não identificado',
          fob: parseFloat(item.metricFOB || item.vlFob || 0),
          kg: parseFloat(item.metricKG || item.kgLiq || 0),
          participacao: parseFloat(item.participacao || 0)
        };
      });

      // Ordenar por FOB e limitar resultados
      const sortedNCM = ncmData
        .filter((item: { fob: number; }) => item.fob > 0)
        .sort((a: { fob: number; }, b: { fob: number; }) => b.fob - a.fob)
        .slice(0, limit);

      console.log(`✅ TOP ${limit} NCMs processados:`, sortedNCM);
      return sortedNCM;

    } catch (error: any) {
      console.error('❌ Erro ao buscar ranking NCM:', error);
      return [];
    }
  }

  // ✅ NOVO: DADOS EMPRESAS (TOP CNPJ)
  async getEmpresasRanking(
    flow: 'export' | 'import',
    period: { from: string; to: string },
    limit: number = 20
  ): Promise<EmpresaData[]> {
    console.log('🏢 === BUSCANDO RANKING EMPRESAS ===');
    
    try {
      const request: ComexstatRequest = {
        flow,
        monthDetail: false,
        period,
        details: ['empresa'], // Detalhar por empresa
        metrics: ['metricFOB', 'metricKG']
      };

      const response = await this.getGeneralData(request);
      
      if (!response.data || !response.data.list) {
        console.log('❌ Nenhum dado de empresas retornado');
        return [];
      }

      // Processar dados de empresas
      const empresaData = response.data.list.map((item: any) => {
        console.log('🔍 Item Empresa:', item);
        
        return {
          cnpj: item.cnpj || item.coCnpj || 'N/A',
          razaoSocial: item.razaoSocial || item.noEmpresa || item.empresa || 'Empresa não identificada',
          fob: parseFloat(item.metricFOB || item.vlFob || 0),
          kg: parseFloat(item.metricKG || item.kgLiq || 0),
          participacao: parseFloat(item.participacao || 0),
          uf: item.uf || item.coUf || undefined
        };
      });

      // Ordenar por FOB e limitar resultados
      const sortedEmpresas = empresaData
        .filter((item: { fob: number; }) => item.fob > 0)
        .sort((a: { fob: number; }, b: { fob: number; }) => b.fob - a.fob)
        .slice(0, limit);

      console.log(`✅ TOP ${limit} Empresas processadas:`, sortedEmpresas);
      return sortedEmpresas;

    } catch (error: any) {
      console.error('❌ Erro ao buscar ranking empresas:', error);
      return [];
    }
  }

  // ✅ NOVO: DADOS COMBINADOS NCM + EMPRESAS
  async getCombinedRankings(
    flow: 'export' | 'import',
    period: { from: string; to: string }
  ): Promise<{
    ncm: NCMData[];
    empresas: EmpresaData[];
    resumo: {
      totalNCMs: number;
      totalEmpresas: number;
      valorTotal: number;
      pesoTotal: number;
    };
  }> {
    console.log('🎯 === BUSCANDO RANKINGS COMBINADOS ===');
    
    try {
      // Buscar dados simultaneamente
      const [ncmData, empresaData] = await Promise.all([
        this.getNCMRanking(flow, period, 15),
        this.getEmpresasRanking(flow, period, 15)
      ]);

      // Calcular resumo
      const valorTotal = ncmData.reduce((sum, item) => sum + item.fob, 0);
      const pesoTotal = ncmData.reduce((sum, item) => sum + item.kg, 0);

      const resultado = {
        ncm: ncmData,
        empresas: empresaData,
        resumo: {
          totalNCMs: ncmData.length,
          totalEmpresas: empresaData.length,
          valorTotal,
          pesoTotal
        }
      };

      console.log('✅ Rankings combinados processados:', resultado.resumo);
      return resultado;

    } catch (error: any) {
      console.error('❌ Erro ao buscar rankings combinados:', error);
      return {
        ncm: [],
        empresas: [],
        resumo: { totalNCMs: 0, totalEmpresas: 0, valorTotal: 0, pesoTotal: 0 }
      };
    }
  }

  // ✅ NOVO: DETALHES ESPECÍFICOS DE NCM
  async getNCMDetails(ncm: string, flow: 'export' | 'import', period: { from: string; to: string }): Promise<any> {
    console.log(`🔍 Buscando detalhes do NCM: ${ncm}`);
    
    try {
      const request: ComexstatRequest = {
        flow,
        monthDetail: true,
        period,
        details: ['ncm', 'pais'], // NCM + países
        filters: [{
          filter: 'ncm',
          values: [ncm]
        }],
        metrics: ['metricFOB', 'metricKG']
      };

      return await this.getGeneralData(request);

    } catch (error: any) {
      console.error(`❌ Erro ao buscar detalhes do NCM ${ncm}:`, error);
      return null;
    }
  }

  // ✅ NOVO: DETALHES ESPECÍFICOS DE EMPRESA
  async getEmpresaDetails(cnpj: string, flow: 'export' | 'import', period: { from: string; to: string }): Promise<any> {
    console.log(`🔍 Buscando detalhes da empresa: ${cnpj}`);
    
    try {
      const request: ComexstatRequest = {
        flow,
        monthDetail: true,
        period,
        details: ['empresa', 'ncm'], // Empresa + produtos
        filters: [{
          filter: 'empresa',
          values: [cnpj]
        }],
        metrics: ['metricFOB', 'metricKG']
      };

      return await this.getGeneralData(request);

    } catch (error: any) {
      console.error(`❌ Erro ao buscar detalhes da empresa ${cnpj}:`, error);
      return null;
    }
  }

  // ✅ MÉTODOS AUXILIARES MANTIDOS
  async getAvailableFilters(language: string = 'pt'): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/general/filters?language=${language}`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar filtros:', error);
      return null;
    }
  }

  async getAvailableDetails(language: string = 'pt'): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/general/details?language=${language}`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar detalhes:', error);
      return null;
    }
  }

  async getAvailableMetrics(language: string = 'pt'): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/general/metrics?language=${language}`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ Erro ao buscar métricas:', error);
      return null;
    }
  }

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

  // ✅ TESTE RÁPIDO EXPANDIDO
  async quickTestExpanded(): Promise<any> {
    console.log('⚡ === TESTE RÁPIDO EXPANDIDO ===');
    
    const period = { from: '2023-01', to: '2023-12' };
    
    try {
      // Testar todos os novos métodos
      const [
        generalData,
        ncmRanking,
        empresasRanking,
        combinedRankings
      ] = await Promise.all([
        this.getGeneralData({
          flow: 'export',
          monthDetail: true,
          period,
          metrics: ['metricFOB', 'metricKG']
        }),
        this.getNCMRanking('export', period, 5),
        this.getEmpresasRanking('export', period, 5),
        this.getCombinedRankings('export', period)
      ]);

      return {
        generalData: generalData.data?.list?.length || 0,
        ncmCount: ncmRanking.length,
        empresasCount: empresasRanking.length,
        combinedSummary: combinedRankings.resumo,
        success: true
      };

    } catch (error: any) {
      console.error('❌ Erro no teste expandido:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export único
export const comexstatService = new ComexStatService();

export type { 
  ComexstatRequest, 
  ComexstatResponse, 
  NCMData, 
  EmpresaData 
};