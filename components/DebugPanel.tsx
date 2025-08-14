// components/DebugPanel.tsx - Debug Avançado da API ComexStat
'use client';

import React, { useState } from 'react';
import { Search, Download, Eye, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { comexstatService } from '../services/comexstatService';

interface DebugResult {
  endpoint: string;
  success: boolean;
  data?: any;
  error?: string;
  responseTime?: number;
  dataStructure?: string;
}

export const DebugPanel: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<DebugResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<DebugResult | null>(null);

  // ✅ TESTE COMPLETO DA API
  const runFullAPITest = async () => {
    setTesting(true);
    setResults([]);

    const tests = [
      {
        name: 'Health Check',
        test: async (): Promise<DebugResult> => {
          const start = Date.now();
          try {
            const result = await comexstatService.healthCheck();
            return {
              endpoint: 'Health Check',
              success: result.status,
              data: result,
              responseTime: Date.now() - start,
              dataStructure: typeof result.data
            };
          } catch (error: any) {
            return {
              endpoint: 'Health Check',
              success: false,
              error: error.message,
              responseTime: Date.now() - start
            };
          }
        }
      },
      {
        name: 'Anos Disponíveis',
        test: async (): Promise<DebugResult> => {
          const start = Date.now();
          try {
            const result = await comexstatService.getAvailableYears();
            return {
              endpoint: '/general/dates/years',
              success: !!result,
              data: result,
              responseTime: Date.now() - start,
              dataStructure: analyzeStructure(result)
            };
          } catch (error: any) {
            return {
              endpoint: '/general/dates/years',
              success: false,
              error: error.message,
              responseTime: Date.now() - start
            };
          }
        }
      },
      {
        name: 'Teste Período Único (2022-01)',
        test: async (): Promise<DebugResult> => {
          const start = Date.now();
          try {
            const result = await comexstatService.getGeneralData({
              flow: 'export',
              monthDetail: true,
              period: { from: '2022-01', to: '2022-01' },
              metrics: ['metricFOB', 'metricKG']
            });
            
            return {
              endpoint: '/general (single month)',
              success: result.success,
              data: result.data,
              responseTime: Date.now() - start,
              dataStructure: analyzeStructure(result.data)
            };
          } catch (error: any) {
            return {
              endpoint: '/general (single month)',
              success: false,
              error: error.message,
              responseTime: Date.now() - start
            };
          }
        }
      },
      {
        name: 'Teste Multi-Período (2022-01 a 2022-03)',
        test: async (): Promise<DebugResult> => {
          const start = Date.now();
          try {
            const result = await comexstatService.getGeneralData({
              flow: 'export',
              monthDetail: true,
              period: { from: '2022-01', to: '2022-03' },
              metrics: ['metricFOB', 'metricKG']
            });
            
            return {
              endpoint: '/general (multi month)',
              success: result.success,
              data: result.data,
              responseTime: Date.now() - start,
              dataStructure: analyzeStructure(result.data)
            };
          } catch (error: any) {
            return {
              endpoint: '/general (multi month)',
              success: false,
              error: error.message,
              responseTime: Date.now() - start
            };
          }
        }
      },
      {
        name: 'Teste Ano Completo (2022)',
        test: async (): Promise<DebugResult> => {
          const start = Date.now();
          try {
            const result = await comexstatService.getGeneralData({
              flow: 'export',
              monthDetail: true,
              period: { from: '2022-01', to: '2022-12' },
              metrics: ['metricFOB', 'metricKG']
            });
            
            return {
              endpoint: '/general (full year)',
              success: result.success,
              data: result.data,
              responseTime: Date.now() - start,
              dataStructure: analyzeStructure(result.data)
            };
          } catch (error: any) {
            return {
              endpoint: '/general (full year)',
              success: false,
              error: error.message,
              responseTime: Date.now() - start
            };
          }
        }
      },
      {
        name: 'Filtros Disponíveis',
        test: async (): Promise<DebugResult> => {
          const start = Date.now();
          try {
            const result = await comexstatService.getAvailableFilters();
            return {
              endpoint: '/general/filters',
              success: !!result,
              data: result,
              responseTime: Date.now() - start,
              dataStructure: analyzeStructure(result)
            };
          } catch (error: any) {
            return {
              endpoint: '/general/filters',
              success: false,
              error: error.message,
              responseTime: Date.now() - start
            };
          }
        }
      },
      {
        name: 'Métricas Disponíveis',
        test: async (): Promise<DebugResult> => {
          const start = Date.now();
          try {
            const result = await comexstatService.getAvailableMetrics();
            return {
              endpoint: '/general/metrics',
              success: !!result,
              data: result,
              responseTime: Date.now() - start,
              dataStructure: analyzeStructure(result)
            };
          } catch (error: any) {
            return {
              endpoint: '/general/metrics',
              success: false,
              error: error.message,
              responseTime: Date.now() - start
            };
          }
        }
      }
    ];

    for (const test of tests) {
      try {
        console.log(`🧪 Executando: ${test.name}`);
        const result = await test.test();
        setResults(prev => [...prev, result]);
        
        // Delay entre testes para respeitar rate limit
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error: any) {
        console.error(`❌ Erro em ${test.name}:`, error);
        setResults(prev => [...prev, {
          endpoint: test.name,
          success: false,
          error: error.message
        }]);
      }
    }

    setTesting(false);
  };

  // ✅ ANÁLISE ESTRUTURAL DETALHADA
  const analyzeStructure = (data: any): string => {
    if (!data) return 'null/undefined';
    
    if (Array.isArray(data)) {
      return `Array[${data.length}] - ${data.length > 0 ? `Item type: ${typeof data[0]}` : 'empty'}`;
    }
    
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      const arrayKeys = keys.filter(key => Array.isArray(data[key]));
      
      let structure = `Object {${keys.length} keys}`;
      if (arrayKeys.length > 0) {
        structure += ` - Arrays: ${arrayKeys.map(key => `${key}[${data[key].length}]`).join(', ')}`;
      }
      
      return structure;
    }
    
    return typeof data;
  };

  // ✅ EXPORTAR RESULTADOS
  const exportResults = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      tests: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        avgResponseTime: results.filter(r => r.responseTime).reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.filter(r => r.responseTime).length
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comexstat-debug-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="bg-white border rounded-lg p-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Debug Avançado da API ComexStat</h3>
          <p className="text-sm text-gray-600">Análise completa da estrutura e comportamento da API</p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={runFullAPITest}
            disabled={testing}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {testing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Executar Testes Completos
              </>
            )}
          </button>
          
          {results.length > 0 && (
            <button
              onClick={exportResults}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </button>
          )}
        </div>
      </div>

      {/* Progresso */}
      {testing && (
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <RefreshCw className="h-5 w-5 text-blue-600 animate-spin mr-2" />
              <span className="text-blue-800">Executando testes... ({results.length} de 7 concluídos)</span>
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de Testes */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 mb-3">Resultados dos Testes</h4>
            {results.map((result, index) => (
              <div 
                key={index}
                onClick={() => setSelectedResult(result)}
                className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(result.success)}
                  <div>
                    <p className="font-medium text-sm">{result.endpoint}</p>
                    {result.responseTime && (
                      <p className="text-xs text-gray-500">{result.responseTime}ms</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {result.dataStructure && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {result.dataStructure}
                    </span>
                  )}
                  <Eye className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>

          {/* Detalhes do Teste Selecionado */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Detalhes do Teste</h4>
            {selectedResult ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(selectedResult.success)}
                    <span className="font-medium">{selectedResult.endpoint}</span>
                  </div>
                  
                  {selectedResult.responseTime && (
                    <p className="text-sm text-gray-600">
                      Tempo de resposta: {selectedResult.responseTime}ms
                    </p>
                  )}
                  
                  {selectedResult.dataStructure && (
                    <p className="text-sm text-gray-600">
                      Estrutura: {selectedResult.dataStructure}
                    </p>
                  )}
                </div>

                {selectedResult.error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800 text-sm font-medium">Erro:</p>
                    <p className="text-red-700 text-sm">{selectedResult.error}</p>
                  </div>
                )}

                {selectedResult.data && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Dados Retornados:</p>
                    <pre className="bg-white border rounded p-3 text-xs overflow-auto max-h-64">
                      {JSON.stringify(selectedResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-8 text-center text-gray-500">
                <Eye className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Selecione um teste para ver os detalhes</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h5 className="font-medium text-blue-800 mb-1">Como usar este debug:</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Execute os testes para analisar a estrutura real da API</li>
              <li>• Verifique se os dados estão sendo retornados com períodos corretos</li>
              <li>• Identifique quais campos contêm as informações temporais</li>
              <li>• Use os resultados para ajustar o parsing no Dashboard</li>
              <li>• Exporte os resultados para análise offline</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;