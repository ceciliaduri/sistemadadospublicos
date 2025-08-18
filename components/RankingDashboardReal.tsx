// components/RankingDashboardReal.tsx - Dashboard com dados reais da API ComexStat
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Package, Building, Calendar, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { ncmRankingService } from '../services/ncmRankingService';
import { empresaRankingService } from '../services/empresaRankingService';

interface RankingFilters {
  flow: 'export' | 'import';
  viewType: 'annual' | 'monthly';
  year: number;
  months: number[];
  period: { from: string; to: string };
  limit: number;
}

export const RankingDashboardReal: React.FC = () => {
  // ✅ ESTADOS
  const [filters, setFilters] = useState<RankingFilters>({
    flow: 'export',
    viewType: 'annual',
    year: 2023,
    months: [],
    period: { from: '2023-01', to: '2023-12' },
    limit: 20
  });

  const [ncmData, setNcmData] = useState<any[]>([]);
  const [empresaData, setEmpresaData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataQuality, setDataQuality] = useState<any>(null);

  // ✅ ATUALIZAR PERÍODO BASEADO NOS FILTROS
  useEffect(() => {
    if (filters.viewType === 'annual') {
      setFilters(prev => ({
        ...prev,
        period: { from: `${prev.year}-01`, to: `${prev.year}-12` }
      }));
    } else if (filters.months.length > 0) {
      const minMonth = Math.min(...filters.months);
      const maxMonth = Math.max(...filters.months);
      setFilters(prev => ({
        ...prev,
        period: { 
          from: `${prev.year}-${minMonth.toString().padStart(2, '0')}`, 
          to: `${prev.year}-${maxMonth.toString().padStart(2, '0')}` 
        }
      }));
    }
  }, [filters.viewType, filters.year, filters.months]);

  // ✅ CARREGAR DADOS REAIS
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      console.log('📊 Carregando dados com filtros:', filters);

      // Carregar info de qualidade dos dados
      const qualityInfo = empresaRankingService.getDataQualityInfo();
      setDataQuality(qualityInfo);

      // Carregar NCM (dados reais 100% viáveis)
      const ncmPromise = filters.viewType === 'monthly' && filters.months.length > 0
        ? ncmRankingService.getMonthlyRanking(filters.flow, filters.year, filters.months, filters.limit)
        : ncmRankingService.getRanking({
            flow: filters.flow,
            period: filters.period,
            monthDetail: filters.viewType === 'monthly',
            limit: filters.limit
          });

      // Carregar empresas (dados por estado + exemplos)
      const empresaPromise = filters.viewType === 'monthly' && filters.months.length > 0
        ? empresaRankingService.getMensalPorEstado(filters.flow, filters.year, filters.months, filters.limit)
        : empresaRankingService.getRankingPorEstado(filters.flow, filters.period, filters.limit);

      const [ncmResult, empresaResult] = await Promise.allSettled([ncmPromise, empresaPromise]);

      // Processar NCM
      if (ncmResult.status === 'fulfilled') {
        const processedNCM = Array.isArray(ncmResult.value) 
          ? ncmResult.value 
          : ncmResult.value.flatMap((month: any) => month.ranking || []);
        setNcmData(processedNCM);
      } else {
        console.error('❌ Erro NCM:', ncmResult.reason);
        setNcmData([]);
      }

      // Processar empresas
      if (empresaResult.status === 'fulfilled') {
        const processedEmpresa = Array.isArray(empresaResult.value)
          ? empresaResult.value
          : empresaResult.value.flatMap((month: any) => month.ranking || []);
        setEmpresaData(processedEmpresa);
      } else {
        console.error('❌ Erro Empresas:', empresaResult.reason);
        setEmpresaData([]);
      }

    } catch (error: any) {
      console.error('❌ Erro geral:', error);
      setError(`Erro ao carregar dados: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ✅ CARREGAR DADOS NA INICIALIZAÇÃO
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ✅ COMPONENTE DE FILTROS
  const FilterPanel = () => (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Filtros de Consulta</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Fluxo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fluxo</label>
          <select
            value={filters.flow}
            onChange={(e) => setFilters(prev => ({ ...prev, flow: e.target.value as 'export' | 'import' }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="export">Exportação</option>
            <option value="import">Importação</option>
          </select>
        </div>

        {/* Tipo de visualização */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
          <select
            value={filters.viewType}
            onChange={(e) => setFilters(prev => ({ ...prev, viewType: e.target.value as 'annual' | 'monthly', months: [] }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="annual">Anual</option>
            <option value="monthly">Mensal</option>
          </select>
        </div>

        {/* Ano */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ano</label>
          <select
            value={filters.year}
            onChange={(e) => setFilters(prev => ({ ...prev, year: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            {[2024, 2023, 2022, 2021, 2020].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Limite */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Top</label>
          <select
            value={filters.limit}
            onChange={(e) => setFilters(prev => ({ ...prev, limit: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
          </select>
        </div>
      </div>

      {/* Seleção de meses (se mensal) */}
      {filters.viewType === 'monthly' && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Meses</label>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({length: 12}, (_, i) => i + 1).map(month => (
              <label key={month} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.months.includes(month)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFilters(prev => ({ ...prev, months: [...prev.months, month].sort() }));
                    } else {
                      setFilters(prev => ({ ...prev, months: prev.months.filter(m => m !== month) }));
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm">{month}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={loadData}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Carregando...' : 'Atualizar Dados'}
        </button>

        <div className="text-sm text-gray-600">
          Período: {filters.period.from} a {filters.period.to}
        </div>
      </div>
    </div>
  );

  // ✅ ALERTA DE QUALIDADE DOS DADOS
  const DataQualityAlert = () => {
    if (!dataQuality) return null;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Informações sobre Qualidade dos Dados</h4>
            <div className="mt-2 text-sm text-yellow-700">
              <p><strong>NCM:</strong> ✅ Dados reais da API ComexStat MDIC</p>
              <p><strong>Empresas:</strong> ⚠️ {dataQuality.empresas.observacoes[0]}</p>
              <p className="mt-1 text-xs">Disponível: Dados agregados por estado (100% reais) - SEM dados fictícios</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ✅ GRÁFICO NCM
  const NCMChart = () => {
    const chartData = ncmData.slice(0, 10).map(item => ({
      ncm: item.ncm,
      descricao: item.descricao.length > 30 ? item.descricao.substring(0, 30) + '...' : item.descricao,
      fob: item.fob / 1000000, // Milhões
      participacao: item.participacao
    }));

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Ranking NCM - {filters.flow === 'export' ? 'Exportação' : 'Importação'}</h3>
          <div className="flex items-center text-sm text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            Dados Reais MDIC
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="descricao" type="category" width={200} />
            <Tooltip formatter={(value: any) => [`US$ ${value.toFixed(1)}M`, 'FOB']} />
            <Bar dataKey="fob" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 text-xs text-gray-500">
          Total de {ncmData.length} NCMs encontrados. Valores em milhões de dólares (FOB).
        </div>
      </div>
    );
  };

  // ✅ GRÁFICO EMPRESAS/ESTADOS
  const EmpresaChart = () => {
    const chartData = empresaData.slice(0, 10).map(item => ({
      nome: item.nome.length > 40 ? item.nome.substring(0, 40) + '...' : item.nome,
      fob: item.fob / 1000000,
      tipo: item.tipo,
      participacao: item.participacao
    }));

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Ranking por Estado/Região - {filters.flow === 'export' ? 'Exportação' : 'Importação'}</h3>
          <div className="flex items-center text-sm text-orange-600">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Dados Agregados
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="nome" type="category" width={250} />
            <Tooltip formatter={(value: any) => [`US$ ${value.toFixed(1)}M`, 'FOB']} />
            <Bar dataKey="fob" fill="#F59E0B" />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 text-xs text-gray-500">
          {empresaData.filter(item => item.tipo === 'ESTADO').length} estados com dados reais da API MDIC
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Ranking Completo - NCM e Empresas
        </h2>
        <p className="text-gray-600">
          Análise detalhada com dados reais da API ComexStat MDIC e estratégia realista para empresas
        </p>
      </div>

      {/* Alertas de qualidade */}
      <DataQualityAlert />

      {/* Filtros */}
      <FilterPanel />

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-800">Carregando dados da API ComexStat...</p>
        </div>
      )}

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NCMChart />
          <EmpresaChart />
        </div>
      )}

      {/* Summary Stats */}
      {!loading && (ncmData.length > 0 || empresaData.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Estatísticas Resumo</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{ncmData.length}</div>
              <div className="text-sm text-gray-600">NCMs Identificados</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {ncmData.length > 0 ? `${(ncmData[0]?.participacao || 0).toFixed(1)}%` : '0%'}
              </div>
              <div className="text-sm text-gray-600">Participação Líder NCM</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{empresaData.length}</div>
              <div className="text-sm text-gray-600">Estados/Regiões</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                US$ {((ncmData.reduce((sum, item) => sum + item.fob, 0) + empresaData.reduce((sum, item) => sum + item.fob, 0)) / 1000000000).toFixed(1)}B
              </div>
              <div className="text-sm text-gray-600">Volume Total</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankingDashboardReal;