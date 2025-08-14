// components/CompanyRanking.tsx - Ranking das empresas que mais importam/exportam
'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Building, TrendingUp, Users, RefreshCw, Download, Search, ExternalLink } from 'lucide-react';

const API_BASE = 'https://api-comexstat.mdic.gov.br';

interface CompanyData {
  cnpj: string;
  razaoSocial: string;
  fob: number;
  kg: number;
  percentage: number;
  cidade?: string;
  uf?: string;
}

interface CompanyRankingProps {
  flow: 'export' | 'import';
  period: { from: string; to: string };
}

export const CompanyRanking: React.FC<CompanyRankingProps> = ({ flow, period }) => {
  const [data, setData] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);

  const fetchCompanyData = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🏢 Buscando dados de empresas...');
      
      // ✅ TENTAR DIFERENTES ESTRUTURAS DE DETAILS PARA EMPRESAS
      const possibleDetails = ['empresa', 'importador', 'exportador', 'cnpj', 'operador'];
      
      for (const detail of possibleDetails) {
        try {
          const payload = {
            flow,
            monthDetail: false,
            period,
            details: [detail],
            metrics: ['metricFOB', 'metricKG']
          };

          console.log(`🧪 Testando detail para empresas: ${detail}`, payload);

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
              const processedData = processCompanyData(result.data.list);
              if (processedData.length > 0) {
                setData(processedData);
                console.log(`🎯 Dados de empresas processados com sucesso usando '${detail}':`, processedData.slice(0, 3));
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
      throw new Error('Nenhum parâmetro de detail funcionou para empresas. Os dados podem não estar disponíveis ou requerer permissões especiais.');

    } catch (error: any) {
      console.error('❌ Erro ao buscar dados de empresas:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const processCompanyData = (rawData: any[]): CompanyData[] => {
    console.log('🔄 Processando dados de empresas...', rawData.slice(0, 3));

    const companyMap: { [key: string]: { 
      fob: number; 
      kg: number; 
      razaoSocial: string; 
      cidade?: string; 
      uf?: string; 
    } } = {};
    let totalFOB = 0;

    rawData.forEach((item, index) => {
      // ✅ BUSCAR CNPJ EM DIFERENTES CAMPOS
      let cnpj = '';
      const cnpjFields = ['cnpj', 'coCnpj', 'CO_CNPJ', 'doc', 'documento', 'cpf_cnpj'];
      
      for (const field of cnpjFields) {
        if (item[field]) {
          cnpj = item[field].toString().replace(/\D/g, ''); // Remove caracteres não numéricos
          if (cnpj.length >= 11) { // CNPJ tem 14 dígitos, CPF tem 11
            break;
          }
        }
      }

      // ✅ BUSCAR RAZÃO SOCIAL EM DIFERENTES CAMPOS
      let razaoSocial = '';
      const razaoFields = [
        'razaoSocial', 'noEmpresa', 'empresa', 'nome', 'nomeEmpresa',
        'razao_social', 'company_name', 'importador', 'exportador'
      ];
      
      for (const field of razaoFields) {
        if (item[field]) {
          razaoSocial = item[field].toString();
          break;
        }
      }

      // ✅ BUSCAR LOCALIZAÇÃO
      const cidade = item.cidade || item.city || item.municipio || '';
      const uf = item.uf || item.estado || item.state || '';

      // ✅ BUSCAR VALORES FOB E KG
      const fob = parseFloat(item.metricFOB || item.vlFob || item.fob || 0);
      const kg = parseFloat(item.metricKG || item.kgLiq || item.kg || 0);

      if (cnpj && fob > 0) {
        if (!companyMap[cnpj]) {
          companyMap[cnpj] = { 
            fob: 0, 
            kg: 0, 
            razaoSocial: razaoSocial || `Empresa ${cnpj}`,
            cidade,
            uf
          };
        }
        companyMap[cnpj].fob += fob;
        companyMap[cnpj].kg += kg;
        totalFOB += fob;
      }

      if (index < 3) {
        console.log(`📋 Item ${index + 1}: cnpj=${cnpj}, razao=${razaoSocial}, fob=${fob}, kg=${kg}`);
      }
    });

    // Converter para array e calcular percentuais
    const companyArray = Object.entries(companyMap)
      .map(([cnpj, data]) => ({
        cnpj,
        razaoSocial: data.razaoSocial,
        fob: data.fob,
        kg: data.kg,
        percentage: totalFOB > 0 ? (data.fob / totalFOB) * 100 : 0,
        cidade: data.cidade,
        uf: data.uf
      }))
      .sort((a, b) => b.fob - a.fob)
      .slice(0, 50); // Top 50 empresas

    console.log(`🎯 Empresas processadas: ${companyArray.length} itens`, companyArray.slice(0, 5));
    return companyArray;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value);
  };

  const formatCNPJ = (cnpj: string): string => {
    if (cnpj.length === 14) {
      return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };

  const filteredData = data.filter(company =>
    company.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.cnpj.includes(searchTerm.replace(/\D/g, ''))
  );

  const exportData = () => {
    const exportContent = {
      flow,
      period,
      timestamp: new Date().toISOString(),
      data: filteredData.map(item => ({
        cnpj: formatCNPJ(item.cnpj),
        razao_social: item.razaoSocial,
        fob_usd: item.fob,
        peso_kg: item.kg,
        percentual: item.percentage.toFixed(2) + '%',
        cidade: item.cidade || '',
        uf: item.uf || ''
      }))
    };

    const blob = new Blob([JSON.stringify(exportContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `empresas-ranking-${flow}-${period.from}-${period.to}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchCompanyData();
  }, [flow, period.from, period.to]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando dados de empresas...</p>
            <p className="text-xs text-gray-500 mt-2">Testando diferentes parâmetros da API...</p>
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
          <Building className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Empresas - {flow === 'export' ? 'Exportação' : 'Importação'}
            </h3>
            <p className="text-sm text-gray-600">
              Ranking das empresas por valor negociado
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchCompanyData}
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
          <div className="mt-2 text-xs text-red-600">
            <p><strong>Possíveis motivos:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Dados de empresas podem não estar disponíveis para o período selecionado</li>
              <li>A API pode requerer permissões especiais para dados empresariais</li>
              <li>O parâmetro 'details' para empresas pode ter mudado</li>
            </ul>
          </div>
          <button
            onClick={fetchCompanyData}
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
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <Building className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-green-600">Total Empresas</p>
                  <p className="text-lg font-semibold text-green-900">{data.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-blue-600">Maior Volume</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {formatCurrency(data[0]?.fob || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-purple-600">Volume Total</p>
                  <p className="text-lg font-semibold text-purple-900">
                    {formatCurrency(data.reduce((sum, item) => sum + item.fob, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por empresa ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="text-sm text-gray-500">
              {filteredData.length} de {data.length} empresas
            </div>
          </div>

          {/* Chart */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Top 15 Empresas por Valor FOB</h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={filteredData.slice(0, 15)} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={formatCurrency} />
                <YAxis 
                  type="category" 
                  dataKey="razaoSocial" 
                  width={200}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + '...' : value}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'FOB']}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar dataKey="fob" fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Detalhamento por Empresa</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CNPJ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Razão Social
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Localização
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor FOB
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % Total
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.slice(0, 30).map((company, index) => (
                    <tr key={company.cnpj} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {formatCNPJ(company.cnpj)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate" title={company.razaoSocial}>
                          {company.razaoSocial}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {company.cidade && company.uf ? `${company.cidade}/${company.uf}` : 
                         company.uf || company.cidade || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(company.fob)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {company.percentage.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => window.open(`https://www.cnpj.ws/${company.cnpj.replace(/\D/g, '')}`, '_blank')}
                          className="text-green-600 hover:text-green-900"
                          title="Ver detalhes da empresa"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
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
          <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado de empresa encontrado</h3>
          <p className="text-gray-600 mb-4">
            Os dados de empresas podem não estar disponíveis para o período selecionado ou podem requerer permissões especiais.
          </p>
          <button
            onClick={fetchCompanyData}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );
};

export default CompanyRanking;