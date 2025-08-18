// services/ncmEnhancedService.ts - Service aprimorado para NCM com nomes reais da API
import { comexstatServiceFixed } from './comexstatServiceFixed';

const API_BASE = 'https://api-comexstat.mdic.gov.br';

interface NCMEnhancedData {
  ncm: string;
  descricao: string;
  fob: number;
  kg: number;
  qtEstat: number;
  participacao: number;
  posicao: number;
  estado?: string;
  uf?: string;
}

interface NCMFilters {
  flow: 'export' | 'import';
  period: { from: string; to: string };
  states?: number[];
  regions?: string[];
  limit?: number;
}

class NCMEnhancedService {
  private ncmNamesCache = new Map<string, string>();
  private statesCache: any[] | null = null;

  // ✅ ESTADOS BRASILEIROS OFICIAIS (IBGE)
  private readonly ESTADOS_BRASIL = [
    { codigo: 11, nome: 'Rondônia', uf: 'RO', regiao: 'Norte' },
    { codigo: 12, nome: 'Acre', uf: 'AC', regiao: 'Norte' },
    { codigo: 13, nome: 'Amazonas', uf: 'AM', regiao: 'Norte' },
    { codigo: 14, nome: 'Roraima', uf: 'RR', regiao: 'Norte' },
    { codigo: 15, nome: 'Pará', uf: 'PA', regiao: 'Norte' },
    { codigo: 16, nome: 'Amapá', uf: 'AP', regiao: 'Norte' },
    { codigo: 17, nome: 'Tocantins', uf: 'TO', regiao: 'Norte' },
    { codigo: 21, nome: 'Maranhão', uf: 'MA', regiao: 'Nordeste' },
    { codigo: 22, nome: 'Piauí', uf: 'PI', regiao: 'Nordeste' },
    { codigo: 23, nome: 'Ceará', uf: 'CE', regiao: 'Nordeste' },
    { codigo: 24, nome: 'Rio Grande do Norte', uf: 'RN', regiao: 'Nordeste' },
    { codigo: 25, nome: 'Paraíba', uf: 'PB', regiao: 'Nordeste' },
    { codigo: 26, nome: 'Pernambuco', uf: 'PE', regiao: 'Nordeste' },
    { codigo: 27, nome: 'Alagoas', uf: 'AL', regiao: 'Nordeste' },
    { codigo: 28, nome: 'Sergipe', uf: 'SE', regiao: 'Nordeste' },
    { codigo: 29, nome: 'Bahia', uf: 'BA', regiao: 'Nordeste' },
    { codigo: 31, nome: 'Minas Gerais', uf: 'MG', regiao: 'Sudeste' },
    { codigo: 32, nome: 'Espírito Santo', uf: 'ES', regiao: 'Sudeste' },
    { codigo: 33, nome: 'Rio de Janeiro', uf: 'RJ', regiao: 'Sudeste' },
    { codigo: 35, nome: 'São Paulo', uf: 'SP', regiao: 'Sudeste' },
    { codigo: 41, nome: 'Paraná', uf: 'PR', regiao: 'Sul' },
    { codigo: 42, nome: 'Santa Catarina', uf: 'SC', regiao: 'Sul' },
    { codigo: 43, nome: 'Rio Grande do Sul', uf: 'RS', regiao: 'Sul' },
    { codigo: 50, nome: 'Mato Grosso do Sul', uf: 'MS', regiao: 'Centro-Oeste' },
    { codigo: 51, nome: 'Mato Grosso', uf: 'MT', regiao: 'Centro-Oeste' },
    { codigo: 52, nome: 'Goiás', uf: 'GO', regiao: 'Centro-Oeste' },
    { codigo: 53, nome: 'Distrito Federal', uf: 'DF', regiao: 'Centro-Oeste' }
  ];

  private readonly REGIOES_BRASIL = ['Norte', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste'];

  // ✅ BUSCAR NOME REAL DO NCM DA API OFICIAL
  async buscarNomeNCM(codigoNCM: string): Promise<string> {
    // Verificar cache primeiro
    if (this.ncmNamesCache.has(codigoNCM)) {
      return this.ncmNamesCache.get(codigoNCM)!;
    }

    try {
      console.log(`🔍 Buscando nome para NCM ${codigoNCM} na API oficial...`);
      
      // Buscar na tabela NCM oficial
      const response = await fetch(`${API_BASE}/tables/ncm/${codigoNCM}?language=pt`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data) {
          const nomeReal = data.data.noNcm || data.data.description || data.data.nome;
          
          if (nomeReal && nomeReal.length > 3) {
            console.log(`✅ Nome encontrado para NCM ${codigoNCM}: ${nomeReal}`);
            this.ncmNamesCache.set(codigoNCM, nomeReal);
            return nomeReal;
          }
        }
      }

      // Se não encontrou, buscar na lista completa de NCM
      return await this.buscarNCMNaListaCompleta(codigoNCM);

    } catch (error) {
      console.warn(`⚠️ Erro ao buscar NCM ${codigoNCM}:`, error);
      return `Produto NCM ${codigoNCM}`;
    }
  }

  // ✅ BUSCAR NCM NA LISTA COMPLETA COMO FALLBACK
  private async buscarNCMNaListaCompleta(codigoNCM: string): Promise<string> {
    try {
      console.log(`🔍 Buscando NCM ${codigoNCM} na lista completa...`);
      
      const response = await fetch(`${API_BASE}/tables/ncm?search=${codigoNCM}&language=pt&perPage=1`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data && data.data.list && data.data.list.length > 0) {
          const item = data.data.list[0];
          const nomeReal = item.noNcm || item.description || item.nome;
          
          if (nomeReal && nomeReal.length > 3) {
            console.log(`✅ Nome encontrado na lista para NCM ${codigoNCM}: ${nomeReal}`);
            this.ncmNamesCache.set(codigoNCM, nomeReal);
            return nomeReal;
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Erro na busca completa para NCM ${codigoNCM}:`, error);
    }

    return `Produto NCM ${codigoNCM}`;
  }

  // ✅ BUSCAR RANKING NCM COM FILTROS E NOMES REAIS
  async getRankingComFiltros(filtros: NCMFilters): Promise<NCMEnhancedData[]> {
    console.log('📊 === BUSCANDO RANKING NCM COM FILTROS GEOGRÁFICOS ===');
    console.log('Filtros aplicados:', filtros);

    try {
      // Preparar filtros da API
      const apiFilters: any[] = [];

      // Filtro por estados específicos
      if (filtros.states && filtros.states.length > 0) {
        apiFilters.push({
          filter: 'state',
          values: filtros.states
        });
      }

      // Filtro por regiões (converter para estados)
      if (filtros.regions && filtros.regions.length > 0) {
        const estadosDasRegioes = this.ESTADOS_BRASIL
          .filter(estado => filtros.regions!.includes(estado.regiao))
          .map(estado => estado.codigo);

        if (estadosDasRegioes.length > 0) {
          const estadoFilter = apiFilters.find(f => f.filter === 'state');
          if (estadoFilter) {
            // Combinar com filtros de estado existentes
            estadoFilter.values = [...new Set([...estadoFilter.values, ...estadosDasRegioes])];
          } else {
            apiFilters.push({
              filter: 'state',
              values: estadosDasRegioes
            });
          }
        }
      }

      // Buscar dados da API
      const payload = {
        flow: filtros.flow,
        monthDetail: false,
        period: filtros.period,
        details: ['ncm', 'state'], // NCM + Estado para análise completa
        metrics: ['metricFOB', 'metricKG', 'metricStatistic'],
        filters: apiFilters.length > 0 ? apiFilters : undefined
      };

      console.log('🚀 Payload da API:', JSON.stringify(payload, null, 2));

      const response = await comexstatServiceFixed.getGeneralData(payload);

      if (!response?.data?.list || response.data.list.length === 0) {
        console.warn('⚠️ Nenhum dado retornado da API');
        return [];
      }

      console.log(`📊 Processando ${response.data.list.length} registros...`);

      // Processar e enriquecer dados
      const dadosProcessados = await this.processarDadosComNomesReais(response.data.list);

      // Ordenar e limitar
      const ranking = dadosProcessados
        .sort((a, b) => b.fob - a.fob)
        .slice(0, filtros.limit || 20)
        .map((item, index) => ({ ...item, posicao: index + 1 }));

      console.log(`✅ Ranking finalizado com ${ranking.length} itens`);
      return ranking;

    } catch (error: any) {
      console.error('❌ Erro ao buscar ranking NCM:', error);
      throw new Error(`Erro ao buscar dados NCM: ${error.message}`);
    }
  }

  // ✅ PROCESSAR DADOS E BUSCAR NOMES REAIS
  private async processarDadosComNomesReais(rawData: any[]): Promise<NCMEnhancedData[]> {
    const ncmMap = new Map<string, {
      fob: number;
      kg: number;
      qtEstat: number;
      estados: Set<string>;
    }>();

    let totalFOB = 0;

    // Consolidar dados por NCM
    rawData.forEach(item => {
      const fob = this.parseValue(item.metricFOB || item.vlFob);
      const kg = this.parseValue(item.metricKG || item.kgLiq);
      const qtEstat = this.parseValue(item.metricStatistic || item.qtEstat);
      
      const ncm = item.coNcm || item.ncm || item.codigo;
      const estado = item.coUf || item.state;

      if (!ncm || fob <= 0) return;

      const existing = ncmMap.get(ncm) || { 
        fob: 0, 
        kg: 0, 
        qtEstat: 0, 
        estados: new Set() 
      };

      existing.fob += fob;
      existing.kg += kg;
      existing.qtEstat += qtEstat;
      
      if (estado) {
        existing.estados.add(estado.toString());
      }

      ncmMap.set(ncm, existing);
      totalFOB += fob;
    });

    // Buscar nomes reais para todos os NCMs
    const ncmsComNomes: NCMEnhancedData[] = [];

    for (const [ncm, dados] of ncmMap.entries()) {
      const nomeReal = await this.buscarNomeNCM(ncm);
      
      // Informações sobre estados onde o NCM aparece
      const estadosInfo = Array.from(dados.estados).map(codigoEstado => {
        const estado = this.ESTADOS_BRASIL.find(e => e.codigo.toString() === codigoEstado);
        return estado ? `${estado.uf}` : codigoEstado;
      }).join(', ');

      ncmsComNomes.push({
        ncm,
        descricao: nomeReal,
        fob: dados.fob,
        kg: dados.kg,
        qtEstat: dados.qtEstat,
        participacao: totalFOB > 0 ? (dados.fob / totalFOB) * 100 : 0,
        posicao: 0, // Será definido após ordenação
        estado: estadosInfo.length > 0 ? estadosInfo : undefined
      });
    }

    return ncmsComNomes;
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

  // ✅ GETTERS PARA COMPONENTES
  getEstados() {
    return this.ESTADOS_BRASIL;
  }

  getRegioes() {
    return this.REGIOES_BRASIL;
  }

  getEstadosPorRegiao(regiao: string) {
    return this.ESTADOS_BRASIL.filter(estado => estado.regiao === regiao);
  }

  // ✅ BUSCAR ESTADOS DISPONÍVEIS NA API (se necessário)
  async getEstadosDisponiveis(): Promise<any[]> {
    if (this.statesCache) {
      return this.statesCache;
    }

    try {
      const response = await fetch(`${API_BASE}/tables/uf?language=pt`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data && data.data.list) {
          this.statesCache = data.data.list;
          return this.statesCache;
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar estados da API:', error);
    }

    // Fallback para lista local
    return this.ESTADOS_BRASIL;
  }
}

export const ncmEnhancedService = new NCMEnhancedService();