// components/NCMRankingEnhanced.tsx - ATUALIZADO COM SERVICE OTIMIZADO
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { comexstatServiceOptimized } from '../services/comexstatServiceOptimized'; // ✅ SERVICE ATUALIZADO

interface NCMData {
  ncm: string;
  descricao: string;
  fob: number;
  kg: number;
  qtEstat: number;
  participacao: number;
  posicao: number;
}

interface FilterState {
  flow: 'export' | 'import';
  period: { from: string; to: string };
  limit: number;
}

const NCMRankingEnhanced: React.FC = () => {
  const [data, setData] = useState<NCMData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [systemStats, setSystemStats] = useState<any>(null);

  // ✅ FILTROS SIMPLIFICADOS (sem filtros geográficos complexos)
  const [filters, setFilters] = useState<FilterState>({
    flow: 'export',
    period: { from: '2023-01', to: '2023-12' },
    limit: 20
  });

  // ✅ CARREGAR DADOS COM SISTEMA OTIMIZADO
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔄 Carregando dados NCM com sistema otimizado...');
      
      // Obter estatísticas do sistema
      const stats = comexstatServiceOptimized.getSystemStats();
      setSystemStats(stats);
      
      const result = await comexstatServiceOptimized.getNCMRanking(
        filters.flow,
        filters.period,
        filters.limit
      );

      console.log(`✅ ${result.length} NCMs carregados (sistema otimizado)`);
      
      // Adicionar posições ao ranking
      const rankedData = result.map((item, index) => ({
        ...item,
        posicao: index + 1
      }));

      setData(rankedData);

      if (rankedData.length === 0) {
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

  // ✅ CONTROLES DE FILTRO SIMPLIFICADOS
  const renderFilters = () => (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros de Consulta</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Período - De</label>
          <input
            type="month"
            value={filters.period.from}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              period: { ...prev.period, from: e.target.value }
            }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Até</label>
          <input
            type="month"
            value={filters.period.to}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              period: { ...prev.period, to: e.target.value }
            }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Top</label>
          <select
            value={filters.limit}
            onChange={(e) => setFilters(prev => ({ ...prev, limit: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={30}>Top 30</option>
            <option value={50}>Top 50</option>
          </select>
        </div>
      </div>

      {/* Sistema Stats */}
      {systemStats && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Sistema Otimizado Ativo</h4>
          <div className="grid grid-cols-4 gap-4 text-xs text-blue-700">
            <div>
              <span className="font-medium">Fila:</span> {systemStats.rateLimiter.queueLength} requests
            </div>
            <div>
              <span className="font-medium">Cache:</span> {systemStats.cache.size} itens
            </div>
            <div>
              <span className="font-medium">Delay:</span> {Math.round(systemStats.rateLimiter.currentDelay / 1000)}s
            </div>
            <div className={systemStats.rateLimiter.requestsInWindow >= 15 ? 'text-red-700 font-bold' : ''}>
              <span className="font-medium">Requests:</span> {systemStats.rateLimiter.requestsInWindow}/15
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={loadData}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
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
              ({data.length} NCMs encontrados)
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // ✅ HEADER COM INFORMAÇÕES OTIMIZADAS
  const renderHeader = () => (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Package className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Análise por NCM - {filters.flow === 'export' ? 'Exportação' : 'Importação'}
            </h2>
            <p className="text-gray-600">
              Produtos com dados reais da API oficial MDIC - Sistema sem rate limit
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center text-sm text-green-600 mb-1">
            <CheckCircle className="h-4 w-4 mr-1" />
            Sistema Otimizado
          </div>
          <p className="text-xs text-gray-500">
            Rate limiting inteligente + Cache avançado
          </p>
        </div>
      </div>
    </div>
  );

  // ✅ GRÁFICO DE RANKING NCM
  const renderChart = () => {
    if (data.length === 0) return null;

    const chartData = data.slice(0, 15).map(item => ({
      ncm: item.ncm,
      descricao: item.descricao?.length > 25 ? 
        item.descricao.substring(0, 25) + '...' : 
        item.descricao || `NCM ${item.ncm}`,
      fob: item.fob / 1000000, // Milhões
      participacao: item.participacao
    }));

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Ranking NCM - {filters.flow === 'export' ? 'Exportação' : 'Importação'}
          </h3>
          <div className="flex items-center text-sm text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            Dados Reais MDIC
          </div>
        </div>

        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis 
              dataKey="descricao" 
              type="category" 
              width={200}
              fontSize={12}
            />
            <Tooltip 
              formatter={(value: any) => [`US$ ${value.toFixed(1)}M`, 'FOB']}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey="fob" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-blue-600">
              {data.length}
            </div>
            <div className="text-gray-600">NCMs Encontrados</div>
          </div>
          
          <div className="text-center">
            <div className="font-semibold text-green-600">
              US$ {(data.reduce((sum, item) => sum + item.fob, 0) / 1000000000).toFixed(1)}B
            </div>
            <div className="text-gray-600">Volume Total</div>
          </div>
          
          <div className="text-center">
            <div className="font-semibold text-purple-600">
              {data[0]?.participacao?.toFixed(1) || 0}%
            </div>
            <div className="text-gray-600">Participação Líder</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderHeader()}
      {renderFilters()}

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
          <p className="text-blue-800">Carregando dados NCM com sistema otimizado...</p>
          <p className="text-sm text-blue-600 mt-2">
            Processamento inteligente sem rate limit
          </p>
        </div>
      )}

      {/* Chart */}
      {!loading && !error && renderChart()}

      {/* Empty State */}
      {!loading && !error && data.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado NCM encontrado</h3>
          <p className="text-gray-600 mb-4">
            Não há dados disponíveis na API ComexStat para o período selecionado.
          </p>
          <p className="text-sm text-gray-500">
            Tente ajustar os filtros ou selecionar um período diferente.
          </p>
        </div>
      )}

      {/* Tabela de dados (quando houver dados) */}
      {!loading && !error && data.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Detalhes do Ranking</h3>
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
                    Valor FOB (US$)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participação %
                  </th>
                </tr>
              </thead>
              
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slice(0, 10).map((item, index) => (
                  <tr key={item.ncm} className={index < 3 ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{item.posicao}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.ncm}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {item.descricao}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {(item.fob / 1000000).toFixed(1)}M
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {item.participacao.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default NCMRankingEnhanced;
export { NCMRankingEnhanced };