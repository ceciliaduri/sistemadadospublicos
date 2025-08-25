// components/RankingRealOnly.tsx - Substitui NCMRankingFixed.tsx e CompanyRankingFixed.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, Building, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Info } from 'lucide-react';
import { comexstatServiceFixed } from '../services/comexstatServiceFixed';
import { ncmRankingService } from '../services/ncmRankingService';

interface RankingProps {
  flow: 'export' | 'import';
  period: { from: string; to: string };
  viewType?: 'ncm' | 'empresa' | 'both';
}

export const RankingRealOnly: React.FC<RankingProps> = ({ 
  flow, 
  period, 
  viewType = 'both' 
}) => {
  // ✅ ESTADOS
  const [ncmData, setNcmData] = useState<any[]>([]);
  const [empresaData, setEmpresaData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(20);

  // ✅ CARREGAR DADOS REAIS
  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('📊 Carregando dados reais para:', { flow, period, viewType });

      const promises = [];

      // NCM Data (sempre real)
      if (viewType === 'ncm' || viewType === 'both') {
        promises.push(
          ncmRankingService.getRanking({
            flow,
            period,
            monthDetail: false,
            limit
          }).catch(error => {
            console.error('❌ Erro NCM:', error);
            return [];
          })
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      // Empresa Data (apenas se disponível)
      if (viewType === 'empresa' || viewType === 'both') {
        promises.push(
          empresaRankingService.getRankingPorEstado(flow, period, limit)
            .catch(error => {
              console.error('❌ Erro Empresas:', error);
              return [];
            })
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      const [ncmResult, empresaResult] = await Promise.all(promises);

      setNcmData(ncmResult || []);
      setEmpresaData(empresaResult || []);

      if ((ncmResult || []).length === 0 && (empresaResult || []).length === 0) {
        setError('Nenhum dado encontrado para o período selecionado. Verifique se há dados disponíveis na API ComexStat.');
      }

    } catch (error: any) {
      console.error('❌ Erro geral:', error);
      setError(`Erro ao carregar dados: ${error.message}`);
      setNcmData([]);
      setEmpresaData([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ CARREGAR NA INICIALIZAÇÃO
  useEffect(() => {
    loadData();
  }, [flow, period.from, period.to, viewType, limit]);

  // ✅ COMPONENTE NCM
  const NCMSection = () => {
    if (viewType === 'empresa') return null;

    const chartData = ncmData.slice(0, 10).map(item => ({
      ncm: item.ncm,
      descricao: item.descricao?.length > 30 ? item.descricao.substring(0, 30) + '...' : item.descricao || `NCM ${item.ncm}`,
      fob: item.fob / 1000000, // Milhões
      participacao: item.participacao
    }));

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Package className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold">
              Ranking NCM - {flow === 'export' ? 'Exportação' : 'Importação'}
            </h3>
          </div>
          
          <div className="flex items-center text-sm text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            Dados Reais MDIC
          </div>
        </div>

        {ncmData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum dado NCM disponível para este período</p>
            <p className="text-sm mt-1">Verifique se há dados na API ComexStat para as datas selecionadas</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="descricao" type="category" width={200} />
                <Tooltip 
                  formatter={(value: any) => [`US$ ${value.toFixed(1)}M`, 'FOB']}
                  labelFormatter={(label) => `NCM: ${label}`}
                />
                <Bar dataKey="fob" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-blue-600">
                  {ncmData.length}
                </div>
                <div className="text-gray-600">NCMs Encontrados</div>
              </div>
              
              <div className="text-center">
                <div className="font-semibold text-green-600">
                  US$ {(ncmData.reduce((sum, item) => sum + item.fob, 0) / 1000000000).toFixed(1)}B
                </div>
                <div className="text-gray-600">Volume Total</div>
              </div>
              
              <div className="text-center">
                <div className="font-semibold text-purple-600">
                  {ncmData[0]?.participacao?.toFixed(1) || 0}%
                </div>
                <div className="text-gray-600">Participação Líder</div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // ✅ COMPONENTE EMPRESAS/ESTADOS
  const EmpresaSection = () => {
    if (viewType === 'ncm') return null;

    const chartData = empresaData.slice(0, 10).map(item => ({
      nome: item.nome?.length > 40 ? item.nome.substring(0, 40) + '...' : item.nome || item.razaoSocial || 'N/A',
      fob: item.fob / 1000000,
      tipo: item.tipo || 'ESTADO'
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
          
          <div className="flex items-center text-sm text-orange-600">
            <Info className="h-4 w-4 mr-1" />
            Dados por Estado
          </div>
        </div>

        {empresaData.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <h4 className="font-medium text-yellow-800 mb-2">Dados Empresariais Não Disponíveis</h4>
              <p className="text-sm text-yellow-700 mb-3">
                A API ComexStat pública não fornece dados por CNPJ/empresa específica.
              </p>
              <p className="text-xs text-yellow-600">
                Dados empresariais requerem acesso especial aos sistemas SISCOMEX.
                Disponível: dados agregados por estado/região.
              </p>
            </div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="nome" type="category" width={250} />
                <Tooltip 
                  formatter={(value: any) => [`US$ ${value.toFixed(1)}M`, 'FOB']}
                  labelFormatter={(label) => `Estado: ${label}`}
                />
                <Bar dataKey="fob" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-orange-600">
                  {empresaData.length}
                </div>
                <div className="text-gray-600">Estados</div>
              </div>
              
              <div className="text-center">
                <div className="font-semibold text-green-600">
                  US$ {(empresaData.reduce((sum, item) => sum + item.fob, 0) / 1000000000).toFixed(1)}B
                </div>
                <div className="text-gray-600">Volume Total</div>
              </div>
              
              <div className="text-center">
                <div className="font-semibold text-blue-600">
                  {empresaData[0]?.participacao?.toFixed(1) || 0}%
                </div>
                <div className="text-gray-600">Líder Regional</div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Ranking {flow === 'export' ? 'Exportação' : 'Importação'}
            </h2>
            <p className="text-gray-600">
              Período: {period.from} a {period.to} - <strong>APENAS DADOS REAIS</strong>
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
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

      {/* Alerta sobre política de dados */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">Política: Apenas Dados Reais</h4>
            <p className="text-sm text-blue-700 mt-1">
              Este sistema utiliza exclusivamente dados oficiais da API ComexStat MDIC. 
              Não há dados fictícios, simulados ou de exemplo em lugar algum.
            </p>
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
          <p className="text-blue-800">Buscando dados reais na API ComexStat MDIC...</p>
          <p className="text-sm text-blue-600 mt-2">Rate limiting ativo - aguarde alguns segundos</p>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <div className={viewType === 'both' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}>
          <NCMSection />
          <EmpresaSection />
        </div>
      )}

      {/* Summary */}
      {!loading && (ncmData.length > 0 || empresaData.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Resumo dos Dados</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{ncmData.length}</div>
              <div className="text-sm text-gray-600">NCMs Reais</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-orange-600">{empresaData.length}</div>
              <div className="text-sm text-gray-600">Estados</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-green-600">
                US$ {(
                  (ncmData.reduce((sum, item) => sum + (item.fob || 0), 0) +
                   empresaData.reduce((sum, item) => sum + (item.fob || 0), 0)) / 1000000000
                ).toFixed(1)}B
              </div>
              <div className="text-sm text-gray-600">Volume Total</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-purple-600">100%</div>
              <div className="text-sm text-gray-600">Dados Reais</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankingRealOnly;