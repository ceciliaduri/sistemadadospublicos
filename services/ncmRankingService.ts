// services/ncmRankingService.ts - NCM Ranking com dados reais da API ComexStat
import { comexstatServiceFixed } from './comexstatServiceFixed';

interface NCMRankingData {
  noNcm: string;
  description: any;
  ncm: string;
  descricao: string;
  fob: number;
  kg: number;
  qtEstat: number;
  participacao: number;
  posicao: number;
}

interface NCMRankingRequest {
  flow: 'export' | 'import';
  period: { from: string; to: string };
  monthDetail?: boolean;
  filters?: Array<{ filter: string; values: any[] }>;
  limit?: number;
}

class NCMRankingService {
  // ✅ BUSCAR RANKING NCM COM DADOS REAIS
  async getRanking(request: NCMRankingRequest): Promise<NCMRankingData[]> {
    console.log('📊 === NCM RANKING SERVICE - DADOS REAIS ===');
    console.log('Request:', JSON.stringify(request, null, 2));

    try {
      // Payload otimizado para NCM ranking
      const payload = {
        flow: request.flow,
        monthDetail: request.monthDetail || false,
        period: request.period,
        details: ['ncm'], // ✅ CRITICAL: NCM detalhamento
        metrics: ['metricFOB', 'metricKG', 'metricStatistic'],
        ...(request.filters && { filters: request.filters })
      };

      const response = await comexstatServiceFixed.getGeneralData(payload);
      
      if (!response?.data?.list || response.data.list.length === 0) {
        console.warn('⚠️ API retornou lista vazia');
        return [];
      }

      return this.processNCMRanking(response.data.list, request.limit || 20);

    } catch (error: any) {
      console.error('❌ Erro ao buscar ranking NCM:', error);
      throw new Error(`Falha ao obter dados NCM: ${error.message}`);
    }
  }

  // ✅ PROCESSAMENTO INTELIGENTE DOS DADOS NCM
  private processNCMRanking(rawData: any[], limit: number): NCMRankingData[] {
    console.log(`🔄 Processando ${rawData.length} registros NCM`);

    const ncmMap = new Map<string, {
      fob: number;
      kg: number;
      qtEstat: number;
      descricao: string;
    }>();

    let totalFOB = 0;

    // Consolidar dados por NCM
    rawData.forEach(item => {
      const fob = this.parseValue(item.metricFOB || item.vlFob);
      const kg = this.parseValue(item.metricKG || item.kgLiq);
      const qtEstat = this.parseValue(item.metricStatistic || item.qtEstat);
      
      const ncm = item.coNcm || item.ncm || item.codigo;
      const descricao = item.noNcm || item.descricao || item.description || `Produto NCM ${ncm}`;

      if (!ncm || fob <= 0) return;

      const existing = ncmMap.get(ncm) || { fob: 0, kg: 0, qtEstat: 0, descricao };
      
      ncmMap.set(ncm, {
        fob: existing.fob + fob,
        kg: existing.kg + kg,
        qtEstat: existing.qtEstat + qtEstat,
        descricao
      });

      totalFOB += fob;
    });

    // Converter para ranking ordenado
    const ranking = Array.from(ncmMap.entries())
      .map(([ncm, data]) => ({
        ncm,
        descricao: data.descricao,
        fob: data.fob,
        kg: data.kg,
        qtEstat: data.qtEstat,
        participacao: totalFOB > 0 ? (data.fob / totalFOB) * 100 : 0,
        posicao: 0 // será definido após ordenação
      }))
      .sort((a, b) => b.fob - a.fob)
      .slice(0, limit)
      .map((item, index) => ({ ...item, posicao: index + 1 }));

    console.log(`✅ Ranking processado: ${ranking.length} NCMs, Total FOB: ${totalFOB.toLocaleString()}`);
    
    return ranking;
  }

  // ✅ BUSCAR RANKING MENSAL (DADOS REAIS)
  async getMonthlyRanking(
    flow: 'export' | 'import',
    year: number,
    months: number[],
    limit: number = 20
  ): Promise<{ month: number; ranking: NCMRankingData[] }[]> {
    console.log(`📅 Buscando ranking mensal para ${year}, meses: ${months}`);

    const results = await Promise.allSettled(
      months.map(async month => {
        const monthStr = month.toString().padStart(2, '0');
        const period = { from: `${year}-${monthStr}`, to: `${year}-${monthStr}` };
        
        const ranking = await this.getRanking({
          flow,
          period,
          monthDetail: false,
          limit
        });

        return { month, ranking };
      })
    );

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);
  }

  // ✅ COMPARAÇÃO ANUAL NCM
  async getYearComparison(
    flow: 'export' | 'import',
    years: number[],
    limit: number = 10
  ): Promise<{ year: number; ranking: NCMRankingData[] }[]> {
    console.log(`📈 Comparação anual NCM: ${years}`);

    const results = await Promise.allSettled(
      years.map(async year => {
        const period = { from: `${year}-01`, to: `${year}-12` };
        
        const ranking = await this.getRanking({
          flow,
          period,
          monthDetail: false,
          limit
        });

        return { year, ranking };
      })
    );

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);
  }

  // ✅ FILTROS GEOGRÁFICOS NCM
  async getRankingByState(
    flow: 'export' | 'import',
    period: { from: string; to: string },
    stateIds: number[],
    limit: number = 20
  ): Promise<{ state: number; ranking: NCMRankingData[] }[]> {
    console.log(`🗺️ Ranking NCM por estados: ${stateIds}`);

    const results = await Promise.allSettled(
      stateIds.map(async stateId => {
        const ranking = await this.getRanking({
          flow,
          period,
          filters: [{ filter: 'state', values: [stateId] }],
          limit
        });

        return { state: stateId, ranking };
      })
    );

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);
  }

  // ✅ HELPER: Parse seguro de valores
  private parseValue(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  // ✅ HELPER: Validar período
  private validatePeriod(period: { from: string; to: string }): boolean {
    const fromRegex = /^\d{4}-\d{2}$/;
    const toRegex = /^\d{4}-\d{2}$/;
    
    return fromRegex.test(period.from) && toRegex.test(period.to);
  }

  // ✅ MÉTRICAS DO RANKING
  getTopNTrends(ranking: NCMRankingData[], topN: number = 5) {
    const top = ranking.slice(0, topN);
    const totalTop = top.reduce((sum, item) => sum + item.fob, 0);
    const totalGeneral = ranking.reduce((sum, item) => sum + item.fob, 0);
    
    return {
      topN,
      concentracao: totalGeneral > 0 ? (totalTop / totalGeneral) * 100 : 0,
      lider: top[0],
      crescimento: this.calculateGrowthTrend(top)
    };
  }

  private calculateGrowthTrend(data: NCMRankingData[]) {
    if (data.length < 2) return 0;
    
    // Simulação de tendência baseada na participação
    const weights = data.map((item, index) => item.participacao * (data.length - index));
    const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
    
    return avgWeight; // Valor indicativo de força do ranking
  }
}

export const ncmRankingService = new NCMRankingService();