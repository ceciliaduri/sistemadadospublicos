// components/APIExplorer.tsx - Explorar dados disponíveis na API ComexStat
'use client';

import React, { useState } from 'react';
import { Search, Download, ChevronDown, ChevronRight, Database, Building, Package } from 'lucide-react';

const API_BASE = 'https://api-comexstat.mdic.gov.br';

interface ExplorerResult {
  endpoint: string;
  success: boolean;
  data?: any;
  error?: string;
}

export const APIExplorer: React.FC = () => {
  const [exploring, setExploring] = useState(false);
  const [results, setResults] = useState<ExplorerResult[]>([]);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  const exploreAPI = async () => {
    setExploring(true);
    setResults([]);

    const explorations = [
      {
        name: 'Filtros Disponíveis',
        endpoint: '/general/filters',
        test: async () => {
          const response = await fetch(`${API_BASE}/general/filters?language=pt`);
          return response.ok ? await response.json() : null;
        }
      },
      {
        name: 'Detalhes Disponíveis',
        endpoint: '/general/details',
        test: async () => {
          const response = await fetch(`${API_BASE}/general/details?language=pt`);
          return response.ok ? await response.json() : null;
        }
      },
      {
        name: 'Métricas Disponíveis',
        endpoint: '/general/metrics',
        test: async () => {
          const response = await fetch(`${API_BASE}/general/metrics?language=pt`);
          return response.ok ? await response.json() : null;
        }
      },
      {
        name: 'Teste com Details NCM',
        endpoint: '/general (com details)',
        test: async () => {
          const payload = {
            flow: 'export',
            monthDetail: false,
            period: { from: '2023-01', to: '2023-03' },
            details: ['ncm'], // Tentar NCM
            metrics: ['metricFOB', 'metricKG']
          };
          
          const response = await fetch(`${API_BASE}/general?language=pt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          return response.ok ? await response.json() : null;
        }
      },
      {
        name: 'Teste com Details Empresa',
        endpoint: '/general (com empresa)',
        test: async () => {
          const payload = {
            flow: 'export',
            monthDetail: false,
            period: { from: '2023-01', to: '2023-03' },
            details: ['empresa'], // Tentar empresa
            metrics: ['metricFOB', 'metricKG']
          };
          
          const response = await fetch(`${API_BASE}/general?language=pt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          return response.ok ? await response.json() : null;
        }
      },
      {
        name: 'Teste com Details Múltiplos',
        endpoint: '/general (details múltiplos)',
        test: async () => {
          const payload = {
            flow: 'export',
            monthDetail: false,
            period: { from: '2023-01', to: '2023-03' },
            details: ['ncm', 'empresa', 'pais', 'uf'], // Tentar múltiplos
            metrics: ['metricFOB', 'metricKG']
          };
          
          const response = await fetch(`${API_BASE}/general?language=pt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          return response.ok ? await response.json() : null;
        }
      }
    ];

    for (const exploration of explorations) {
      try {
        console.log(`🔍 Explorando: ${exploration.name}`);
        const result = await exploration.test();
        
        setResults(prev => [...prev, {
          endpoint: exploration.endpoint,
          success: !!result,
          data: result
        }]);

        // Delay entre requisições
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error: any) {
        console.error(`❌ Erro em ${exploration.name}:`, error);
        setResults(prev => [...prev, {
          endpoint: exploration.endpoint,
          success: false,
          error: error.message
        }]);
      }
    }

    setExploring(false);
  };

  const analyzeData = (data: any) => {
    if (!data) return "Sem dados";
    
    if (Array.isArray(data)) {
      return `Array[${data.length}]`;
    }
    
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      
      // Procurar por arrays aninhados
      const arrays = keys.filter(key => Array.isArray(data[key]));
      const objects = keys.filter(key => typeof data[key] === 'object' && !Array.isArray(data[key]));
      
      let analysis = `Object {${keys.length} keys}`;
      if (arrays.length > 0) {
        analysis += ` | Arrays: ${arrays.map(key => `${key}[${data[key].length}]`).join(', ')}`;
      }
      if (objects.length > 0) {
        analysis += ` | Objects: ${objects.join(', ')}`;
      }
      
      return analysis;
    }
    
    return typeof data;
  };

  const findRelevantData = (data: any) => {
    if (!data || typeof data !== 'object') return null;
    
    const relevantFields = [];
    
    // Procurar por dados de NCM
    if (data.data && data.data.list && Array.isArray(data.data.list) && data.data.list.length > 0) {
      const firstItem = data.data.list[0];
      const ncmFields = Object.keys(firstItem).filter(key => 
        key.toLowerCase().includes('ncm') || 
        key.toLowerCase().includes('sh') ||
        key.toLowerCase().includes('codigo')
      );
      
      const empresaFields = Object.keys(firstItem).filter(key =>
        key.toLowerCase().includes('empresa') ||
        key.toLowerCase().includes('cnpj') ||
        key.toLowerCase().includes('razao') ||
        key.toLowerCase().includes('exportador') ||
        key.toLowerCase().includes('importador')
      );
      
      if (ncmFields.length > 0) {
        relevantFields.push(`NCM encontrado: ${ncmFields.join(', ')}`);
      }
      
      if (empresaFields.length > 0) {
        relevantFields.push(`Empresa encontrado: ${empresaFields.join(', ')}`);
      }
      
      // Mostrar todos os campos disponíveis
      relevantFields.push(`Todos os campos: ${Object.keys(firstItem).join(', ')}`);
    }
    
    return relevantFields.length > 0 ? relevantFields : null;
  };

  return (
    <div className="bg-white border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Explorador da API ComexStat</h3>
          <p className="text-sm text-gray-600">Descobrir quais dados estão disponíveis para NCM e Empresas</p>
        </div>
        
        <button
          onClick={exploreAPI}
          disabled={exploring}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
        >
          {exploring ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Explorando...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Explorar API
            </>
          )}
        </button>
      </div>

      {/* Progress */}
      {exploring && (
        <div className="mb-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-purple-800">Explorando endpoints... ({results.length} de 6 concluídos)</p>
            <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(results.length / 6) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Resultados da Exploração</h4>
            <button
              onClick={() => {
                const exportData = {
                  timestamp: new Date().toISOString(),
                  results: results.map(r => ({
                    endpoint: r.endpoint,
                    success: r.success,
                    analysis: analyzeData(r.data),
                    relevantData: findRelevantData(r.data),
                    rawData: r.data
                  }))
                };
                
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `comexstat-exploration-${new Date().toISOString().slice(0, 19)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded flex items-center"
            >
              <Download className="h-3 w-3 mr-1" />
              Exportar
            </button>
          </div>

          {results.map((result, index) => (
            <div key={index} className="border rounded-lg">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedResult(expandedResult === result.endpoint ? null : result.endpoint)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {result.success ? (
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    ) : (
                      <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                    )}
                    <span className="font-medium">{result.endpoint}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {analyzeData(result.data)}
                    </span>
                    {expandedResult === result.endpoint ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {expandedResult === result.endpoint && (
                <div className="border-t bg-gray-50 p-4">
                  {result.success && result.data ? (
                    <div className="space-y-4">
                      {/* Análise de dados relevantes */}
                      {findRelevantData(result.data) && (
                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <h5 className="font-medium text-green-800 mb-2">Dados Relevantes Encontrados:</h5>
                          <ul className="text-sm text-green-700 space-y-1">
                            {findRelevantData(result.data)!.map((item, i) => (
                              <li key={i} className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Raw data */}
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">Dados Brutos:</h5>
                        <pre className="bg-white border rounded p-3 text-xs overflow-auto max-h-64">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-600 text-sm">
                      Erro: {result.error || 'Falha na requisição'}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Database className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h5 className="font-medium text-blue-800 mb-2">Objetivo da Exploração</h5>
            <div className="text-sm text-blue-700 space-y-2">
              <p>🎯 <strong>NCM (Nomenclatura Comum do Mercosul):</strong> Códigos de classificação de produtos</p>
              <p>🏢 <strong>Empresas e CNPJ:</strong> Dados das empresas importadoras/exportadoras</p>
              <p>📊 Esta exploração vai identificar exatamente quais parâmetros usar na API para obter esses dados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIExplorer;