'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Calendar, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import DebugInline from './DebugInline';
import TesteCorrecao from './TesteCorrecao';

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

  // Cache em memória
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const lastRequestRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // ✅ PARSING ROBUSTO DE PERÍODO - CORREÇÃO PRINCIPAL
  const extractPeriodFromItem = (item: any): string => {
    console.log('🔍 EXTRAINDO PERÍODO DE:', item);
    
    // Tentar todas as variações possíveis da API ComexStat
    const periodMappings = [
      // Formato direto
      { check: () => item.period, format: (val: any) => val.toString() },
      { check: () => item.date, format: (val: any) => val.toString() },
      { check: () => item.data, format: (val: any) => val.toString() },
      
      // Ano + Mês separados
      { 
        check: () => item.coAno && item.coMes, 
        format: () => `${item.coAno}-${String(item.coMes).padStart(2, '0')}` 
      },
      { 
        check: () => item.CO_ANO && item.CO_MES, 
        format: () => `${item.CO_ANO}-${String(item.CO_MES).padStart(2, '0')}` 
      },
      { 
        check: () => item.ano && item.mes, 
        format: () => `${item.ano}-${String(item.mes).padStart(2, '0')}` 
      },
      { 
        check: () => item.year && item.month, 
        format: () => `${item.year}-${String(item.month).padStart(2, '0')}` 
      },
      
      // Apenas ano
      { check: () => item.coAno, format: (val: any) => val.toString() },
      { check: () => item.CO_ANO, format: (val: any) => val.toString() },
      { check: () => item.ano, format: (val: any) => val.toString() },
      { check: () => item.year, format: (val: any) => val.toString() },
      
      // Formatos de data mais complexos
      { 
        check: () => item.dtAno && item.dtMes, 
        format: () => `${item.dtAno}-${String(item.dtMes).padStart(2, '0')}` 
      },
      { 
        check: () => item.anoMes, 
        format: (val: any) => {
          const str = val.toString();
          if (str.length === 6) {
            return `${str.substring(0, 4)}-${str.substring(4, 6)}`;
          }
          return str;
        }
      }
    ];

    for (const mapping of periodMappings) {
      try {
        if (mapping.check()) {
          const result = mapping.format(mapping.check());
          console.log(`✅ Período extraído: ${result}`);
          return result;
        }
      } catch (error) {
        console.log(`❌ Erro ao extrair período:`, error);
      }
    }

    console.log('❌ NENHUM PERÍODO ENCONTRADO - Campos disponíveis:', Object.keys(item));
    return 'Período não identificado';
  };

  // ✅ PROCESSAMENTO OTIMIZADO COM DEBUGGING AVANÇADO
  const processOfficialData = (rawData: any): ComexData[] => {
    console.log('🔄 === PROCESSAMENTO AVANÇADO DOS DADOS ===');
    console.log('🔍 Raw Data Type:', typeof rawData);
    console.log('🔍 Raw Data Is Array:', Array.isArray(rawData));
    console.log('🔍 Raw Data:', rawData);
    
    if (!rawData) {
      console.log('❌ Dados nulos recebidos');
      return [];
    }

    let dataArray: any[] = [];
    
    // ✅ CORREÇÃO ESPECÍFICA PARA COMEXSTAT: dados estão em data.list
    if (Array.isArray(rawData)) {
      dataArray = rawData;
      console.log('✅ Dados são array direto:', dataArray.length);
    } else if (rawData && typeof rawData === 'object') {
      console.log('🔍 Objeto recebido. Chaves disponíveis:', Object.keys(rawData));
      
      // ✅ PRIORIDADE PARA ESTRUTURA COMEXSTAT: data.list
      if (rawData.data && rawData.data.list && Array.isArray(rawData.data.list)) {
        dataArray = rawData.data.list;
        console.log(`✅ Array ComexStat encontrado em 'data.list':`, dataArray.length, 'itens');
      } else if (rawData.list && Array.isArray(rawData.list)) {
        dataArray = rawData.list;
        console.log(`✅ Array encontrado em 'list':`, dataArray.length, 'itens');
      } else {
        // Tentar outras estruturas comuns
        const possibleArrayKeys = ['data', 'items', 'records', 'result', 'results', 'valores', 'dados'];
        for (const key of possibleArrayKeys) {
          if (rawData[key] && Array.isArray(rawData[key])) {
            dataArray = rawData[key];
            console.log(`✅ Array encontrado em '${key}':`, dataArray.length, 'itens');
            break;
          }
        }
      }
      
      // Se não encontrou array, logar estrutura completa
      if (dataArray.length === 0) {
        console.log('❌ Nenhum array encontrado. Estrutura completa:');
        console.log('🔍 Keys:', Object.keys(rawData));
        Object.keys(rawData).forEach(key => {
          console.log(`  ${key}:`, typeof rawData[key], Array.isArray(rawData[key]) ? `(array: ${rawData[key].length})` : '');
          if (typeof rawData[key] === 'object' && rawData[key] !== null && !Array.isArray(rawData[key])) {
            console.log(`    Sub-keys:`, Object.keys(rawData[key]));
            // ✅ VERIFICAÇÃO ESPECIAL PARA ESTRUTURAS ANINHADAS
            Object.keys(rawData[key]).forEach(subKey => {
              if (Array.isArray(rawData[key][subKey])) {
                console.log(`      🎯 Array encontrado em ${key}.${subKey}:`, rawData[key][subKey].length, 'itens');
                if (dataArray.length === 0) { // Se ainda não encontrou dados
                  dataArray = rawData[key][subKey];
                  console.log(`✅ Usando dados de ${key}.${subKey}`);
                }
              }
            });
          }
        });
        
        if (dataArray.length === 0) {
          return [];
        }
      }
    } else {
      console.log('❌ Tipo de dados não suportado:', typeof rawData);
      return [];
    }

    console.log(`📊 TOTAL DE REGISTROS: ${dataArray.length}`);

    if (dataArray.length === 0) {
      console.log('⚠️ Array vazio retornado da API');
      return [];
    }

    // Análise dos primeiros itens para debug
    console.log('🔍 === ANÁLISE ESTRUTURAL DETALHADA ===');
    dataArray.slice(0, Math.min(5, dataArray.length)).forEach((item, index) => {
      console.log(`📋 ITEM ${index + 1}:`);
      console.log('  Tipo:', typeof item);
      console.log('  Chaves:', Object.keys(item || {}));
      console.log('  Dados completos:', item);
      
      // Análise específica de campos de período
      const periodFields = Object.keys(item || {}).filter(key => 
        key.toLowerCase().includes('ano') ||
        key.toLowerCase().includes('mes') ||
        key.toLowerCase().includes('period') ||
        key.toLowerCase().includes('date') ||
        key.toLowerCase().includes('time') ||
        key.toLowerCase().includes('year') ||
        key.toLowerCase().includes('month') ||
        key.toLowerCase().includes('data')
      );
      
      if (periodFields.length > 0) {
        console.log('  📅 Campos temporais encontrados:', periodFields);
        periodFields.forEach(field => {
          console.log(`    ${field}: ${item[field]} (tipo: ${typeof item[field]})`);
        });
      } else {
        console.log('  ❌ NENHUM campo temporal óbvio encontrado');
      }

      // Análise específica de campos de valor
      const valueFields = Object.keys(item || {}).filter(key =>
        key.toLowerCase().includes('fob') ||
        key.toLowerCase().includes('valor') ||
        key.toLowerCase().includes('kg') ||
        key.toLowerCase().includes('peso') ||
        key.toLowerCase().includes('weight') ||
        key.toLowerCase().includes('value') ||
        key.toLowerCase().includes('amount')
      );

      if (valueFields.length > 0) {
        console.log('  💰 Campos de valor encontrados:', valueFields);
        valueFields.forEach(field => {
          console.log(`    ${field}: ${item[field]} (tipo: ${typeof item[field]})`);
        });
      } else {
        console.log('  ❌ NENHUM campo de valor óbvio encontrado');
      }
    });

    const processed: ComexData[] = [];

    dataArray.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        console.log(`⚠️ Item ${index + 1} inválido:`, item);
        return;
      }

      console.log(`\n🔍 PROCESSANDO ITEM ${index + 1}:`);

      // ✅ EXTRAÇÃO ROBUSTA DE FOB
      let fob = 0;
      const fobFields = [
        'metricFOB', 'vlFob', 'fob', 'vlTotal', 'valor', 'VL_FOB', 'FOB',
        'valorFob', 'vlr_fob', 'value', 'amount', 'vlrFob', 'totalValue'
      ];
      
      console.log('  🔍 Tentando extrair FOB...');
      for (const field of fobFields) {
        if (item[field] !== undefined && item[field] !== null) {
          console.log(`    Testando ${field}: ${item[field]} (tipo: ${typeof item[field]})`);
          const rawValue = item[field].toString().replace(/[^0-9.-]/g, '');
          const value = parseFloat(rawValue);
          if (!isNaN(value) && value > 0) {
            fob = value;
            console.log(`    ✅ FOB encontrado em '${field}': ${fob}`);
            break;
          }
        }
      }

      // ✅ EXTRAÇÃO ROBUSTA DE KG
      let kg = 0;
      const kgFields = [
        'metricKG', 'kgLiq', 'kg', 'peso', 'qtKg', 'KG_LIQUIDO', 'pesoLiquido',
        'weight', 'qtde', 'quantidade', 'kg_liquido', 'netWeight'
      ];
      
      console.log('  🔍 Tentando extrair KG...');
      for (const field of kgFields) {
        if (item[field] !== undefined && item[field] !== null) {
          console.log(`    Testando ${field}: ${item[field]} (tipo: ${typeof item[field]})`);
          const rawValue = item[field].toString().replace(/[^0-9.-]/g, '');
          const value = parseFloat(rawValue);
          if (!isNaN(value) && value > 0) {
            kg = value;
            console.log(`    ✅ KG encontrado em '${field}': ${kg}`);
            break;
          }
        }
      }

      // ✅ EXTRAÇÃO CORRIGIDA DE PERÍODO
      console.log('  🔍 Tentando extrair PERÍODO...');
      const period = extractPeriodFromItem(item);

      console.log(`  📝 RESULTADO: period='${period}', fob=${fob}, kg=${kg}`);

      // Critério de validação mais flexível
      if (period !== 'Período não identificado') {
        processed.push({ period, fob, kg });
        console.log(`    ✅ Item ${index + 1} ADICIONADO`);
      } else {
        console.log(`    ❌ Item ${index + 1} REJEITADO (período não identificado)`);
      }
    });

    console.log(`\n📈 RESUMO DO PROCESSAMENTO:`);
    console.log(`  Total de itens da API: ${dataArray.length}`);
    console.log(`  Itens processados e válidos: ${processed.length}`);
    
    if (processed.length === 0) {
      console.log(`\n🚨 NENHUM ITEM PROCESSADO - INVESTIGAÇÃO NECESSÁRIA:`);
      console.log(`  1. Verifique se a API está retornando dados no formato esperado`);
      console.log(`  2. Confirme os campos de período na resposta da API`);
      console.log(`  3. Verifique se há dados para o período solicitado`);
      console.log(`  4. Use o Debug Panel para análise detalhada`);
    }

    // ✅ AGRUPAMENTO INTELIGENTE POR PERÍODO
    const grouped: { [key: string]: ComexData } = {};
    processed.forEach(item => {
      if (!grouped[item.period]) {
        grouped[item.period] = { period: item.period, fob: 0, kg: 0 };
      }
      grouped[item.period].fob += item.fob;
      grouped[item.period].kg += item.kg;
    });

    // ✅ ORDENAÇÃO TEMPORAL CORRETA
    const result = Object.values(grouped).sort((a, b) => {
      // Tentar parsing de data para ordenação correta
      const dateA = new Date(a.period.includes('-') ? a.period : `${a.period}-01`);
      const dateB = new Date(b.period.includes('-') ? b.period : `${b.period}-01`);
      
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return a.period.localeCompare(b.period);
      }
      
      return dateA.getTime() - dateB.getTime();
    });

    console.log(`\n🎯 RESULTADO FINAL (${result.length} períodos):`, result);
    
    return result;
  };

  // ✅ CÁLCULO DE MÉTRICAS CORRIGIDO
  const calculateMetrics = (data: ComexData[]): Metrics => {
    if (data.length === 0) {
      return { totalFOB: 0, totalKG: 0, growth: 0, recordCount: 0 };
    }

    const totalFOB = data.reduce((sum, item) => sum + item.fob, 0);
    const totalKG = data.reduce((sum, item) => sum + item.kg, 0);
    
    // Cálculo de crescimento baseado no primeiro vs último período
    const sortedData = [...data].sort((a, b) => a.period.localeCompare(b.period));
    const firstValue = sortedData[0]?.fob || 0;
    const lastValue = sortedData[sortedData.length - 1]?.fob || 0;
    const growth = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    return { totalFOB, totalKG, growth, recordCount: data.length };
  };

  // Cache helpers
  const getCacheKey = (flow: string, from: string, to: string): string => {
    return `${flow}-${from}-${to}`;
  };

  const getFromCache = (key: string): any | null => {
    const cached = cacheRef.current.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('✅ Cache hit:', key);
      return cached.data;
    }
    if (cached) {
      cacheRef.current.delete(key);
    }
    return null;
  };

  const saveToCache = (key: string, data: any): void => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      key
    });
  };

  const respectRateLimit = async (): Promise<void> => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestRef.current;
    
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
      console.log(`⏳ Rate limit: aguardando ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastRequestRef.current = Date.now();
  };

  // ✅ FETCH PRINCIPAL COM DEBUGGING AVANÇADO
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
      setRawDataInfo(`Cache: ${processedData.length} períodos`);
      return;
    }

    setLoading(true);
    setError('');
    setRawDataInfo('');
    
    try {
      await respectRateLimit();
      
      console.log('🚀 === NOVA REQUISIÇÃO API ===');
      
      // ✅ PAYLOAD CORRIGIDO
      const payload = {
        flow: filters.flow,
        monthDetail: true,
        period: filters.period,
        metrics: ['metricFOB', 'metricKG']
      };

      console.log('📋 Payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE}/general?language=pt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 Response Status:', response.status);

      if (response.status === 429) {
        console.warn('⚠️ Rate limit atingido');
        throw new Error('Rate limit excedido');
      }

      if (!response.ok) {
        throw new Error(`API Error ${response.status}`);
      }

      const apiData = await response.json();
      console.log('✅ Resposta da API:', apiData);

      // Salvar no cache
      saveToCache(cacheKey, apiData);

      // Processar dados
      const processedData = processOfficialData(apiData);
      const calculatedMetrics = calculateMetrics(processedData);

      setData(processedData);
      setMetrics(calculatedMetrics);
      setConnected(true);
      setError('');
      setRateLimited(false);
      setRetryCount(0);
      setRawDataInfo(`API Real: ${processedData.length} períodos extraídos`);

    } catch (error: any) {
      console.error('❌ Erro na requisição:', error);
      setError(error.message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Formatação
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

  const setPeriod = (year: string) => {
    setFilters({
      ...filters,
      period: { from: `${year}-01`, to: `${year}-12` }
    });
  };

  // Effects
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Loading state
  if (loading && !rateLimited) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados ComexStat...</p>
          <p className="text-xs text-gray-500 mt-2">Processando estrutura da API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard ComexStat Brasil</h1>
              <p className="text-gray-600">Dados Oficiais do Governo Federal - Duri Trading</p>
            </div>
          </div>

          {/* Status Connection */}
          <div className="flex items-center space-x-4 mb-6">
            <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
              connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {connected ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  API conectada - {data.length} períodos
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Desconectado
                </>
              )}
            </div>
            {rawDataInfo && (
              <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {rawDataInfo}
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="flow-select" className="block text-sm font-medium text-gray-700 mb-2">Fluxo</label>
              <select
                id="flow-select"
                name="flow"
                value={filters.flow}
                onChange={(e) => setFilters({...filters, flow: e.target.value as 'export' | 'import'})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="export">Exportação</option>
                <option value="import">Importação</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="period-from" className="block text-sm font-medium text-gray-700 mb-2">De</label>
              <input
                id="period-from"
                name="periodFrom"
                type="month"
                value={filters.period.from}
                onChange={(e) => setFilters({...filters, period: {...filters.period, from: e.target.value}})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            
            <div>
              <label htmlFor="period-to" className="block text-sm font-medium text-gray-700 mb-2">Até</label>
              <input
                id="period-to"
                name="periodTo"
                type="month"
                value={filters.period.to}
                onChange={(e) => setFilters({...filters, period: {...filters.period, to: e.target.value}})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* Quick Period Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm font-medium text-gray-700">Períodos:</span>
            {['2023', '2022', '2021'].map(year => (
              <button
                key={year}
                onClick={() => setPeriod(year)}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200"
              >
                {year}
              </button>
            ))}
            <button
              onClick={() => {
                console.log('🐛 === DEBUG MANUAL COMPLETO ===');
                console.log('📊 Dados atuais:', data);
                console.log('📊 Métricas atuais:', metrics);
                console.log('🗄️ Cache atual:', Array.from(cacheRef.current.entries()));
                console.log('⚙️ Filtros atuais:', filters);
                console.log('🔄 Forçando nova requisição...');
                
                // Limpar cache para forçar nova requisição
                cacheRef.current.clear();
                fetchData();
              }}
              className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200"
            >
              🔍 Debug Completo
            </button>
            <button
              onClick={async () => {
                console.log('⚡ === TESTE RÁPIDO DA API ===');
                try {
                  // Teste direto sem cache
                  const testPayload = {
                    flow: 'export',
                    monthDetail: true,
                    period: { from: '2023-01', to: '2023-03' },
                    metrics: ['metricFOB', 'metricKG']
                  };
                  
                  console.log('📋 Payload de teste:', testPayload);
                  
                  const response = await fetch(`${API_BASE}/general?language=pt`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json',
                    },
                    body: JSON.stringify(testPayload)
                  });
                  
                  console.log('📡 Status:', response.status);
                  
                  if (response.ok) {
                    const testData = await response.json();
                    console.log('✅ Resposta de teste:', testData);
                    
                    // Tentar processar os dados de teste
                    const processedTest = processOfficialData(testData);
                    console.log('🎯 Dados processados do teste:', processedTest);
                  } else {
                    console.log('❌ Erro na resposta:', await response.text());
                  }
                } catch (error) {
                  console.error('❌ Erro no teste direto:', error);
                }
              }}
              className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm hover:bg-orange-200"
            >
              ⚡ Teste Direto API
            </button>
          </div>
        </div>

        {/* Debug Inline */}
        <DebugInline
          data={data}
          connected={connected}
          error={error}
          rawDataInfo={rawDataInfo}
          cacheSize={cacheRef.current.size}
          onTestAPI={async () => {
            console.log('⚡ === TESTE DIRETO DA API (via Debug) ===');
            try {
              const testPayload = {
                flow: 'export',
                monthDetail: true,
                period: { from: '2023-01', to: '2023-03' },
                metrics: ['metricFOB', 'metricKG']
              };
              
              console.log('📋 Payload de teste:', testPayload);
              
              const response = await fetch(`${API_BASE}/general?language=pt`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify(testPayload)
              });
              
              console.log('📡 Status resposta:', response.status);
              console.log('📡 Headers resposta:', Object.fromEntries(response.headers.entries()));
              
              if (response.ok) {
                const testData = await response.json();
                console.log('✅ Dados de teste recebidos:', testData);
                
                // Processar dados de teste
                const processedTest = processOfficialData(testData);
                console.log('🎯 Dados processados:', processedTest);
                
                alert(`Teste concluído! Dados processados: ${processedTest.length} períodos. Veja o console para detalhes.`);
              } else {
                const errorText = await response.text();
                console.log('❌ Erro na resposta:', errorText);
                alert(`Erro na API: ${response.status} - ${errorText}`);
              }
            } catch (error: any) {
              console.error('❌ Erro no teste:', error);
              alert(`Erro na requisição: ${error.message}`);
            }
          }}
          onClearCache={() => {
            console.log('🗑️ Limpando cache...');
            cacheRef.current.clear();
            console.log('✅ Cache limpo. Fazendo nova requisição...');
            fetchData();
          }}
        />

        {/* Teste de Correção */}
        <TesteCorrecao />
      </div>

      {/* Metrics Cards */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Valor FOB</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalFOB)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Peso Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatWeight(metrics.totalKG)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              {metrics.growth >= 0 ? (
                <TrendingUp className="h-8 w-8 text-green-600" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-600" />
              )}
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Crescimento</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.growth.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Períodos</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.recordCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="max-w-7xl mx-auto">
        {data.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução FOB</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                  />
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
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                  />
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum Período Encontrado</h3>
            <div className="text-gray-600 mb-6 space-y-2">
              <p>A API está conectada mas não retornou dados processáveis.</p>
              <p className="text-sm">Possíveis causas:</p>
              <ul className="text-sm list-disc list-inside space-y-1 max-w-md mx-auto">
                <li>Período solicitado não tem dados disponíveis</li>
                <li>Estrutura da resposta da API mudou</li>
                <li>Campos de período não estão sendo reconhecidos</li>
                <li>API retornou formato inesperado</li>
              </ul>
            </div>
            <div className="flex justify-center space-x-3">
              <button
                onClick={fetchData}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => {
                  // Testar período mais recente
                  setFilters({
                    ...filters,
                    period: { from: '2023-01', to: '2023-12' }
                  });
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Testar 2023
              </button>
              <button
                onClick={() => {
                  console.log('🔍 === DIAGNÓSTICO COMPLETO ===');
                  console.log('1. Status da conexão:', connected);
                  console.log('2. Filtros atuais:', filters);
                  console.log('3. Dados processados:', data);
                  console.log('4. Último erro:', error);
                  console.log('5. Cache entries:', cacheRef.current.size);
                  console.log('6. Raw data info:', rawDataInfo);
                  alert('Diagnóstico enviado para o console. Abra as DevTools (F12) para ver detalhes.');
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                Diagnóstico
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 space-y-2">
          <p>✅ API ComexStat Oficial - Apenas Dados Reais - Duri Trading</p>
          <p>Cache: 10min | Rate Limit: 2s | Parsing avançado de período temporal</p>
          <div className="text-xs text-blue-600 space-y-1">
            <p>Debug: Análise robusta da estrutura de dados + extração de período otimizada</p>
            <p>Status: {connected ? `✅ Conectado (${data.length} períodos)` : '❌ Desconectado'} | 
               Cache: {cacheRef.current.size} entradas | 
               Último erro: {error || 'Nenhum'}</p>
            {rawDataInfo && <p>Info: {rawDataInfo}</p>}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            <p>💡 Dica: Use o console do navegador (F12) para ver logs detalhados do processamento</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComexStatDashboard;