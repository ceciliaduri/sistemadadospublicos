'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Calendar, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

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

const API_BASE = 'https://api-comexstat.mdic.gov.br';

const ComexStatDashboard = () => {
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
  const [rawDataInfo, setRawDataInfo] = useState<string>('');
  const [filters, setFilters] = useState({
    flow: 'export',
    period: { from: '2022-01', to: '2022-12' }
  });

  // Função de fetch SUPER simples
  const fetchData = async () => {
    setLoading(true);
    setError('');
    setRawDataInfo('');
    
    try {
      console.log('🚀 Fazendo requisição...');
      
      const payload = {
        flow: filters.flow,
        monthDetail: true,
        period: filters.period,
        metrics: ['metricFOB', 'metricKG']
      };

      const response = await fetch(`${API_BASE}/general?language=pt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 Status:', response.status);

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Dados recebidos:', result);

      setConnected(true);

      // ANÁLISE DETALHADA DOS DADOS RECEBIDOS
      let rawData = result.data;
      console.log('🔍 Analisando estrutura dos dados:');
      console.log('🔍 Tipo de result.data:', typeof rawData);
      console.log('🔍 É array?', Array.isArray(rawData));
      console.log('🔍 Conteúdo:', rawData);

      setRawDataInfo(`Tipo: ${typeof rawData}, Array: ${Array.isArray(rawData)}, Length: ${rawData?.length || 'N/A'}`);

      // TENTAR DIFERENTES ESTRUTURAS DE DADOS
      let dataArray: any[] = [];
      
      if (Array.isArray(rawData)) {
        dataArray = rawData;
        console.log('✅ Dados já são array');
      } else if (rawData && typeof rawData === 'object') {
        // Verificar propriedades comuns
        if (rawData.list && Array.isArray(rawData.list)) {
          dataArray = rawData.list;
          console.log('✅ Dados encontrados em .list');
        } else if (rawData.items && Array.isArray(rawData.items)) {
          dataArray = rawData.items;
          console.log('✅ Dados encontrados em .items');
        } else if (rawData.records && Array.isArray(rawData.records)) {
          dataArray = rawData.records;
          console.log('✅ Dados encontrados em .records');
        } else if (rawData.data && Array.isArray(rawData.data)) {
          dataArray = rawData.data;
          console.log('✅ Dados encontrados em .data');
        } else {
          // Tentar converter objeto em array
          const keys = Object.keys(rawData);
          console.log('🔍 Chaves do objeto:', keys);
          
          // Procurar por array em qualquer propriedade
          for (const key of keys) {
            if (Array.isArray(rawData[key])) {
              dataArray = rawData[key];
              console.log(`✅ Array encontrado na propriedade: ${key}`);
              break;
            }
          }
        }
      }

      console.log('📊 Array final para processamento:', dataArray);
      console.log('📊 Quantidade de itens:', dataArray.length);

      if (dataArray.length > 0) {
        console.log('📊 Primeiro item:', dataArray[0]);
      }

      // Processar dados
      const processedData = processDataArray(dataArray);
      const calculatedMetrics = calculateMetrics(processedData);

      setData(processedData);
      setMetrics(calculatedMetrics);

    } catch (err: any) {
      console.error('❌ Erro:', err);
      setError(err.message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Processamento MUITO robusto
  const processDataArray = (dataArray: any[]): ComexData[] => {
    console.log('🔄 Processando array de dados...');
    
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      console.log('⚠️ Array vazio ou inválido');
      return [];
    }

    const processed: ComexData[] = [];

    dataArray.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        console.log(`⚠️ Item ${index} inválido:`, item);
        return;
      }

      console.log(`🔍 Processando item ${index}:`, Object.keys(item));

      // Tentar extrair FOB de múltiplas formas
      let fob = 0;
      const fobFields = ['vlFob', 'metricFOB', 'fob', 'valorFOB', 'value', 'vlTotal'];
      for (const field of fobFields) {
        if (item[field] !== undefined && item[field] !== null) {
          fob = parseFloat(item[field]) || 0;
          if (fob > 0) {
            console.log(`✅ FOB encontrado em ${field}: ${fob}`);
            break;
          }
        }
      }

      // Tentar extrair KG de múltiplas formas
      let kg = 0;
      const kgFields = ['kgLiq', 'metricKG', 'kg', 'peso', 'pesoLiquido', 'weight'];
      for (const field of kgFields) {
        if (item[field] !== undefined && item[field] !== null) {
          kg = parseFloat(item[field]) || 0;
          if (kg > 0) {
            console.log(`✅ KG encontrado em ${field}: ${kg}`);
            break;
          }
        }
      }

      // Tentar extrair período de múltiplas formas
      let period = 'Desconhecido';
      if (item.coAno && item.coMes) {
        period = `${item.coAno}-${String(item.coMes).padStart(2, '0')}`;
      } else if (item.ano && item.mes) {
        period = `${item.ano}-${String(item.mes).padStart(2, '0')}`;
      } else if (item.coAno || item.ano) {
        period = (item.coAno || item.ano).toString();
      } else if (item.period || item.periodo) {
        period = (item.period || item.periodo).toString();
      } else if (item.date || item.data) {
        period = (item.date || item.data).toString();
      }

      console.log(`📝 Item ${index}: period=${period}, fob=${fob}, kg=${kg}`);

      if (fob > 0 || kg > 0) {
        processed.push({ period, fob, kg });
      }
    });

    console.log('✅ Itens processados com sucesso:', processed.length);

    // Agrupar por período
    const grouped: { [key: string]: ComexData } = {};
    processed.forEach(item => {
      if (!grouped[item.period]) {
        grouped[item.period] = { period: item.period, fob: 0, kg: 0 };
      }
      grouped[item.period].fob += item.fob;
      grouped[item.period].kg += item.kg;
    });

    const result = Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
    console.log('📈 Dados finais agrupados:', result);
    
    return result;
  };

  // Calcular métricas
  const calculateMetrics = (data: ComexData[]): Metrics => {
    if (data.length === 0) {
      return { totalFOB: 0, totalKG: 0, growth: 0, recordCount: 0 };
    }

    const totalFOB = data.reduce((sum, item) => sum + item.fob, 0);
    const totalKG = data.reduce((sum, item) => sum + item.kg, 0);
    
    const firstValue = data[0]?.fob || 0;
    const lastValue = data[data.length - 1]?.fob || 0;
    const growth = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    return {
      totalFOB,
      totalKG,
      growth,
      recordCount: data.length
    };
  };

  useEffect(() => {
    fetchData();
  }, [filters.flow, filters.period.from, filters.period.to]);

  const formatCurrency = (value: number) => {
    if (value === 0) return '$0';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const formatWeight = (value: number) => {
    if (value === 0) return '0 kg';
    return new Intl.NumberFormat('pt-BR', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value) + ' kg';
  };

  const setPeriod = (year: string) => {
    setFilters(prev => ({
      ...prev,
      period: { from: `${year}-01`, to: `${year}-12` }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando e analisando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro de Conexão</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2 inline" />
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dashboard ComexStat Brasil
        </h1>
        <p className="text-gray-600">Dados Oficiais do Governo Federal</p>
        
        {/* Status de Conexão */}
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800">API conectada - {metrics.recordCount} registros processados</span>
          </div>
          <div className="text-xs text-green-600">
            {rawDataInfo}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fluxo</label>
            <select 
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={filters.flow}
              onChange={(e) => setFilters({...filters, flow: e.target.value})}
            >
              <option value="export">Exportação</option>
              <option value="import">Importação</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">De</label>
            <input 
              type="month" 
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={filters.period.from}
              onChange={(e) => setFilters({...filters, period: {...filters.period, from: e.target.value}})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Até</label>
            <input 
              type="month" 
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={filters.period.to}
              onChange={(e) => setFilters({...filters, period: {...filters.period, to: e.target.value}})}
            />
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700 mr-2">Períodos:</span>
          <button onClick={() => setPeriod('2023')} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">2023</button>
          <button onClick={() => setPeriod('2022')} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">2022</button>
          <button onClick={() => setPeriod('2021')} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">2021</button>
          <button onClick={fetchData} className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200">Atualizar</button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valor FOB</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalFOB)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Peso Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatWeight(metrics.totalKG)}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Crescimento</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.growth.toFixed(1)}%</p>
            </div>
            {metrics.growth >= 0 ? 
              <TrendingUp className="h-8 w-8 text-green-600" /> : 
              <TrendingDown className="h-8 w-8 text-red-600" />
            }
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Registros</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.recordCount}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      {data.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução FOB</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'FOB']} />
                <Line type="monotone" dataKey="fob" stroke="#2563eb" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Peso Líquido</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={formatWeight} />
                <Tooltip formatter={(value) => [formatWeight(Number(value)), 'Peso']} />
                <Bar dataKey="kg" fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">API Conectada - Analisando Dados</h3>
          <p className="text-gray-600 mb-4">Dados recebidos mas estrutura precisa ser analisada</p>
          <p className="text-sm text-gray-500 mb-4">Info: {rawDataInfo}</p>
          <div className="space-x-2">
            <button onClick={() => setPeriod('2023')} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Tentar 2023</button>
            <button onClick={() => setPeriod('2022')} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Tentar 2022</button>
            <button onClick={() => setFilters(prev => ({...prev, flow: prev.flow === 'export' ? 'import' : 'export'}))} 
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Trocar para {filters.flow === 'export' ? 'Importação' : 'Exportação'}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>✅ Conectado à API ComexStat Oficial - Processamento Robusto</p>
        <p>Versão ultra-simplificada - Análise detalhada de estrutura de dados</p>
      </div>
    </div>
  );
};

export default ComexStatDashboard;