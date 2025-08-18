// components/NCMRankingFixedVisual.tsx - NCM com visualização corrigida
'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Package, RefreshCw, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { ncmRankingService } from '../services/ncmRankingService';

interface NCMData {
  ncm: string;
  descricao: string;
  fob: number;
  kg: number;
  qtEstat: number;
  participacao: number;
  posicao: number;
}

interface NCMFilters {
  flow: 'export' | 'import';
  year: number;
  monthFrom: number;
  monthTo: number;
  limit: number;
  state?: number[]; // ✅ NOVO: Filtro por estados
  region?: string[]; // ✅ NOVO: Filtro por regiões
}

export const NCMRankingFixedVisual: React.FC = () => {
  const [data, setData] = useState<NCMData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [filters, setFilters] = useState<NCMFilters>({
    flow: 'import',
    year: 2022,
    monthFrom: 1,
    monthTo: 12,
    limit: 20,
    state: [], // ✅ NOVO: Estados selecionados
    region: [] // ✅ NOVO: Regiões selecionadas
  });

  // ✅ DADOS REAIS: Estados brasileiros (códigos oficiais IBGE)
  const estados = [
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

  // ✅ REGIÕES BRASILEIRAS
  const regioes = ['Norte', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste'];

  // ✅ CARREGAR DADOS - APENAS DADOS REAIS DA API
  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Carregando dados NCM - APENAS DADOS REAIS DA API...');
      
      const period = {
        from: `${filters.year}-${filters.monthFrom.toString().padStart(2, '0')}`,
        to: `${filters.year}-${filters.monthTo.toString().padStart(2, '0')}`
      };

      console.log('📅 Período:', period);
      console.log('🗺️ Filtros geográficos:', { states: filters.state, regions: filters.region });

      // ✅ PREPARAR FILTROS GEOGRÁFICOS
      const apiFilters: any[] = [];
      
      // Filtro por estados (se selecionados)
      if (filters.state && filters.state.length > 0) {
        apiFilters.push({
          filter: 'state',
          values: filters.state
        });
      }
      
      // Filtro por regiões (converter regiões em estados)
      if (filters.region && filters.region.length > 0) {
        const estadosDasRegioes = estados
          .filter(estado => filters.region!.includes(estado.regiao))
          .map(estado => estado.codigo);
        
        if (estadosDasRegioes.length > 0) {
          // Se já tem filtro de estado, combinar; senão, criar novo
          const estadoFilter = apiFilters.find(f => f.filter === 'state');
          if (estadoFilter) {
            estadoFilter.values = [...new Set([...estadoFilter.values, ...estadosDasRegioes])];
          } else {
            apiFilters.push({
              filter: 'state',
              values: estadosDasRegioes
            });
          }
        }
      }

      const result = await ncmRankingService.getRanking({
        flow: filters.flow,
        period,
        monthDetail: false,
        limit: filters.limit,
        filters: apiFilters.length > 0 ? apiFilters : undefined
      });

      console.log('📊 Resultado da API:', result);

      if (result && result.length > 0) {
        // ✅ PROCESSAR DADOS - APENAS NOMES REAIS DA API
        const processedData = result.map((item, index) => {
          console.log(`🔍 Item ${index}:`, {
            ncm: item.ncm,
            descricao: item.descricao,
            noNcm: item.noNcm,
            description: item.description,
            fob: item.fob,
            rawItem: item
          });

          // ✅ USAR APENAS DADOS REAIS DA API - SEM MOCK
          const realName = item.descricao || item.noNcm || item.description || '';
          
          // ❌ REMOVIDO: Mock data mapping
          // Se não tem nome real da API, mostrar apenas código NCM
          const finalName = realName.length > 3 && !realName.includes('Produto NCM') 
            ? realName 
            : `NCM ${item.ncm}`;

          return {
            ...item,
            descricao: finalName,
            fob: Number(item.fob) || 0,
            participacao: Number(item.participacao) || 0
          };
        });

        console.log('✅ Dados processados (apenas dados reais):', processedData);
        setData(processedData);
        setError('');
      } else {
        console.log('⚠️ Nenhum dado retornado');
        setData([]);
        setError('Nenhum dado NCM encontrado para o período e filtros selecionados');
      }

    } catch (error: any) {
      console.error('❌ Erro ao carregar NCM:', error);
      setError(`Erro ao carregar dados: ${error.message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  // ✅ DADOS PARA O GRÁFICO DE PIZZA (corrigido)
  const chartData = data.slice(0, 8).map((item, index) => ({
    name: item.descricao.length > 30 ? item.descricao.substring(0, 30) + '...' : item.descricao,
    fullName: item.descricao,
    ncm: item.ncm,
    value: Number(item.fob) || 0, // Valor real FOB
    fobFormatted: Math.round((item.fob || 0) / 1000000), // Milhões para display
    participacao: Number(item.participacao) || 0,
    color: `hsl(${(index * 45) % 360}, 70%, 50%)` // Cores diferentes para cada fatia
  })).filter(item => item.value > 0); // Garantir que só temos valores > 0

  // ✅ CORES PARA O GRÁFICO DE PIZZA
  const COLORS = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#6B7280', '#84CC16'
  ];

  // ✅ MÉTRICAS DE RESUMO
  const totalFOB = data.reduce((sum, item) => sum + item.fob, 0);
  const totalKG = data.reduce((sum, item) => sum + item.kg, 0);
  const topParticipacao = data[0]?.participacao || 0;

  // ✅ TOOLTIP CUSTOMIZADO PARA PIZZA
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">NCM: {data.ncm}</p>
          <p className="text-sm text-gray-700 mb-2">{data.fullName}</p>
          <p className="text-sm text-blue-600">
            FOB: US$ {data.fobFormatted}M
          </p>
          <p className="text-sm text-green-600">
            Participação: {data.participacao.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // ✅ LABEL CUSTOMIZADO PARA PIZZA
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Não mostrar labels para fatias muito pequenas
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header com Filtros Integrados */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ranking NCM</h2>
            <p className="text-gray-600">
              Período: {filters.year}-{filters.monthFrom.toString().padStart(2, '0')} a {filters.year}-{filters.monthTo.toString().padStart(2, '0')}
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </>
            )}
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fluxo</label>
            <select
              value={filters.flow}
              onChange={(e) => setFilters(prev => ({ ...prev, flow: e.target.value as 'export' | 'import' }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="export">Exportação</option>
              <option value="import">Importação</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              {[2024, 2023, 2022, 2021, 2020].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mês Inicial</label>
            <select
              value={filters.monthFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, monthFrom: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{month.toString().padStart(2, '0')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mês Final</label>
            <select
              value={filters.monthTo}
              onChange={(e) => setFilters(prev => ({ ...prev, monthTo: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{month.toString().padStart(2, '0')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Top</label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters(prev => ({ ...prev, limit: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
            </select>
          </div>
        </div>
      </div>

      {/* ✅ RESUMO DOS DADOS (MOVIDO PARA CIMA) */}
      {!loading && data.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Resumo dos Dados</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{data.length}</div>
              <div className="text-sm text-gray-600">NCMs Encontrados</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-green-600">
                US$ {(totalFOB / 1000000000).toFixed(1)}B
              </div>
              <div className="text-sm text-gray-600">Volume Total</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {topParticipacao.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Participação Líder</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {(totalKG / 1000000000).toFixed(1)}B kg
              </div>
              <div className="text-sm text-gray-600">Peso Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-800">Carregando dados NCM...</p>
        </div>
      )}

      {/* ✅ GRÁFICO DE PIZZA CORRIGIDO */}
      {!loading && data.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">
            Ranking NCM - {filters.flow === 'export' ? 'Exportação' : 'Importação'}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Pizza */}
            <div>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="participacao"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda com valores */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 mb-4">Top {chartData.length} NCMs</h4>
              {chartData.map((item, index) => (
                <div key={item.ncm} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded mr-3"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">NCM {item.ncm}</p>
                      <p className="text-xs text-gray-600" title={item.fullName}>
                        {item.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-gray-900">
                      {item.participacao.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600">
                      US$ {item.fobFormatted}M
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-500 text-center">
            Distribuição por participação percentual - {chartData.length} produtos exibidos
          </div>
        </div>
      )}

      {/* ✅ TABELA DETALHADA (NOVA) */}
      {!loading && data.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Detalhamento por NCM</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código NCM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome do Produto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor FOB (US$)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participação %
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Peso (KG)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, index) => (
                  <tr key={item.ncm} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index < 3 ? 'bg-yellow-500' : index < 10 ? 'bg-blue-500' : 'bg-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.ncm}
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={item.descricao}>
                        {item.descricao || `NCM ${item.ncm}`}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      <div className="font-medium">
                        {item.fob.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      <div className="flex items-center justify-end">
                        <div className="w-12 text-right font-medium">
                          {item.participacao.toFixed(1)}%
                        </div>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(item.participacao * 2, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.kg.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-500 text-center">
            Exibindo {data.length} de {data.length} NCMs encontrados
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && data.length === 0 && !error && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum NCM encontrado</h3>
          <p className="text-gray-600">
            Não há dados disponíveis para o período selecionado. Tente ajustar os filtros.
          </p>
        </div>
      )}
    </div>
  );
};

export default NCMRankingFixedVisual;