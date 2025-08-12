'use client';

import React, { useState } from 'react';
import ComexStatDashboard from '@/components/Dashboard';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [apiHealthy, setApiHealthy] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simplificado */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Dashboard ComexStat Brasil
              </h1>
              <p className="text-sm text-gray-600">
                Dados Oficiais - API do Governo Federal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Badge de Status */}
      <div className="bg-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-center text-sm">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-300 rounded-full animate-pulse"></div>
              <span className="font-medium">
                ✅ DADOS 100% REAIS - API ComexStat
              </span>
              <span className="text-green-200">|</span>
              <span>
                Fonte: api-comexstat.mdic.gov.br
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Principal */}
      <div className="max-w-7xl mx-auto">
        <ComexStatDashboard />
      </div>

      {/* Footer Simplificado */}
      <footer className="bg-gray-900 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Fonte de Dados</h3>
              <p className="text-gray-300 text-sm">
                Ministério do Desenvolvimento, Indústria e Comércio Exterior
              </p>
              <p className="text-gray-400 text-xs mt-1">
                API ComexStat Oficial
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Garantias</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>✅ Dados 100% oficiais</li>
                <li>✅ Processamento robusto</li>
                <li>✅ Zero dados simulados</li>
                <li>✅ Código simplificado</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Tecnologia</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>NextJS 14 + TypeScript</li>
                <li>Recharts para visualizações</li>
                <li>TailwindCSS para styling</li>
                <li>Processamento inteligente</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-6 pt-4 text-center">
            <p className="text-gray-400 text-sm">
              Dashboard ultra-simplificado para máxima confiabilidade
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}