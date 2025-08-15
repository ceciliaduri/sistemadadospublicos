// components/CompanyRankingFixed.tsx - Ranking de Empresas Corrigido
'use client';

import React, { useState, useEffect } from 'react';
import { Building, TrendingUp, DollarSign, MapPin, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { comexstatServiceFixed } from '../services/comexstatServiceFixed';

interface CompanyData {
  cnpj: string;
  razaoSocial: string;
  fob: number;
  kg: number;
  participacao: number;
  uf?: string;
  setor?: string;
  isExample?: boolean;
}

interface CompanyRankingProps {
  flow: 'export' | 'import';
  period: { from: string; to: string };
}

export const CompanyRankingFixed: React.FC<CompanyRankingProps> = ({ flow, period }) => {
  const [data, setData] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [limit, setLimit] = useState(20);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchCompanyData = async () => {
    setLoading(true);
    setError('');
    setUsingFallback(false);

    try {
      console.log('🔄 Iniciando busca de dados de empresas...');
      const result = await comexstatServiceFixed.getEmpresaRanking(flow, period, limit);
      
      if (result && result.length > 0) {
        setData(result);
        setUsingFallback(result[0]?.isExample || false);
        console.log(`✅ ${result.length} empresas carregadas`);
      } else {
        console.log('⚠️ Nenhum dado de empresa retornado');
        setData([]);
        setError('Nenhum dado de empresa disponível para o período selecionado');
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar dados de empresas:', error);
      setError(error.message);
      setData([]);
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, [flow, period.from, period.to, limit]);

  // ✅ CÁLCULOS PARA MÉTRICAS
  const totalFOB = data.reduce((sum, item) => sum + item.fob, 0);
  const totalKG = data.reduce((sum, item) => sum + item.kg, 0);
  const topCompany = data[0];

  // ✅ AGRUPAMENTO POR SETOR (QUANDO DISPONÍVEL)
  const sectorData = data.reduce((acc, company) => {
    const sector = company.setor || 'Outros';
    if (!acc[sector]) {
      acc[sector] = { count: 0, fob: 0 };
    }
    acc[sector].count++;
    acc[sector].fob += company.fob;
    return acc;
  }, {} as Record<string, { count: number; fob: number }>);

  const topSectors = Object.entries(sectorData)
    .sort((a, b) => b[1].fob - a[1].fob)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Empresas - {flow === 'export' ? 'Exportação' : 'Importação'}
            </h2>
            <p className="text-gray-600">Ranking das empresas por valor negociado</p>
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
              onClick={fetchCompanyData}
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
        </div>
      </div>

      {/* Status Messages */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Dados de empresas não disponíveis</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <div className="mt-3 text-sm text-red-700">
                <p className="font-medium">Possíveis motivos:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Dados empresariais podem não estar disponíveis para o período selecionado</li>
                  <li>A API pode requerer permissões especiais para dados empresariais</li>
                  <li>O parâmetro 'details' para empresas pode ter mudado</li>
                  <li>Rate limiting da API pode estar bloqueando as requisições</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {usingFallback && data.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
            <div>
              <p className="text-blue-800 font-medium">Dados de exemplo</p>
              <p className="text-blue-700 text-sm mt-1">
                Exibindo principais empresas {flow === 'export' ? 'exportadoras' : 'importadoras'} 
                baseadas em dados históricos oficiais. Estes são dados realistas para demonstração.
              </p>
            </div>
          </div>
        </div>
      )}

      {!error && !usingFallback && data.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <RefreshCw className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
            <div>
              <p className="text-green-800 font-medium">Dados da API ComexStat</p>
              <p className="text-green-700 text-sm mt-1">
                Dados obtidos diretamente da API oficial do MDIC.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando dados de empresas...</p>
            <p className="text-sm text-gray-500 mt-2">
              Aguardando resposta da API ComexStat
            </p>
          </div>
        </div>
      )}

      {/* Métricas - Apenas se houver dados */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-purple-600 bg-purple-100 rounded-lg p-1.5" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Empresas</p>
                <p className="text-2xl font-bold text-gray-900">{data.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600 bg-green-100 rounded-lg p-1.5" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Top Empresa</p>
                <p className="text-lg font-bold text-gray-900">
                  {topCompany ? `US$ ${(topCompany.fob / 1000000000).toFixed(1)} bi` : '-'}
                </p>
                <p className="text-xs text-gray-500">
                  {topCompany?.razaoSocial.substring(0, 20)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600 bg-blue-100 rounded-lg p-1.5" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total FOB</p>
                <p className="text-lg font-bold text-gray-900">
                  US$ {(totalFOB / 1000000000).toFixed(0)} bi
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Setores - Apenas se houver dados com setor */}
      {!loading && data.length > 0 && topSectors.length > 0 && data.some(d => d.setor) && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Setores por Volume
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topSectors.map(([sector, data]) => (
              <div key={sector} className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900">{sector}</h4>
                <p className="text-sm text-gray-600">{data.count} empresas</p>
                <p className="text-lg font-semibold text-blue-600">
                  US$ {(data.fob / 1000000000).toFixed(1)} bi
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela de Empresas */}
      {!loading && data.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ranking de Empresas
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Rank</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Empresa</th>
                  {data.some(d => d.setor) && (
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Setor</th>
                  )}
                  <th className="text-right py-3 px-4 font-medium text-gray-600">FOB (USD)</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Peso (KG)</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Part. %</th>
                </tr>
              </thead>
              <tbody>
                {data.map((company, index) => (
                  <tr key={company.cnpj} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {company.razaoSocial}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          CNPJ: {company.cnpj}
                        </p>
                        {company.uf && (
                          <p className="text-xs text-gray-500 flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {company.uf}
                          </p>
                        )}
                      </div>
                    </td>
                    {data.some(d => d.setor) && (
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {company.setor || '-'}
                      </td>
                    )}
                    <td className="py-3 px-4 text-sm text-right text-gray-900">
                      {company.fob.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">
                      {company.kg.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">
                      {company.participacao.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && data.length === 0 && error && (
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center">
            <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Dados de empresas não disponíveis</p>
            <p className="text-sm text-gray-500 mb-6">
              A API ComexStat pode não fornecer dados empresariais para o período selecionado
              ou pode requerer permissões especiais.
            </p>
            <button
              onClick={fetchCompanyData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyRankingFixed;