'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Calendar, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

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

interface CacheEntry {
  data: any;
  timestamp: number;
  key: string;
}

const API_BASE = 'https://api-comexstat.mdic.gov.br';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos
const RATE_LIMIT_DELAY = 2000; // 2 segundos entre requisições

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
  const [rateLimited, setRateLimited] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState(0);
  const [filters, setFilters] = useState({
    flow: 'export' as 'export' | 'import',
    period: { from: '2022-01', to: '2022-12' }
  });

  // ✅ CACHE EM MEMÓRIA
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const lastRequestRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // ✅ DEBUG MANUAL - FORÇA NOVA REQUISIÇÃO
  const forceDebugAndReload = () => {
    console.log('🐛 DEBUG MANUAL INICIADO');
    console.log('🗑️ Limpando cache para forçar nova requisição...');
    
    // Limpar cache
    cacheRef.current.clear();
    
    // Reset states para forçar nova requisição
    setRetryCount(0);
    setRateLimited(false);
    setError('');
    
    // Força nova requisição da API
    console.log('🚀 Forçando nova requisição da API...');
    fetchData();
  };

  // ✅ GERAR CHAVE DE CACHE
  const getCacheKey = (flow: string, from: string, to: string): string => {
    return `${flow}-${from}-${to}`;
  };

  // ✅ VERIFICAR CACHE
  const getFromCache = (key: string): any | null => {
    const cached = cacheRef.current.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('✅ Cache hit:', key);
      return cached.data;
    }
    if (cached) {
      cacheRef.current.delete(key);
      console.log('🗑️ Cache expirado removido:', key);
    }
    return null;
  };

  // ✅ SALVAR NO CACHE
  const saveToCache = (key: string, data: any): void => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      key
    });
    console.log('💾 Dados salvos no cache:', key);
  };

  // ✅ DELAY ENTRE REQUISIÇÕES
  const respectRateLimit = async (): Promise<void> => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestRef.current;
    
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
      console.log(`⏳ Aguardando ${waitTime}ms para respeitar rate limit...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastRequestRef.current = Date.now();
  };

  // ✅ RETRY COM EXPONENTIAL BACKOFF
  const retryWithBackoff = async (retryAttempt: number): Promise<void> => {
    const backoffTime = Math.min(1000 * Math.pow(2, retryAttempt), 30000); // Max 30s
    setNextRetryIn(Math.ceil(backoffTime / 1000));
    setRateLimited(true);
    
    console.log(`🔄 Tentativa ${retryAttempt + 1} em ${backoffTime}ms`);
    
    // Countdown timer
    const countdown = setInterval(() => {
      setNextRetryIn(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    retryTimeoutRef.current = setTimeout(() => {
      clearInterval(countdown);
      setRateLimited(false);
      setNextRetryIn(0);
      fetchData();
    }, backoffTime);
  };

  // ✅ PROCESSAMENTO APENAS COM DADOS REAIS DA API
  const processOfficialData = (rawData: any): ComexData[] => {
    console.log('🔄 PROCESSANDO DADOS REAIS DA API ComexStat...');
    console.log('🔍 ESTRUTURA COMPLETA RAW DATA:', rawData);
    console.log('🔍 TIPO:', typeof rawData);
    console.log('🔍 É ARRAY:', Array.isArray(rawData));
    
    if (!rawData) {
      console.log('❌ Dados nulos recebidos da API');
      return [];
    }

    let dataArray: any[] = [];
    
    // Detectar estrutura real da API ComexStat
    if (Array.isArray(rawData)) {
      dataArray = rawData;
      console.log('✅ Dados são array direto - Total de itens:', dataArray.length);
    } else if (rawData && typeof rawData === 'object') {
      console.log('🔍 Objeto recebido - Chaves disponíveis:', Object.keys(rawData));
      
      if (rawData.list && Array.isArray(rawData.list)) {
        dataArray = rawData.list;
        console.log('✅ Array encontrado em rawData.list - Total:', dataArray.length);
      } else if (rawData.data && Array.isArray(rawData.data)) {
        dataArray = rawData.data;
        console.log('✅ Array encontrado em rawData.data - Total:', dataArray.length);
      } else if (rawData.items && Array.isArray(rawData.items)) {
        dataArray = rawData.items;
        console.log('✅ Array encontrado em rawData.items - Total:', dataArray.length);
      } else {
        console.log('❌ Estrutura não reconhecida da API');
        console.log('🔍 Objeto completo:', JSON.stringify(rawData, null, 2));
        return [];
      }
    } else {
      console.log('❌ Tipo de dados não suportado:', typeof rawData);
      return [];
    }

    console.log(`📊 TOTAL DE REGISTROS DA API: ${dataArray.length}`);

    // Log detalhado dos primeiros 3 itens para entender a estrutura
    if (dataArray.length > 0) {
      console.log('🔍 === ANÁLISE DOS PRIMEIROS ITENS DA API ===');
      dataArray.slice(0, 3).forEach((item, index) => {
        console.log(`\n📋 ITEM ${index + 1}:`);
        console.log('🔍 Todas as chaves:', Object.keys(item));
        console.log('🔍 Dados completos:', JSON.stringify(item, null, 2));
        
        // Procurar campos de período especificamente
        console.log('🔍 Campos que podem ser período:');
        Object.keys(item).forEach(key => {
          if (key.toLowerCase().includes('ano') || 
              key.toLowerCase().includes('mes') || 
              key.toLowerCase().includes('period') ||
              key.toLowerCase().includes('date') ||
              key.toLowerCase().includes('time') ||
              key.toLowerCase().includes('year') ||
              key.toLowerCase().includes('month')) {
            console.log(`   📅 ${key}: ${item[key]}`);
          }
        });
      });
    }

    const processed: ComexData[] = [];

    dataArray.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        console.log(`⚠️ Item ${index + 1} é inválido (não é objeto)`);
        return;
      }

      console.log(`\n🔍 PROCESSANDO ITEM ${index + 1}:`);

      // ✅ EXTRAÇÃO FOB - Apenas dados reais da API
      let fob = 0;
      const fobFields = ['metricFOB', 'vlFob', 'fob', 'vlTotal', 'valor', 'VL_FOB', 'FOB'];
      console.log(`🔍 Procurando FOB em:`, fobFields);
      
      for (const field of fobFields) {
        if (item[field] !== undefined && item[field] !== null) {
          const value = parseFloat(item[field]);
          console.log(`   🔍 ${field}: ${item[field]} → Parsed: ${value}`);
          if (value > 0) {
            fob = value;
            console.log(`   ✅ FOB encontrado em '${field}': ${fob}`);
            break;
          }
        }
      }

      // ✅ EXTRAÇÃO KG - Apenas dados reais da API  
      let kg = 0;
      const kgFields = ['metricKG', 'kgLiq', 'kg', 'peso', 'qtKg', 'KG_LIQUIDO', 'pesoLiquido'];
      console.log(`🔍 Procurando KG em:`, kgFields);
      
      for (const field of kgFields) {
        if (item[field] !== undefined && item[field] !== null) {
          const value = parseFloat(item[field]);
          console.log(`   🔍 ${field}: ${item[field]} → Parsed: ${value}`);
          if (value > 0) {
            kg = value;
            console.log(`   ✅ KG encontrado em '${field}': ${kg}`);
            break;
          }
        }
      }

      // ✅ EXTRAÇÃO PERÍODO - APENAS dados reais da API
      let period = 'Desconhecido';
      console.log(`🔍 Procurando período real da API...`);
      
      // Tentar todas as possibilidades reais da API ComexStat
      if (item.period) {
        period = item.period.toString();
        console.log(`   ✅ Período encontrado em 'period': ${period}`);
      } else if (item.coAno && item.coMes) {
        period = `${item.coAno}-${String(item.coMes).padStart(2, '0')}`;
        console.log(`   ✅ Período construído de 'coAno'+'coMes': ${period}`);
      } else if (item.CO_ANO && item.CO_MES) {
        period = `${item.CO_ANO}-${String(item.CO_MES).padStart(2, '0')}`;
        console.log(`   ✅ Período construído de 'CO_ANO'+'CO_MES': ${period}`);
      } else if (item.ano && item.mes) {
        period = `${item.ano}-${String(item.mes).padStart(2, '0')}`;
        console.log(`   ✅ Período construído de 'ano'+'mes': ${period}`);
      } else if (item.coAno) {
        period = item.coAno.toString();
        console.log(`   ✅ Período de 'coAno' (apenas ano): ${period}`);
      } else if (item.CO_ANO) {
        period = item.CO_ANO.toString();
        console.log(`   ✅ Período de 'CO_ANO' (apenas ano): ${period}`);
      } else if (item.ano) {
        period = item.ano.toString();
        console.log(`   ✅ Período de 'ano': ${period}`);
      } else if (item.data || item.date) {
        period = (item.data || item.date).toString();
        console.log(`   ✅ Período de data: ${period}`);
      } else {
        console.log(`   ❌ NENHUM campo de período encontrado na API`);
        console.log(`   🔍 Campos disponíveis:`, Object.keys(item));
      }

      console.log(`📝 RESULTADO Item ${index + 1}: period='${period}', fob=${fob}, kg=${kg}`);

      // Adicionar apenas se tiver dados válidos da API
      if (fob > 0 || kg > 0) {
        processed.push({ period, fob, kg });
        console.log(`   ✅ Item adicionado ao processamento`);
      } else {
        console.log(`   ⚠️ Item ignorado (sem FOB nem KG válidos)`);
      }
    });

    console.log(`\n📊 RESUMO DO PROCESSAMENTO:`);
    console.log(`   Total de itens da API: ${dataArray.length}`);
    console.log(`   Itens processados: ${processed.length}`);

    // ✅ AGRUPAMENTO por período - Apenas dados reais
    const grouped: { [key: string]: ComexData } = {};
    processed.forEach(item => {
      if (!grouped[item.period]) {
        grouped[item.period] = { period: item.period, fob: 0, kg: 0 };
      }
      grouped[item.period].fob += item.fob;
      grouped[item.period].kg += item.kg;
    });

    const result = Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
    
    console.log(`\n📈 DADOS FINAIS AGRUPADOS (${result.length} períodos):`, result);
    
    return result;
  };

  // ✅ FETCH COM RATE LIMITING E CACHE
  const fetchData = useCallback(async () => {
    // Verificar cache primeiro
    const cacheKey = getCacheKey(filters.flow, filters.period.from, filters.period.to);
    const cachedData = getFromCache(cacheKey);
    
    if (cachedData) {
      console.log('📦 Usando dados do cache');
      const processedData = processOfficialData(cachedData);
      const calculatedMetrics = calculateMetrics(processedData);
      
      setData(processedData);
      setMetrics(calculatedMetrics);
      setConnected(true);
      setLoading(false);
      setError('');
      setRateLimited(false);
      setRetryCount(0);
      setRawDataInfo(`Cache Real: ${processedData.length} períodos`);
      return;
    }

    setLoading(true);
    setError('');
    setRawDataInfo('');
    
    try {
      // Respeitar rate limiting
      await respectRateLimit();
      
      console.log('🚀 Fazendo requisição com payload corrigido...');
      
      // ✅ PAYLOAD CORRETO FINAL
      const payload = {
        flow: filters.flow,
        monthDetail: true,
        period: filters.period,
        metrics: ['metricFOB', 'metricKG']
      };

      console.log('📋 Payload final enviado:', JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE}/general?language=pt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 Status:', response.status);

      // ✅ TRATAR ERRO 429 ESPECIFICAMENTE
      if (response.status === 429) {
        console.warn('⚠️ Rate limit atingido (429)');
        
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          await retryWithBackoff(retryCount);
          return;
        } else {
          throw new Error('Rate limit excedido. Tente novamente em alguns minutos.');
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Dados recebidos:', result);

      // Salvar no cache
      saveToCache(cacheKey, result.data);

      setConnected(true);
      setRateLimited(false);
      setRetryCount(0);

      const processedData = processOfficialData(result.data);
      const calculatedMetrics = calculateMetrics(processedData);

      setData(processedData);
      setMetrics(calculatedMetrics);
      setRawDataInfo(`API Real: ${processedData.length} períodos extraídos`);

    } catch (err: any) {
      console.error('❌ Erro:', err);
      setError(err.message);
      setConnected(false);
      
      // Se for erro de rate limit, não mostrar como erro crítico
      if (err.message.includes('429') || err.message.includes('Rate limit')) {
        setError('');
        setRateLimited(true);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, retryCount]);

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

    return { totalFOB, totalKG, growth, recordCount: data.length };
  };

  // Funções auxiliares
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value);
  };

  const formatWeight = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value) + ' kg';
  };

  // Função para alterar período rapidamente
  const setPeriod = (year: string) => {
    setFilters({
      ...filters,
      period: { from: `${year}-01`, to: `${year}-12` }
    });
  };

  // ✅ DEBOUNCE PARA MUDANÇAS DE FILTRO
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [filters]);

  // ✅ CLEANUP
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // ✅ RENDER COM RATE LIMITING STATE
  if (loading && !rateLimited) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados ComexStat...</p>
          <p className="text-xs text-gray-500 mt-2">Cache: {cacheRef.current.size} entradas</p>
        </div>
      </div>
    );
  }

  if (rateLimited) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Clock className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Rate Limit Atingido</h3>
          <p className="text-gray-600 mb-4">
            A API ComexStat está limitando requisições. Aguardando para nova tentativa...
          </p>
          {nextRetryIn > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-sm text-yellow-800">
                Próxima tentativa em: <strong>{nextRetryIn}s</strong>
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Tentativa {retryCount + 1} de 3
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setRetryCount(0);
              fetchData();
            }}
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
        <p className="text-gray-600">Dados Oficiais do Governo Federal - Duri Trading</p>
        
        {/* Status */}
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800">
              API conectada - {metrics.recordCount} períodos - Cache: {cacheRef.current.size}
            </span>
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
              onChange={(e) => setFilters({...filters, flow: e.target.value as 'export' | 'import'})}
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

        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700 mr-2">Períodos:</span>
          <button onClick={() => setPeriod('2023')} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">2023</button>
          <button onClick={() => setPeriod('2022')} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">2022</button>
          <button onClick={() => setPeriod('2021')} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">2021</button>
          <button 
            onClick={forceDebugAndReload}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
          >
            🐛 Debug API
          </button>
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
              <p className="text-sm font-medium text-gray-600">Períodos</p>
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
          <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum Dado Encontrado</h3>
          <p className="text-gray-600 mb-4">Ajuste os filtros ou aguarde o cache</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>✅ API ComexStat Oficial - Apenas Dados Reais - Duri Trading</p>
        <p>Cache: 10min | Rate Limit: 2s | Debug: Estrutura real da API</p>
        <p className="text-xs text-blue-600 mt-1">
          Console: Análise completa da estrutura de dados real da API ComexStat
        </p>
      </div>
    </div>
  );
};

export default ComexStatDashboard;