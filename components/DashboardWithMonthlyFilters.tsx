// components/DashboardWithMonthlyFilters.tsx - Dashboard com Filtros Mensais
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Calendar, RefreshCw, CheckCircle, AlertCircle, Clock, Filter } from 'lucide-react';
import { comexstatServiceFixed } from '../services/comexstatServiceFixed';

interface ComexData {
  period: string;
  fob: number;
  kg: number;
}

interface Metrics {
  totalFOB: number;
  totalKG: number;
  growth: number;
  recordCount: number;
}

interface FilterState {
  flow: 'export' | 'import';
  viewType: 'annual' | 'monthly';
  year: number;
  months: number[];
  period: { from: string; to: string };
}

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

const DashboardWithMonthlyFilters = () => {
  const [data, setData] = useState<ComexData[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalFOB: 0,
    totalKG: 0,
    growth: 0,
    recordCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    flow: 'export',
    viewType: 'annual',
    year: 2022,
    months: [],
    period: { from: '2022-01', to: '2022-12' }
  });

  // Cache em memória
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const lastRequestRef = useRef<number>(0);
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

  // ✅ ATUALIZAR PERÍODO BASEADO NOS FILTROS
  const updatePeriodFromFilters = useCallback(() => {
    if (filters.viewType === 'annual') {
      setFilters(prev => ({
        ...prev,
        period: { from: `${prev.year}-01`, to: `${prev.year}-12` }
      }));
    } else {
      // Modo mensal
      if (filters.months.length === 0) {
        // Se nenhum mês selecionado, usar todos os meses do ano
        setFilters(prev => ({
          ...prev,
          period: { from: `${prev.year}-01`, to: `${prev.year}-12` }
        }));
      } else {
        // Usar apenas meses selecionados
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
    }
  }, [filters.viewType, filters.year, filters.months]);

  // ✅ PROCESSAMENTO DE DADOS COM SUPORTE MENSAL
  const processOfficialData = (rawData: any): ComexData[] => {
    console.log('🔄 === PROCESSAMENTO DADOS COM FILTRO MENSAL ===');
    console.log('Tipo de view:', filters.viewType);
    console.log('Meses selecionados:', filters.months);
    
    if (!rawData) {
      console.log('❌ Dados nulos recebidos');
      return [];
    }

    let dataArray: any[] = [];
    
    // Extrair dados da estrutura da API
    if (Array.isArray(rawData)) {
      dataArray = rawData;
    } else if (rawData && typeof rawData === 'object') {
      if (rawData.data && rawData.data.list && Array.isArray(rawData.data.list)) {
        dataArray = rawData.data.list;
      } else if (rawData.list && Array.isArray(rawData.list)) {
        dataArray = rawData.list;
      }
    }

    if (dataArray.length === 0) {
      console.log('⚠️ Array vazio retornado da API');
      return [];
    }

    console.log(`📊 Processando ${dataArray.length} registros`);

    // Processar cada item
    const processedData: ComexData[] = [];
    
    dataArray.forEach((item, index) => {
      // Extrair período
      let period = '';
      
      if (item.coAno && item.coMes) {
        period = `${item.coAno}-${String(item.coMes).padStart(2, '0')}`;
      } else if (item.dtAno && item.dtMes) {
        period = `${item.dtAno}-${String(item.dtMes).padStart(2, '0')}`;
      } else if (item.anoMes) {
        const str = item.anoMes.toString();
        if (str.length === 6) {
          period = `${str.substring(0, 4)}-${str.substring(4, 6)}`;
        }
      } else {
        period = `${filters.year}-${String(index + 1).padStart(2, '0')}`;
      }

      // Extrair valores
      const fob = parseFloat(item.metricFOB || item.vlFob || 0);
      const kg = parseFloat(item.metricKG || item.kgLiq || 0);

      // Filtrar por meses se especificado
      if (filters.viewType === 'monthly' && filters.months.length > 0) {
        const monthNumber = parseInt(period.split('-')[1]);
        if (!filters.months.includes(monthNumber)) {
          return; // Pular este registro
        }
      }

      if (fob > 0 || kg > 0) {
        processedData.push({ period, fob, kg });
      }
    });

    // Agrupar por período se necessário
    const groupedData = new Map<string, { fob: number; kg: number }>();
    
    processedData.forEach(item => {
      const existing = groupedData.get(item.period) || { fob: 0, kg: 0 };
      groupedData.set(item.period, {
        fob: existing.fob + item.fob,
        kg: existing.kg + item.kg
      });
    });

    // Converter para array final
    const result = Array.from(groupedData.entries())
      .map(([period, values]) => ({
        period,
        fob: values.fob,
        kg: values.kg
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    console.log(`✅ Resultado final: ${result.length} períodos processados`);
    return result;
  };

  // ✅ BUSCAR DADOS COM SUPORTE MENSAL
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    setConnected(false);

    try {
      console.log('📡 Buscando dados com filtros:', filters);
      
      let response;
      
      if (filters.viewType === 'monthly' && filters.months.length > 0) {
        // Buscar dados mensais específicos
        const monthlyData = await comexstatServiceFixed.getMonthlyData(
          filters.flow, 
          filters.year, 
          filters.months
        );
        
        // Consolidar dados mensais
        const consolidatedData = monthlyData
          .filter((month: { success: any; }) => month.success)
          .flatMap((month: { data: any; }) => month.data || []);
        
        response = { data: { list: consolidatedData } };
        
      } else {
        // Buscar dados anuais ou todos os meses
        response = await comexstatServiceFixed.getGeneralData({
          flow: filters.flow,
          monthDetail: filters.viewType === 'monthly',
          period: filters.period,
          metrics: ['metricFOB', 'metricKG']
        });
      }
      
      if (response && response.data) {
        const processedData = processOfficialData(response.data);
        const calculatedMetrics = calculateMetrics(processedData);
        
        setData(processedData);
        setMetrics(calculatedMetrics);
        setConnected(true);
        setError('');
        
        console.log(`✅ Dados carregados: ${processedData.length} períodos`);
      } else {
        throw new Error('Resposta da API sem dados válidos');
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar dados:', error);
      setError(error.message);
      setConnected(false);
      
      // Dados de fallback
      setData(generateFallbackData());
      setMetrics(calculateMetrics(generateFallbackData()));
      
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ✅ DADOS DE FALLBACK COM SUPORTE MENSAL
  const generateFallbackData = (): ComexData[] => {
    const baseData = filters.flow === 'export' ? 
      { baseFOB: 20000000000, baseKG: 50000000000 } :
      { baseFOB: 15000000000, baseKG: 30000000000 };

    const targetMonths = filters.viewType === 'monthly' && filters.months.length > 0 ? 
      filters.months : 
      Array.from({ length: 12 }, (_, i) => i + 1);

    return targetMonths.map(month => {
      const monthStr = month.toString().padStart(2, '0');
      const seasonality = 0.8 + (Math.sin((month - 1) * Math.PI / 6) * 0.3);
      const randomFactor = 0.85 + (Math.random() * 0.3);
      
      return {
        period: `${filters.year}-${monthStr}`,
        fob: Math.round(baseData.baseFOB * seasonality * randomFactor / 12),
        kg: Math.round(baseData.baseKG * seasonality * randomFactor / 12)
      };
    });
  };

  // ✅ CÁLCULO DE MÉTRICAS
  const calculateMetrics = (data: ComexData[]): Metrics => {
    if (data.length === 0) {
      return { totalFOB: 0, totalKG: 0, growth: 0, recordCount: 0 };
    }

    const totalFOB = data.reduce((sum, item) => sum + item.fob, 0);
    const totalKG = data.reduce((sum, item) => sum + item.kg, 0);
    
    const sortedData = [...data].sort((a, b) => a.period.localeCompare(b.period));
    const firstValue = sortedData[0]?.fob || 0;
    const lastValue = sortedData[sortedData.length - 1]?.fob || 0;
    const growth = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    return { totalFOB, totalKG, growth, recordCount: data.length };
  };

  // ✅ HANDLERS DE FILTROS
  const handleViewTypeChange = (viewType: 'annual' | 'monthly') => {
    setFilters(prev => ({
      ...prev,
      viewType,
      months: viewType === 'annual' ? [] : prev.months
    }));
  };

  const handleMonthToggle = (month: number) => {
    setFilters(prev => ({
      ...prev,
      months: prev.months.includes(month) 
        ? prev.months.filter(m => m !== month)
        : [...prev.months, month].sort((a, b) => a - b)
    }));
  };

  const selectAllMonths = () => {
    setFilters(prev => ({
      ...prev,
      months: Array.from({ length: 12 }, (_, i) => i + 1)
    }));
  };

  const clearMonths = () => {
    setFilters(prev => ({ ...prev, months: [] }));
  };

  // ✅ EFFECTS
  useEffect(() => {
    updatePeriodFromFilters();
  }, [updatePeriodFromFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ✅ FORMATAÇÃO DO TOOLTIP
  const formatTooltip = (value: any, name: string) => {
    if (name === 'fob') {
      return [`US$ ${Number(value).toLocaleString('pt-BR')}`, 'FOB'];
    }
    if (name === 'kg') {
      return [`${Number(value).toLocaleString('pt-BR')} kg`, 'Peso'];
    }
    return [value, name];
  };

  return (
    <div className="space-y-6">
      {/* Header com Filtros Expandidos */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              ComexStat Dashboard - {filters.flow === 'export' ? 'Exportações' : 'Importações'}
            </h1>
            <p className="text-gray-600">
              Dados oficiais do comércio exterior brasileiro - {filters.viewType === 'annual' ? 'Visão Anual' : 'Visão Mensal'}
            </p>
          </div>
          
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="space-y-4">
          {/* Linha 1: Flow e Tipo de Visualização */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Operação
              </label>
              <select
                value={filters.flow}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  flow: e.target.value as 'export' | 'import' 
                }))}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="export">Exportação</option>
                <option value="import">Importação</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visualização
              </label>
              <select
                value={filters.viewType}
                onChange={(e) => handleViewTypeChange(e.target.value as 'annual' | 'monthly')}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="annual">Anual</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ano
              </label>
              <select
                value={filters.year}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  year: parseInt(e.target.value) 
                }))}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
              >
                {Array.from({ length: 10 }, (_, i) => 2024 - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 2: Seleção de Meses (apenas para visualização mensal) */}
          {filters.viewType === 'monthly' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Meses Selecionados ({filters.months.length === 0 ? 'Todos' : filters.months.length})
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllMonths}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    Todos
                  </button>
                  <button
                    onClick={clearMonths}
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {MONTHS.map(month => (
                  <label key={month.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.months.includes(month.value)}
                      onChange={() => handleMonthToggle(month.value)}
                      className="mr-2 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{month.label}</span>
                  </label>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                💡 Se nenhum mês for selecionado, serão exibidos todos os meses do ano
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium">Usando dados de exemplo</p>
              <p className="text-yellow-700 text-sm mt-1">API Error: {error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600 bg-green-100 rounded-lg p-1.5" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total FOB</p>
              <p className="text-2xl font-bold text-gray-900">
                US$ {(metrics.totalFOB / 1000000000).toFixed(1)}B
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600 bg-blue-100 rounded-lg p-1.5" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Peso</p>
              <p className="text-2xl font-bold text-gray-900">
                {(metrics.totalKG / 1000000000).toFixed(1)}B kg
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            {metrics.growth >= 0 ? (
              <TrendingUp className="h-8 w-8 text-green-600 bg-green-100 rounded-lg p-1.5" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-600 bg-red-100 rounded-lg p-1.5" />
            )}
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Crescimento</p>
              <p className={`text-2xl font-bold ${metrics.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.growth > 0 ? '+' : ''}{metrics.growth.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-purple-600 bg-purple-100 rounded-lg p-1.5" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Períodos</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.recordCount}</p>
              <p className="text-xs text-gray-500">
                {filters.viewType === 'monthly' ? 'meses' : 'registros'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Linha - FOB */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Evolução FOB - {filters.flow === 'export' ? 'Exportações' : 'Importações'}
          </h3>
          
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tickFormatter={(value) => `${(value / 1000000000).toFixed(1)}B`} />
                  <Tooltip formatter={formatTooltip} />
                  <Line 
                    type="monotone" 
                    dataKey="fob" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Gráfico de Barras - Peso */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Volume por Peso (KG)
          </h3>
          
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tickFormatter={(value) => `${(value / 1000000000).toFixed(1)}B`} />
                  <Tooltip formatter={formatTooltip} />
                  <Bar dataKey="kg" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-600">
        <div className="flex items-center justify-center space-x-4">
          {connected ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          )}
          <span>
            {connected ? 'Conectado à API ComexStat' : 'Dados de exemplo'} | 
            {data.length} {filters.viewType === 'monthly' ? 'meses' : 'períodos'} | 
            Última atualização: {new Date().toLocaleTimeString('pt-BR')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardWithMonthlyFilters;