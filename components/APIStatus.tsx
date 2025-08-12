// components/APIStatus.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { comexstatService } from '../services/comexstatService';

interface APIStatusProps {
  onStatusChange?: (isHealthy: boolean) => void;
}

export const APIStatus: React.FC<APIStatusProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<{
    healthy: boolean;
    message: string;
    lastCheck: string;
    loading: boolean;
  }>({
    healthy: false,
    message: 'Verificando...',
    lastCheck: '',
    loading: true
  });

  const checkAPIHealth = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const healthResult = await comexstatService.healthCheck();
      const now = new Date().toLocaleTimeString('pt-BR');
      
      setStatus({
        healthy: healthResult.status,
        message: healthResult.message,
        lastCheck: now,
        loading: false
      });

      onStatusChange?.(healthResult.status);
    } catch (error) {
      setStatus({
        healthy: false,
        message: 'Erro na verificação',
        lastCheck: new Date().toLocaleTimeString('pt-BR'),
        loading: false
      });

      onStatusChange?.(false);
    }
  };

  useEffect(() => {
    checkAPIHealth();
    // Verificar a cada 5 minutos
    const interval = setInterval(checkAPIHealth, 300000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    if (status.loading) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
    }
    
    if (status.healthy) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = () => {
    if (status.loading) return 'border-blue-200 bg-blue-50';
    if (status.healthy) return 'border-green-200 bg-green-50';
    return 'border-red-200 bg-red-50';
  };

  return (
    <div className={`border rounded-lg p-3 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <div>
            <span className="text-sm font-medium">
              API ComexStat: {status.healthy ? 'Online' : 'Offline'}
            </span>
            <p className="text-xs text-gray-600">{status.message}</p>
          </div>
        </div>
        
        <div className="text-right">
          <button
            onClick={checkAPIHealth}
            disabled={status.loading}
            className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
          >
            Verificar
          </button>
          {status.lastCheck && (
            <p className="text-xs text-gray-500 mt-1">
              Última verificação: {status.lastCheck}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// components/APITestPanel.tsx - Para testar diferentes endpoints
export const APITestPanel: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});

  const testEndpoints = async () => {
    setTesting(true);
    setResults({});

    const tests = [
      {
        name: 'Anos Disponíveis',
        test: () => comexstatService.getAvailableYears()
      },
      {
        name: 'Última Atualização', 
        test: () => comexstatService.getLastUpdate()
      },
      {
        name: 'Filtros Disponíveis',
        test: () => comexstatService.getAvailableFilters()
      },
      {
        name: 'Métricas Disponíveis',
        test: () => comexstatService.getAvailableMetrics()
      },
      {
        name: 'Estados',
        test: () => comexstatService.getStates()
      }
    ];

    for (const test of tests) {
      try {
        console.log(`🧪 Testando: ${test.name}`);
        const result = await test.test();
        setResults(prev => ({
          ...prev,
          [test.name]: { success: true, data: result }
        }));
      } catch (error: any) {
        setResults(prev => ({
          ...prev,
          [test.name]: { success: false, error: error.message }
        }));
      }
    }

    setTesting(false);
  };

  return (
    <div className="bg-white border rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Teste de Conectividade API</h3>
        <button
          onClick={testEndpoints}
          disabled={testing}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          {testing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Testando...
            </>
          ) : (
            'Executar Testes'
          )}
        </button>
      </div>

      {Object.keys(results).length > 0 && (
        <div className="space-y-2">
          {Object.entries(results).map(([testName, result]) => (
            <div key={testName} className="flex items-center justify-between p-2 border rounded">
              <span className="font-medium">{testName}</span>
              <div className="flex items-center">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mr-2" />
                )}
                <span className="text-sm">
                  {result.success ? 'Sucesso' : 'Erro'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
        <p><strong>Informações:</strong></p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>Todos os dados são obtidos da API oficial do ComexStat</li>
          <li>Nenhum dado simulado ou mockado é utilizado</li>
          <li>Conexão direta com https://api-comexstat.mdic.gov.br</li>
          <li>Cache de 30 minutos para otimizar performance</li>
        </ul>
      </div>
    </div>
  );
};