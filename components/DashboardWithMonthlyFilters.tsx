// components/DashboardWithMonthlyFilters.tsx - VERSÃO LIMPA E OTIMIZADA
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar, DollarSign, Package, AlertTriangle, RefreshCw } from 'lucide-react';
import { comexstatServiceOptimized } from '../services/comexstatServiceOptimized';

interface ComexData {
  period: string;
  fob: number;
  kg: number;
  isReal: boolean;
}

interface DashboardFilters {
  flow: 'export' | 'import';
  dateFrom: string;
  dateTo: string;
}

const DashboardWithMonthlyFilters: React.FC = () => {
  // ✅ ESTADOS SIMPLIFICADOS
  const [filters, setFilters] = useState<DashboardFilters>({
    flow: 'export',
    dateFrom: '2023-01',
    dateTo: '2023-12'
  });

  const [data, setData] = useState<ComexData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState({
    totalFOB: 0,
    totalKG: 0,
    avgMonthly: 0,
    growth: 0
  });

  // ✅ PROCESSAMENTO DE DADOS SIMPLIFICADO
  const processOfficialData = (rawData: any): ComexData[] => {
    console.log('🔄 Processando dados para gráfico...');
    
    if (!rawData) {
      return [];
    }

    let dataArray: any[] = [];
    
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
      return [];
    }

    console.log(`📊 Processando ${dataArray.length} registros`);

    // Processar dados agrupando por período
    const periodMap = new Map<string, { fob: number; kg: number }>();

    dataArray.forEach(item => {
      const fob = parseFloat(item.metricFOB || item.vlFob || 0);
      const kg = parseFloat(item.metricKG || item.kgLiq || 0);
      
      // Extrair período do item
      let period = item.period || item.ano || item.month;
      
      if (!period && item.coAno && item.coMes) {
        period = `${item.coAno}-${item.coMes.toString().padStart(2, '0')}`;
      }
      
      if (!period) {
        // Usar período do filtro como fallback
        const fromYear = filters.dateFrom.split('-')[0];
        const fromMonth = filters.dateFrom.split('-')[1];
        period = `${fromYear}-${fromMonth}`;
      }

      if (fob > 0 || kg > 0) {
        const existing = periodMap.get(period) || { fob: 0, kg: 0 };
        periodMap.set(period, {
          fob: existing.fob + fob,
          kg: existing.kg + kg
        });
      }
    });

    // Converter para array ordenado
    const result = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        fob: data.fob,
        kg: data.kg,
        isReal: true
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    console.log(`✅ Processados ${result.length} períodos para gráfico`);
    return result;
  };

  // ✅ CARREGAR DADOS
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      console.log('📡 Buscando dados:', filters);
      
      const response = await comexstatServiceOptimized.getGeneralData({
        flow: filters.flow,
        monthDetail: true, // Sempre detalhado por mês para gráficos melhores
        period: { from: filters.dateFrom, to: filters.dateTo },
        metrics: ['metricFOB', 'metricKG']
      });
      
      if (response && response.data) {
        const processedData = processOfficialData(response.data);
        
        if (processedData.length === 0) {
          throw new Error('Nenhum dado encontrado para o período selecionado');
        }
        
        const calculatedMetrics = calculateMetrics(processedData);
        
        setData(processedData);
        setMetrics(calculatedMetrics);
        setError('');
        
        console.log(`✅ Dados carregados: ${processedData.length} períodos`);
      } else {
        throw new Error('Resposta da API inválida');
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar dados:', error);
      setError(error.message);
      setData([]);
      setMetrics({ totalFOB: 0, totalKG: 0, avgMonthly: 0, growth: 0 });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ✅ CÁLCULO DE MÉTRICAS
  const calculateMetrics = (data: ComexData[]) => {
    const totalFOB = data.reduce((sum, item) => sum + item.fob, 0);
    const totalKG = data.reduce((sum, item) => sum + item.kg, 0);
    const avgMonthly = data.length > 0 ? totalFOB / data.length : 0;
    
    let growth = 0;
    if (data.length >= 2) {
      const firstValue = data[0].fob;
      const lastValue = data[data.length - 1].fob;
      growth = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
    }

    return { totalFOB, totalKG, avgMonthly, growth };
  };

  // ✅ VALIDAÇÃO DE DATAS
  const validateDates = (from: string, to: string): boolean => {
    const fromDate = new Date(from + '-01');
    const toDate = new Date(to + '-01');
    return fromDate <= toDate;
  };

  // ✅ EFFECTS
  useEffect(() => {
    // Validar datas antes de carregar
    if (validateDates(filters.dateFrom, filters.dateTo)) {
      loadData();
    } else {
      setError('Data inicial deve ser anterior à data final');
    }
  }, [filters, loadData]);

  // ✅ COMPONENTE DE FILTROS LIMPO
  const FilterControls = () => (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Filtros de Consulta</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Fluxo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fluxo</label>
          <select
            value={filters.flow}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              flow: e.target.value as 'export' | 'import' 
            }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="export">Exportação</option>
            <option value="import">Importação</option>
          </select>
        </div>

        {/* Data Inicial */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Inicial</label>
          <input
            type="month"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              dateFrom: e.target.value 
            }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            max={filters.dateTo} // Não pode ser maior que a data final
          />
        </div>

        {/* Data Final */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
          <input
            type="month"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              dateTo: e.target.value 
            }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min={filters.dateFrom} // Não pode ser menor que a data inicial
          />
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={loadData}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center transition-colors"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Carregando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </>
          )}
        </button>

        <div className="text-sm text-gray-600">
          Período: {filters.dateFrom} a {filters.dateTo}
          {data.length > 0 && (
            <span className="ml-2 text-green-600">
              ({data.length} períodos)
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // ✅ FORMATAÇÃO DE VALORES
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `US$ ${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `US$ ${(value / 1000000).toFixed(1)}M`;
    } else {
      return `US$ ${(value / 1000).toFixed(1)}K`;
    }
  };

  const formatWeight = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B kg`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M kg`;
    } else {
      return `${(value / 1000).toFixed(1)}K kg`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Limpo */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Dashboard Comércio Exterior - {filters.flow === 'export' ? 'Exportação' : 'Importação'}
        </h2>
        <p className="text-gray-600">
          Análise de dados do comércio exterior brasileiro
        </p>
      </div>

      <FilterControls />

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <p className="text-red-800 font-medium">Erro ao carregar dados</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-800">Carregando dados...</p>
          <p className="text-sm text-blue-600 mt-2">Processando informações</p>
        </div>
      )}

      {/* Success State com dados */}
      {!loading && !error && data.length > 0 && (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total FOB</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(metrics.totalFOB)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Peso</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatWeight(metrics.totalKG)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Média Mensal</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(metrics.avgMonthly)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Crescimento</p>
                  <p className={`text-2xl font-bold ${metrics.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metrics.growth >= 0 ? '+' : ''}{metrics.growth.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Linha - FOB */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">
                Evolução do Valor FOB - {filters.flow === 'export' ? 'Exportação' : 'Importação'}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.map(item => ({ 
                  ...item, 
                  fob: item.fob / 1000000, // Converter para milhões
                  periodo: item.period 
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="periodo" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [`US$ ${value.toFixed(1)}M`, 'FOB']}
                    labelFormatter={(label) => `Período: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fob" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Barras - Peso */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">
                Volume de Peso (KG) - {filters.flow === 'export' ? 'Exportação' : 'Importação'}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.map(item => ({ 
                  ...item, 
                  kg: item.kg / 1000000, // Converter para milhões
                  periodo: item.period 
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="periodo" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [`${value.toFixed(1)}M kg`, 'Peso']}
                    labelFormatter={(label) => `Período: ${label}`}
                  />
                  <Bar 
                    dataKey="kg" 
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resumo dos dados */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Resumo do Período</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-700">Períodos analisados</p>
                <p className="text-2xl font-bold text-blue-600">{data.length}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-700">Maior valor mensal</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(Math.max(...data.map(item => item.fob)))}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-700">Menor valor mensal</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(Math.min(...data.map(item => item.fob)))}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && !error && data.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado encontrado</h3>
          <p className="text-gray-600 mb-4">
            Não há dados disponíveis para o período selecionado.
          </p>
          <p className="text-sm text-gray-500">
            Tente ajustar as datas ou o tipo de fluxo.
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardWithMonthlyFilters;
export { DashboardWithMonthlyFilters };