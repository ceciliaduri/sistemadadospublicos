// components/RankingConsolidado.tsx - SUBSTITUI RankingRealOnly.tsx + NCMRankingEnhanced.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, Building, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { comexstatServiceOptimized } from '../services/comexstatServiceOptimized';

// ✅ INTERFACES ESSENCIAIS
interface RankingData {
  ncm?: string;
  codigoEstado?: string;
  descricao: string;
  fob: number;
  kg: number;
  participacao: number;
  tipo: 'NCM' | 'ESTADO';
}

interface RankingProps {
  flow: 'export' | 'import';
  period: { from: string; to: string };
  viewType?: 'ncm' | 'estados' | 'both';
  limit?: number;
}

const RankingConsolidado: React.FC<RankingProps> = ({ 
  flow = 'export',
  period = { from: '2023-01', to: '2023-12' },
  viewType = 'both',
  limit = 20
}) => {
  // ✅ ESTADOS ESSENCIAIS
  const [ncmData, setNcmData] = useState<RankingData[]>([]);
  const [estadosData, setEstadosData] = useState<RankingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentLimit, setCurrentLimit] = useState(limit);

  // ✅ CARREGAR DADOS OTIMIZADO
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const promises: Promise<RankingData[]>[] = [];

      // NCM Data
      if (viewType === 'ncm' || viewType === 'both') {
        promises.push(
          comexstatServiceOptimized.getNCMRanking(flow, period, currentLimit)
            .then(data => data.map(item => ({
              ncm: item.ncm,
              descricao: item.descricao || `Produto NCM ${item.ncm}`,
              fob: item.fob,
              kg: item.kg,
              participacao: item.participacao,
              tipo: 'NCM' as const
            })))
            .catch(() => [])
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      // Estados Data
      if (viewType === 'estados' || viewType === 'both') {
        promises.push(
          comexstatServiceOptimized.getEmpresaRanking(flow, period, currentLimit)
            .then(data => data.map(item => ({
              codigoEstado: item.cnpj || item.codigo,
              descricao: item.razaoSocial || item.nome || `Estado ${item.cnpj}`,
              fob: item.fob,
              kg: item.kg,
              participacao: item.participacao,
              tipo: 'ESTADO' as const
            })))
            .catch(() => [])
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      const [ncmResult, estadosResult] = await Promise.all(promises);

      setNcmData(ncmResult);
      setEstadosData(estadosResult);

      if (ncmResult.length === 0 && estadosResult.length === 0) {
        setError('Nenhum dado encontrado para o período selecionado');
      }

    } catch (error: any) {
      setError(error.message || 'Erro ao carregar dados');
      setNcmData([]);
      setEstadosData([]);
    } finally {
      setLoading(false);
    }
  }, [flow, period.from, period.to, viewType, currentLimit]);

  // ✅ CARREGAR NA INICIALIZAÇÃO
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ✅ FORMATAÇÃO DE VALORES
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    return `${(value / 1000).toFixed(1)}K`;
  };

  // ✅ RENDERIZAR SEÇÃO NCM
  const renderNCMSection = () => {
    if (viewType === 'estados' || ncmData.length === 0) return null;

    const chartData = ncmData.slice(0, 10).map((item, index) => ({
      codigo: item.ncm,
      nome: item.descricao.length > 25 ? item.descricao.substring(0, 25) + '...' : item.descricao,
      valor: item.fob / 1000000,
      posicao: index + 1
    }));

    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Package className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold">
              Ranking NCM - {flow === 'export' ? 'Exportação' : 'Importação'}
            </h3>
          </div>
          <div className="text-sm text-green-600 flex items-center">
            <CheckCircle className="h-4 w-4 mr-1" />
            {ncmData.length} produtos
          </div>
        </div>

        {/* Gráfico NCM */}
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="codigo" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => [`US$ ${value.toFixed(1)}M`, 'FOB']}
                labelFormatter={(label) => `NCM: ${label}`}
              />
              <Bar dataKey="valor" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela NCM */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Posição</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">NCM</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Valor FOB</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Participação</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ncmData.slice(0, 10).map((item, index) => (
                <tr key={item.ncm} className={index < 3 ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">#{index + 1}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{item.ncm}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">{item.descricao}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-900">US$ {formatCurrency(item.fob)}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-900">{item.participacao.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ✅ RENDERIZAR SEÇÃO ESTADOS
  const renderEstadosSection = () => {
    if (viewType === 'ncm' || estadosData.length === 0) return null;

    const chartData = estadosData.slice(0, 10).map((item, index) => ({
      codigo: item.codigoEstado,
      nome: item.descricao.length > 20 ? item.descricao.substring(0, 20) + '...' : item.descricao,
      valor: item.fob / 1000000,
      posicao: index + 1
    }));

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Building className="h-5 w-5 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold">
              Ranking por Estado - {flow === 'export' ? 'Exportação' : 'Importação'}
            </h3>
          </div>
          <div className="text-sm text-green-600 flex items-center">
            <CheckCircle className="h-4 w-4 mr-1" />
            {estadosData.length} estados
          </div>
        </div>

        {/* Gráfico Estados */}
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="nome" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => [`US$ ${value.toFixed(1)}M`, 'FOB']}
              />
              <Bar dataKey="valor" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela Estados */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Posição</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Valor FOB</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Participação</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {estadosData.slice(0, 10).map((item, index) => (
                <tr key={item.codigoEstado} className={index < 3 ? 'bg-orange-50' : ''}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">#{index + 1}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.descricao}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-900">US$ {formatCurrency(item.fob)}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-900">{item.participacao.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header com Controles */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Análise de Rankings - {flow === 'export' ? 'Exportação' : 'Importação'}
            </h2>
            <p className="text-gray-600">
              Período: {period.from} a {period.to} - Apenas dados reais MDIC
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={currentLimit}
              onChange={(e) => setCurrentLimit(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
            </select>

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
          </div>
        </div>
      </div>

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
          <p className="text-blue-800">Buscando dados reais na API ComexStat...</p>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {renderNCMSection()}
          {renderEstadosSection()}

          {/* Empty State */}
          {ncmData.length === 0 && estadosData.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado encontrado</h3>
              <p className="text-gray-600">
                Não há dados disponíveis para o período selecionado.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RankingConsolidado;
export { RankingConsolidado };