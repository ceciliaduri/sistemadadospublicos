// components/NCMRankingEnhanced.tsx - NCM com filtros geográficos e nomes reais
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, RefreshCw, MapPin, Filter, X, ChevronDown } from 'lucide-react';
import { ncmEnhancedService } from '../services/ncmEnhancedService';

interface NCMData {
  ncm: string;
  descricao: string;
  fob: number;
  kg: number;
  qtEstat: number;
  participacao: number;
  posicao: number;
  estado?: string;
}

interface FilterState {
  flow: 'export' | 'import';
  period: { from: string; to: string };
  selectedStates: number[];
  selectedRegions: string[];
  limit: number;
}

export const NCMRankingEnhanced: React.FC = () => {
  const [data, setData] = useState<NCMData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ✅ FILTROS ESTADO
  const [filters, setFilters] = useState<FilterState>({
    flow: 'export',
    period: { from: '2023-01', to: '2023-12' },
    selectedStates: [],
    selectedRegions: [],
    limit: 20
  });

  // ✅ DADOS ESTÁTICOS (para performance)
  const estados = ncmEnhancedService.getEstados();
  const regioes = ncmEnhancedService.getRegioes();

  // ✅ CORES PARA GRÁFICOS
  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6'];

  // ✅ CARREGAR DADOS
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔄 Carregando dados NCM com filtros geográficos...');
      
      const result = await ncmEnhancedService.getRankingComFiltros({
        flow: filters.flow,
        period: filters.period,
        states: filters.selectedStates.length > 0 ? filters.selectedStates : undefined,
        regions: filters.selectedRegions.length > 0 ? filters.selectedRegions : undefined,
        limit: filters.limit
      });

      console.log(`✅ ${result.length} NCMs carregados com nomes reais`);
      setData(result);

      if (result.length === 0) {
        setError('Nenhum dado encontrado para os filtros selecionados');
      }

    } catch (error: any) {
      console.error('❌ Erro ao carregar dados:', error);
      setError(`Erro ao carregar dados: ${error.message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ✅ MANIPULAÇÃO DE FILTROS
  const toggleState = (codigoEstado: number) => {
    setFilters(prev => ({
      ...prev,
      selectedStates: prev.selectedStates.includes(codigoEstado)
        ? prev.selectedStates.filter(id => id !== codigoEstado)
        : [...prev.selectedStates, codigoEstado]
    }));
  };

  const toggleRegion = (regiao: string) => {
    setFilters(prev => ({
      ...prev,
      selectedRegions: prev.selectedRegions.includes(regiao)
        ? prev.selectedRegions.filter(r => r !== regiao)
        : [...prev.selectedRegions, regiao]
    }));
  };

  const clearFilters = () => {
    setFilters(prev => ({
      ...prev,
      selectedStates: [],
      selectedRegions: []
    }));
  };

  const getSelectedStatesText = () => {
    const totalSelected = filters.selectedStates.length + 
      (filters.selectedRegions.length > 0 ? 
        filters.selectedRegions.reduce((acc, regiao) => 
          acc + ncmEnhancedService.getEstadosPorRegiao(regiao).length, 0) : 0);
    
    if (totalSelected === 0) return 'Todo o Brasil';
    if (totalSelected === 1) return '1 localização';
    return `${totalSelected} localizações`;
  };

  // ✅ FORMATAÇÃO
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `US$ ${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `US$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `US$ ${(value / 1000).toFixed(1)}K`;
    }
    return `US$ ${value.toFixed(0)}`;
  };

  const formatWeight = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M kg`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K kg`;
    }
    return `${value.toFixed(0)} kg`;
  };

  // ✅ HEADER COM CONTROLES
  const renderHeader = () => (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Package className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Ranking de Produtos (NCM) - {filters.flow === 'export' ? 'Exportação' : 'Importação'}
            </h2>
            <p className="text-gray-600">
              Produtos com nomes reais da API oficial e filtros por localização
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
              showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros Geográficos
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Indicadores de Filtros Ativos */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <select
              value={filters.flow}
              onChange={(e) => setFilters(prev => ({ ...prev, flow: e.target.value as 'export' | 'import' }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="export">Exportação</option>
              <option value="import">Importação</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-500">Período:</span>
            <input
              type="month"
              value={filters.period.from}
              onChange={(e) => setFilters(prev => ({ ...prev, period: { ...prev.period, from: e.target.value } }))}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">até</span>
            <input
              type="month"
              value={filters.period.to}
              onChange={(e) => setFilters(prev => ({ ...prev, period: { ...prev.period, to: e.target.value } }))}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{getSelectedStatesText()}</span>
          {(filters.selectedStates.length > 0 || filters.selectedRegions.length > 0) && (
            <button
              onClick={clearFilters}
              className="text-xs text-red-600 hover:text-red-800 flex items-center"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ✅ PAINEL DE FILTROS GEOGRÁFICOS
  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros por Localização</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Filtro por Região */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Regiões do Brasil</h4>
            <div className="space-y-2">
              {regioes.map(regiao => (
                <label key={regiao} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.selectedRegions.includes(regiao)}
                    onChange={() => toggleRegion(regiao)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{regiao}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    ({ncmEnhancedService.getEstadosPorRegiao(regiao).length} estados)
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Filtro por Estados */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Estados Específicos</h4>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {estados.map(estado => (
                <label key={estado.codigo} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.selectedStates.includes(estado.codigo)}
                    onChange={() => toggleState(estado.codigo)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {estado.uf} - {estado.nome}
                  </span>
                  <span className="ml-auto text-xs text-gray-500">{estado.regiao}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {filters.selectedStates.length > 0 && (
                <span>Estados selecionados: {filters.selectedStates.length}</span>
              )}
              {filters.selectedRegions.length > 0 && (
                <span className="ml-4">Regiões selecionadas: {filters.selectedRegions.length}</span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">Limite:</label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters(prev => ({ ...prev, limit: Number(e.target.value) }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ✅ ESTATÍSTICAS RESUMO
  const renderStats = () => {
    if (data.length === 0) return null;

    const totalFOB = data.reduce((sum, item) => sum + item.fob, 0);
    const totalKG = data.reduce((sum, item) => sum + item.kg, 0);
    const liderParticipacao = data[0]?.participacao || 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">NCMs Encontrados</p>
              <p className="text-2xl font-bold text-gray-900">{data.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 font-bold text-sm">$</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Volume Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalFOB)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 font-bold text-sm">kg</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Peso Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatWeight(totalKG)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-bold text-sm">%</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Líder do Ranking</p>
              <p className="text-2xl font-bold text-gray-900">{liderParticipacao.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ✅ GRÁFICOS
  const renderCharts = () => {
    if (data.length === 0) return null;

    const chartData = data.slice(0, 10).map(item => ({
      nome: item.descricao.length > 40 ? item.descricao.substring(0, 40) + '...' : item.descricao,
      nomeCompleto: item.descricao,
      ncm: item.ncm,
      fob: item.fob / 1000000, // Milhões
      participacao: item.participacao,
      estado: item.estado
    }));

    const pieData = data.slice(0, 8).map((item, index) => ({
      name: item.descricao.length > 25 ? item.descricao.substring(0, 25) + '...' : item.descricao,
      value: item.participacao,
      fob: item.fob
    }));

    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de Barras */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Produtos por Valor</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="horizontal" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => `$${value}M`} />
              <YAxis 
                dataKey="nome" 
                type="category" 
                width={180}
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                formatter={(value: any, name, props) => [
                  `${formatCurrency(props.payload.fob * 1000000)}`,
                  'Valor FOB'
                ]}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    const data = payload[0].payload;
                    return (
                      <div>
                        <p className="font-medium">{data.nomeCompleto}</p>
                        <p className="text-sm text-gray-600">NCM: {data.ncm}</p>
                        {data.estado && <p className="text-sm text-gray-600">Estados: {data.estado}</p>}
                      </div>
                    );
                  }
                  return label;
                }}
              />
              <Bar dataKey="fob" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Pizza */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Participação no Total (%)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={120}
                dataKey="value"
                label={({ name, value }) => `${value.toFixed(1)}%`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any, name, props) => [
                  `${value.toFixed(1)}%`,
                  'Participação'
                ]}
                labelFormatter={(label) => (
                  <div className="max-w-xs">
                    <p className="font-medium">{label}</p>
                  </div>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // ✅ TABELA DETALHADA
  const renderTable = () => {
    if (data.length === 0) return null;

    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Ranking Detalhado</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Posição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NCM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor FOB
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participação %
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peso (kg)
                </th>
                {(filters.selectedStates.length > 0 || filters.selectedRegions.length > 0) && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estados
                  </th>
                )}
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
                        {item.posicao}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {item.ncm}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs">
                      <p className="font-medium truncate">{item.descricao}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(item.fob)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.participacao.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatWeight(item.kg)}
                  </td>
                  {(filters.selectedStates.length > 0 || filters.selectedRegions.length > 0) && (
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="text-xs text-gray-600">{item.estado || 'N/A'}</span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ✅ ESTADOS DE ERRO E LOADING
  if (error) {
    return (
      <div className="space-y-6">
        {renderHeader()}
        {renderFilters()}
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <Package className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Erro ao carregar dados</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {renderHeader()}
        {renderFilters()}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-800">Carregando dados NCM com nomes reais da API oficial...</p>
          <p className="text-blue-600 text-sm mt-2">Buscando descrições completas dos produtos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderHeader()}
      {renderFilters()}
      {renderStats()}
      {renderCharts()}
      {renderTable()}
    </div>
  );
};

export default NCMRankingEnhanced;