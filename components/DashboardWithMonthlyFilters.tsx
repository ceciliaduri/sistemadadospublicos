// components/DashboardWithMonthlyFilters.tsx - ATUALIZAÇÃO CRÍTICA: Removendo todo mock data
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar, DollarSign, Package, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { comexstatServiceFixed } from '../services/comexstatServiceFixed';

interface ComexData {
  period: string;
  fob: number;
  kg: number;
  isReal: boolean; // Flag para identificar dados reais
}

interface DashboardFilters {
  flow: 'export' | 'import';
  viewType: 'annual' | 'monthly';
  year: number;
  months: number[];
  period: { from: string; to: string };
}

export const DashboardWithMonthlyFilters: React.FC = () => {
  // ✅ ESTADOS
  const [filters, setFilters] = useState<DashboardFilters>({
    flow: 'export',
    viewType: 'annual',
    year: 2023,
    months: [],
    period: { from: '2023-01', to: '2023-12' }
  });

  const [data, setData] = useState<ComexData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState({
    totalFOB: 0,
    totalKG: 0,
    avgMonthly: 0,
    growth: 0
  });

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

  // ✅ PROCESSAMENTO DE DADOS COM SUPORTE MENSAL - SEM MOCK
  const processOfficialData = (rawData: any): ComexData[] => {
    console.log('🔄 === PROCESSAMENTO DADOS REAIS (SEM MOCK) ===');
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

    console.log(`📊 Processando ${dataArray.length} registros REAIS`);

    // Processar dados agrupando por período
    const periodMap = new Map<string, { fob: number; kg: number }>();

    dataArray.forEach(item => {
      const fob = parseFloat(item.metricFOB || item.vlFob || 0);
      const kg = parseFloat(item.metricKG || item.kgLiq || 0);
      
      // Tentar extrair período do item
      let period = item.period || item.ano || item.month;
      
      if (!period && item.coAno && item.coMes) {
        period = `${item.coAno}-${item.coMes.toString().padStart(2, '0')}`;
      }
      
      if (!period) {
        // Se não há período específico, usar o período do filtro
        period = filters.viewType === 'monthly' ? 
          filters.period.from : 
          filters.year.toString();
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
        isReal: true // ✅ Flag indicando dados reais
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    console.log(`✅ Processados ${result.length} períodos com dados REAIS`);
    return result;
  };

  // ✅ CARREGAR DADOS - SEM FALLBACK MOCK
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setConnected(false);

    try {
      console.log('📡 Buscando dados REAIS com filtros:', filters);
      
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
        
        if (processedData.length === 0) {
          throw new Error('API retornou dados vazios para o período selecionado');
        }
        
        const calculatedMetrics = calculateMetrics(processedData);
        
        setData(processedData);
        setMetrics(calculatedMetrics);
        setConnected(true);
        setError('');
        
        console.log(`✅ Dados REAIS carregados: ${processedData.length} períodos`);
      } else {
        throw new Error('Resposta da API sem dados válidos');
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar dados REAIS:', error);
      setError(`Erro ao carregar dados reais: ${error.message}`);
      setConnected(false);
      
      // ❌ SEM FALLBACK MOCK - deixar vazio
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
    
    // Calcular crescimento
    let growth = 0;
    if (data.length >= 2) {
      const firstValue = data[0].fob;
      const lastValue = data[data.length - 1].fob;
      growth = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
    }

    return { totalFOB, totalKG, avgMonthly, growth };
  };

  // ✅ ATUALIZAR PERÍODO QUANDO FILTROS MUDAM
  useEffect(() => {
    updatePeriodFromFilters();
  }, [updatePeriodFromFilters]);

  // ✅ CARREGAR DADOS QUANDO FILTROS MUDAM
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ✅ COMPONENTE DE FILTROS
  const FilterControls = () => (
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
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              viewType: e.target.value as 'annual' | 'monthly', 
              months: [] 
            }))}
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

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className={`flex items-center px-3 py-2 rounded-lg ${connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {connected ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Conectado
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Desconectado
              </>
            )}
          </div>
        </div>
      </div>

      {/* Seleção de meses (se mensal) */}
      {filters.viewType === 'monthly' && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meses (deixe vazio para todos)
          </label>
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
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
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
          Período: {filters.period.from} a {filters.period.to}
          {data.length > 0 && (
            <span className="ml-2 text-green-600">
              ({data.length} períodos reais)
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Dashboard Comércio Exterior - {filters.flow === 'export' ? 'Exportação' : 'Importação'}
        </h2>
        <p className="text-gray-600">
          Dados oficiais ComexStat MDIC - <strong>100% dados reais, zero mock data</strong>
        </p>
      </div>

      {/* Alerta sobre política de dados */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
          <div>
            <p className="text-sm font-medium text-green-800">✅ Política: Apenas Dados Reais</p>
            <p className="text-xs text-green-700">
              Sistema configurado para exibir exclusivamente dados oficiais da API ComexStat MDIC. 
              Se não houver dados disponíveis, nada será exibido.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <FilterControls />

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <p className="text-red-800 font-medium">Erro ao carregar dados reais</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <p className="text-red-600 text-xs mt-2">
                Verifique se há dados disponíveis na API ComexStat para o período selecionado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-800">Carregando dados reais da API ComexStat MDIC...</p>
          <p className="text-sm text-blue-600 mt-2">Rate limiting ativo - aguarde alguns segundos</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && data.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado encontrado</h3>
          <p className="text-gray-600 mb-4">
            Não há dados disponíveis na API ComexStat para o período selecionado.
          </p>
          <p className="text-sm text-gray-500">
            Tente ajustar os filtros ou selecionar um período diferente.
          </p>
        </div>
      )}

      {/* Content - apenas se houver dados reais */}
      {!loading && data.length > 0 && (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total FOB</p>
                  <p className="text-2xl font-bold text-gray-900">
                    US$ {(metrics.totalFOB / 1000000000).toFixed(1)}B
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
                    {(metrics.totalKG / 1000000).toFixed(1)}M kg
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
                    US$ {(metrics.avgMonthly / 1000000).toFixed(0)}M
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

          {/* Gráfico */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">
              Evolução {filters.viewType === 'monthly' ? 'Mensal' : 'Anual'} - FOB
            </h3>
            
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [
                    `US$ ${(value / 1000000).toFixed(1)}M`, 
                    'FOB'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="fob" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-4 text-xs text-gray-500 text-center">
              ✅ Dados reais da API ComexStat MDIC - {data.length} períodos encontrados
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardWithMonthlyFilters;