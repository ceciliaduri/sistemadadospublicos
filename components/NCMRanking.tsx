// components/NCMRanking.tsx - Ranking dos NCMs mais importados/exportados
'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, TrendingUp, Hash, RefreshCw, Download } from 'lucide-react';

const API_BASE = 'https://api-comexstat.mdic.gov.br';

interface NCMData {
  ncm: string;
  description: string;
  fob: number;
  kg: number;
  percentage: number;
}

interface NCMRankingProps {
  flow: 'export' | 'import';
  period: { from: string; to: string };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

export const NCMRanking: React.FC<NCMRankingProps> = ({ flow, period }) => {
  const [data, setData] = useState<NCMData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'bar' | 'pie'>('bar');

  const fetchNCMData = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Buscando dados de NCM...');
      
      // ✅ TENTAR DIFERENTES ESTRUTURAS DE DETAILS PARA NCM
      const possibleDetails = ['ncm', 'sh4', 'sh2', 'produto', 'codigo'];
      
      for (const detail of possibleDetails) {
        try {
          const payload = {
            flow,
            monthDetail: false,
            period,
            details: [detail],
            metrics: ['metricFOB', 'metricKG']
          };

          console.log(`🧪 Testando detail: ${detail}`, payload);

          const response = await fetch(`${API_BASE}/general?language=pt`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`✅ Resposta para ${detail}:`, result);

            if (result.data && result.data.list && Array.isArray(result.data.list) && result.data.list.length > 0) {
              const processedData = processNCMData(result.data.list);
              if (processedData.length > 0) {
                setData(processedData);
                console.log(`🎯 Dados NCM processados com sucesso usando '${detail}':`, processedData.slice(0, 3));
                return; // Sucesso, parar tentativas
              }
            }
          }
        } catch (detailError) {
          console.log(`❌ Falha com detail '${detail}':`, detailError);
        }

        // Delay entre tentativas
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Se chegou aqui, nenhum detail funcionou
      throw new Error('Nenhum parâmetro de detail funcionou para NCM. Verifique a API.');

    } catch (error: any) {
      console.error('❌ Erro ao buscar dados NCM:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const processNCMData = (rawData: any[]): NCMData[] => {
    console.log('🔄 Processando dados NCM...', rawData.slice(0, 3));

    const ncmMap: { [key: string]: { fob: number; kg: number; description: string } } = {};
    let totalFOB = 0;

    rawData.forEach((item, index) => {
      // ✅ BUSCAR CÓDIGO NCM EM DIFERENTES CAMPOS
      let ncmCode = '';
      const ncmFields = ['ncm', 'coNcm', 'CO_NCM', 'sh4', 'sh2', 'codigo', 'product_code'];
      
      for (const field of ncmFields) {
        if (item[field]) {
          ncmCode = item[field].toString();
          break;
        }
      }

      // ✅ BUSCAR DESCRIÇÃO EM DIFERENTES CAMPOS
      let description = '';
      const descFields = ['noNcm', 'descricao', 'description', 'produto', 'product_name', 'nome'];
      
      for (const field of descFields) {
        if (item[field]) {
          description = item[field].toString();
          break;
        }
      }

      // ✅ BUSCAR VALORES FOB E KG
      const fob = parseFloat(item.metricFOB || item.vlFob || item.fob || 0);
      const kg = parseFloat(item.metricKG || item.kgLiq || item.kg || 0);

      if (ncmCode && fob > 0) {
        if (!ncmMap[ncmCode]) {
          ncmMap[ncmCode] = { fob: 0, kg: 0, description: description || `NCM ${ncmCode}` };
        }
        ncmMap[ncmCode].fob += fob;
        ncmMap[ncmCode].kg += kg;
        totalFOB += fob;
      }

      if (index < 3) {
        console.log(`📋 Item ${index + 1}: ncm=${ncmCode}, desc=${description}, fob=${fob}, kg=${kg}`);
      }
    });

    // Converter para array e calcular percentuais
    const ncmArray = Object.entries(ncmMap)
      .map(([ncm, data]) => ({
        ncm,
        description: data.description,
        fob: data.fob,
        kg: data.kg,
        percentage: totalFOB > 0 ? (data.fob / totalFOB) * 100 : 0
      }))
      .sort((a, b) => b.fob - a.fob)
      .slice(0, 20); // Top 20

    console.log(`🎯 NCM processados: ${ncmArray.length} itens`, ncmArray.slice(0, 5));
    return ncmArray;
  };

  useEffect(() => {
    fetchNCMData();
  }, [flow, period.from, period.to]);

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

  const exportData = () => {
    const exportContent = {
      flow,
      period,
      timestamp: new Date().toISOString(),
      data: data.map(item => ({
        ncm: item.ncm,
        description: item.description,
        fob_usd: item.fob,
        peso_kg: item.kg,
        percentual: item.percentage.toFixed(2) + '%'
      }))
    };

    const blob = new Blob([JSON.stringify(exportContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ncm-ranking-${flow}-${period.from}-${period.to}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando dados de NCM...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Package className="h-6 w-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              NCM - {flow === 'export' ? 'Exportação' : 'Importação'}
            </h3>
            <p className="text-sm text-gray-600">
              Produtos mais negociados por código NCM
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('bar')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'bar' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              Barras
            </button>
            <button
              onClick={() => setViewMode('pie')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'pie' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              Pizza
            </button>
          </div>

          <button
            onClick={fetchNCMData}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {data.length > 0 && (
            <button
              onClick={exportData}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Exportar dados"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
          <button
            onClick={fetchNCMData}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {data.length > 0 ? (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <Hash className="h-5 w-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-purple-600">Total NCMs</p>
                  <p className="text-lg font-semibold text-purple-900">{data.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-green-600">Top NCM</p>
                  <p className="text-lg font-semibold text-green-900">
                    {formatCurrency(data[0]?.fob || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <Package className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-blue-600">Total FOB</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {formatCurrency(data.reduce((sum, item) => sum + item.fob, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          {viewMode === 'bar' ? (
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Top 20 NCMs por Valor FOB</h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.slice(0, 20)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={formatCurrency} />
                  <YAxis 
                    type="category" 
                    dataKey="ncm" 
                    width={80}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'FOB']}
                    labelFormatter={(label) => `NCM: ${label}`}
                  />
                  <Bar dataKey="fob" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Distribuição Top 8 NCMs</h4>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={data.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ ncm, percentage }) => `${ncm} (${percentage.toFixed(1)}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="fob"
                  >
                    {data.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'FOB']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Detalhamento por NCM</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NCM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor FOB
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Peso (KG)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((item, index) => (
                    <tr key={item.ncm} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {item.ncm}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(item.fob)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatWeight(item.kg)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.percentage.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : !loading && !error && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado NCM encontrado</h3>
          <p className="text-gray-600 mb-4">
            Verifique se o período selecionado tem dados disponíveis ou se a API suporta dados de NCM.
          </p>
          <button
            onClick={fetchNCMData}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );
};

export default NCMRanking;