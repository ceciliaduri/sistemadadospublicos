// components/DebugInline.tsx - Debug Inline para o Dashboard
'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Bug, Zap, Search } from 'lucide-react';

interface DebugInlineProps {
  data: any[];
  connected: boolean;
  error: string;
  rawDataInfo: string;
  cacheSize: number;
  onTestAPI: () => void;
  onClearCache: () => void;
}

export const DebugInline: React.FC<DebugInlineProps> = ({
  data,
  connected,
  error,
  rawDataInfo,
  cacheSize,
  onTestAPI,
  onClearCache
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isExpanded) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center space-x-2">
            <Bug className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Debug Info</span>
            <span className="text-xs bg-gray-200 px-2 py-1 rounded">
              {connected ? '✅' : '❌'} {data.length} períodos
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bug className="h-4 w-4 text-gray-700" />
          <span className="font-medium text-gray-900">Debug Information</span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 hover:bg-gray-200 rounded"
        >
          <ChevronUp className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white p-3 rounded border">
          <div className="text-xs text-gray-500 mb-1">Conexão API</div>
          <div className={`text-sm font-medium ${connected ? 'text-green-600' : 'text-red-600'}`}>
            {connected ? '✅ Conectada' : '❌ Desconectada'}
          </div>
        </div>

        <div className="bg-white p-3 rounded border">
          <div className="text-xs text-gray-500 mb-1">Períodos</div>
          <div className="text-sm font-medium text-gray-900">
            {data.length} encontrados
          </div>
        </div>

        <div className="bg-white p-3 rounded border">
          <div className="text-xs text-gray-500 mb-1">Cache</div>
          <div className="text-sm font-medium text-gray-900">
            {cacheSize} entradas
          </div>
        </div>

        <div className="bg-white p-3 rounded border">
          <div className="text-xs text-gray-500 mb-1">Erro</div>
          <div className="text-sm font-medium text-gray-900">
            {error ? '❌ Sim' : '✅ Nenhum'}
          </div>
        </div>
      </div>

      {/* Raw Data Info */}
      {rawDataInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <div className="text-xs text-blue-600 mb-1">Informação dos Dados</div>
          <div className="text-sm text-blue-800">{rawDataInfo}</div>
        </div>
      )}

      {/* Error Details */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <div className="text-xs text-red-600 mb-1">Último Erro</div>
          <div className="text-sm text-red-800 font-mono">{error}</div>
        </div>
      )}

      {/* Data Preview */}
      {data.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
          <div className="text-xs text-green-600 mb-2">Dados Processados (primeiros 3)</div>
          <pre className="text-xs text-green-800 overflow-auto max-h-32">
            {JSON.stringify(data.slice(0, 3), null, 2)}
          </pre>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            console.log('🔍 === DEBUG MANUAL ATIVADO ===');
            console.log('Dados:', data);
            console.log('Conectado:', connected);
            console.log('Erro:', error);
            console.log('Raw Info:', rawDataInfo);
            console.log('Cache Size:', cacheSize);
          }}
          className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
        >
          <Search className="h-3 w-3" />
          <span>Log Console</span>
        </button>

        <button
          onClick={onTestAPI}
          className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
        >
          <Zap className="h-3 w-3" />
          <span>Testar API</span>
        </button>

        <button
          onClick={onClearCache}
          className="flex items-center space-x-1 px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200"
        >
          <span>Limpar Cache</span>
        </button>

        <button
          onClick={() => {
            const debugData = {
              timestamp: new Date().toISOString(),
              status: {
                connected,
                dataLength: data.length,
                error,
                rawDataInfo,
                cacheSize
              },
              data: data.slice(0, 5) // Apenas primeiros 5 para não sobrecarregar
            };

            const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `debug-${new Date().toISOString().slice(0, 19)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
        >
          Exportar Debug
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-500 bg-white border rounded p-2">
        <strong>Instruções de Debug:</strong>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Se "Períodos = 0": A API está retornando dados mas o processamento falhou</li>
          <li>Se "Desconectada": Problema na requisição HTTP ou endpoint</li>
          <li>Use "Log Console" e abra F12 para ver detalhes técnicos</li>
          <li>Use "Testar API" para fazer uma requisição de teste direta</li>
        </ul>
      </div>
    </div>
  );
};

export default DebugInline;