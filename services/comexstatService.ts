// services/comexstatService.ts - Versão Final Limpa
const API_BASE = 'https://api-comexstat.mdic.gov.br';

interface ComexstatRequest {
  flow: 'export' | 'import';
  monthDetail: boolean;
  period: {
    from: string;
    to: string;
  };
  metrics?: string[];
}

interface ComexstatResponse {
  data: any;
  success: boolean;
  message?: string;
}

class ComexStatService {
  
  // Método principal - simples e direto
  async getGeneralData(request: ComexstatRequest): Promise<ComexstatResponse> {
    const payload = {
      flow: request.flow,
      monthDetail: request.monthDetail,
      period: request.period,
      metrics: request.metrics || ['metricFOB', 'metricKG']
    };

    console.log('🚀 Requisição:', JSON.stringify(payload, null, 2));

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
        throw new Error(`${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Response:', data);
      
      return data;

    } catch (error: any) {
      console.error('❌ Erro:', error);
      throw error;
    }
  }

  // Health check básico
  async healthCheck(): Promise<{ status: boolean, message: string }> {
    try {
      const response = await fetch(`${API_BASE}/general/dates/years`);
      return {
        status: response.ok,
        message: response.ok ? 'API operacional' : `Erro ${response.status}`
      };
    } catch (error: any) {
      return {
        status: false,
        message: `Erro: ${error.message}`
      };
    }
  }
}

// Export único e simples
export const comexstatService = new ComexStatService();

export type { ComexstatRequest, ComexstatResponse };