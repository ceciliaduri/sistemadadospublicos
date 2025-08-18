// services/empresaRankingService.ts - Estratégia realista para dados empresariais
import { comexstatServiceFixed } from './comexstatServiceFixed';

interface EmpresaRankingData {
  identificador: string;
  nome: string;
  tipo: 'ESTADO' | 'REGIAO' | 'EXEMPLO';
  fob: number;
  kg: number;
  participacao: number;
  posicao: number;
  observacao?: string;
}

interface RegionalData {
  estado: string;
  uf: string;
  codigo: number;
  fob: number;
  kg: number;
}

class EmpresaRankingService {
  // ✅ RANKING POR ESTADO (DADOS REAIS DISPONÍVEIS)
  async getRankingPorEstado(
    flow: 'export' | 'import',
    period: { from: string; to: string },
    limit: number = 20
  ): Promise<EmpresaRankingData[]> {
    console.log('🗺️ === RANKING POR ESTADO (DADOS REAIS) ===');

    try {
      const payload = {
        flow,
        monthDetail: false,
        period,
        details: ['state'], // ✅ SUPORTADO pela API
        metrics: ['metricFOB', 'metricKG']
      };

      const response = await comexstatServiceFixed.getGeneralData(payload);
      
      if (!response?.data?.list) {
        throw new Error('Dados estaduais não disponíveis na API');
      }

      return this.processEstadualData(response.data.list, limit);

    } catch (error: any) {
      console.error('❌ Erro ao buscar dados por estado:', error);
      
      // ❌ SEM MOCK DATA - retornar array vazio
      return [];
    }
  }

  // ✅ PROCESSAMENTO DADOS POR ESTADO
  private processEstadualData(rawData: any[], limit: number): EmpresaRankingData[] {
    console.log(`🔄 Processando ${rawData.length} registros estaduais`);

    const estadoMap = new Map<string, { fob: number; kg: number; nome: string; codigo: number }>();
    let totalFOB = 0;

    rawData.forEach(item => {
      const fob = this.parseValue(item.metricFOB || item.vlFob);
      const kg = this.parseValue(item.metricKG || item.kgLiq);
      
      const codigo = item.coUf || item.state || item.uf;
      const nome = item.noUf || item.estado || this.getEstadoNome(codigo) || `Estado ${codigo}`;

      if (!codigo || fob <= 0) return;

      const existing = estadoMap.get(codigo) || { fob: 0, kg: 0, nome, codigo: Number(codigo) };
      
      estadoMap.set(codigo, {
        fob: existing.fob + fob,
        kg: existing.kg + kg,
        nome,
        codigo: Number(codigo)
      });

      totalFOB += fob;
    });

    const ranking = Array.from(estadoMap.entries())
      .map(([codigo, data]) => ({
        identificador: codigo,
        nome: `Estado: ${data.nome}`,
        tipo: 'ESTADO' as const,
        fob: data.fob,
        kg: data.kg,
        participacao: totalFOB > 0 ? (data.fob / totalFOB) * 100 : 0,
        posicao: 0,
        observacao: 'Dados agregados por estado - fonte oficial MDIC'
      }))
      .sort((a, b) => b.fob - a.fob)
      .slice(0, limit)
      .map((item, index) => ({ ...item, posicao: index + 1 }));

    console.log(`✅ Ranking estadual: ${ranking.length} estados`);
    return ranking;
  }

  // ❌ MOCK DATA REMOVIDO - APENAS DADOS REAIS DA API

  // ✅ ANÁLISE REGIONAL DETALHADA
  async getAnaliseRegional(
    flow: 'export' | 'import',
    period: { from: string; to: string }
  ): Promise<{ regiao: string; estados: RegionalData[]; total: number }[]> {
    console.log('🌎 Análise regional detalhada');

    try {
      const rankingEstados = await this.getRankingPorEstado(flow, period, 27);
      
      // Agrupar por região
      const regioes = {
        'Sudeste': ['SP', 'RJ', 'MG', 'ES'],
        'Sul': ['RS', 'SC', 'PR'],
        'Nordeste': ['BA', 'PE', 'CE', 'AL', 'PB', 'RN', 'SE', 'MA', 'PI'],
        'Norte': ['AM', 'PA', 'AC', 'RO', 'RR', 'AP', 'TO'],
        'Centro-Oeste': ['MT', 'MS', 'GO', 'DF']
      };

      return Object.entries(regioes).map(([regiao, ufs]) => {
        const estadosRegiao = rankingEstados
          .filter(estado => {
            const uf = this.getUFPorCodigo(estado.identificador);
            return ufs.includes(uf);
          })
          .map(estado => ({
            estado: estado.nome,
            uf: this.getUFPorCodigo(estado.identificador),
            codigo: Number(estado.identificador),
            fob: estado.fob,
            kg: estado.kg
          }));

        const total = estadosRegiao.reduce((sum, est) => sum + est.fob, 0);

        return { regiao, estados: estadosRegiao, total };
      }).sort((a, b) => b.total - a.total);

    } catch (error) {
      console.error('❌ Erro na análise regional:', error);
      return [];
    }
  }

  // ✅ DADOS MENSAIS POR ESTADO
  async getMensalPorEstado(
    flow: 'export' | 'import',
    year: number,
    months: number[],
    topEstados: number = 5
  ): Promise<{ month: number; ranking: EmpresaRankingData[] }[]> {
    console.log(`📅 Dados mensais por estado - ${year}`);

    const results = await Promise.allSettled(
      months.map(async month => {
        const monthStr = month.toString().padStart(2, '0');
        const period = { from: `${year}-${monthStr}`, to: `${year}-${monthStr}` };
        
        const ranking = await this.getRankingPorEstado(flow, period, topEstados);
        
        return { month, ranking };
      })
    );

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);
  }

  // ✅ ALERTAS E LIMITAÇÕES - SEM DADOS DE EXEMPLO
  getDataQualityInfo(): {
    empresas: { disponivel: boolean; observacoes: string[] };
    alternativas: { tipo: string; descricao: string; viabilidade: number }[];
  } {
    return {
      empresas: {
        disponivel: false,
        observacoes: [
          'API ComexStat pública não fornece dados por CNPJ/empresa',
          'Dados empresariais requerem acesso especial aos sistemas SISCOMEX',
          'Informações por estado/região estão disponíveis com dados reais',
          'SEM dados de exemplo - apenas dados reais da API oficial'
        ]
      },
      alternativas: [
        {
          tipo: 'Ranking por Estado',
          descricao: 'Dados reais agregados por UF - fonte oficial MDIC',
          viabilidade: 100
        },
        {
          tipo: 'Análise Regional',
          descricao: 'Agrupamento por regiões geográficas com dados reais',
          viabilidade: 100
        },
        {
          tipo: 'Integração Externa',
          descricao: 'APIs Receita Federal, CNPJ.ws para dados empresariais',
          viabilidade: 60
        }
      ]
    };
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

  private getUFPorCodigo(codigo: string): string {
    const ufs: Record<string, string> = {
      '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP',
      '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB',
      '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES',
      '33': 'RJ', '35': 'SP', '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS',
      '51': 'MT', '52': 'GO', '53': 'DF'
    };
    return ufs[codigo] || codigo;
  }
}

export const empresaRankingService = new EmpresaRankingService();