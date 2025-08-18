// components/DashboardExpandidoUpdated.tsx - ATUALIZAÇÃO para usar RankingRealOnly
'use client';

import React, { useState } from 'react';
import { BarChart3, Package, Building, Database, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import DashboardWithMonthlyFilters from './DashboardWithMonthlyFilters';
import RankingRealOnly from './RankingRealOnly'; // ✅ COMPONENTE EMPRESAS
import NCMRankingFixedVisual from './NCMRankingFixedVisual'; // ✅ COMPONENTE NCM CORRIGIDO
import APIExplorer from './APIExplorer';

type TabType = 'overview' | 'ncm' | 'companies' | 'explorer';

export const DashboardExpandidoUpdated: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [filters, setFilters] = useState({
    flow: 'export' as 'export' | 'import',
    period: { from: '2022-01', to: '2022-12' }
  });

  const tabs = [
    {
      id: 'overview' as TabType,
      name: 'Visão Geral',
      icon: BarChart3,
      description: 'Dashboard principal com filtros mensais/anuais'
    },
    {
      id: 'ncm' as TabType,
      name: 'NCM',
      icon: Package,
      description: 'Ranking dos produtos mais negociados'
    },
    {
      id: 'companies' as TabType,
      name: 'Estados/Regiões',
      icon: Building,
      description: 'Ranking por estado'
    },
    {
      id: 'explorer' as TabType,
      name: 'Explorador API',
      icon: Database,
      description: 'Descobrir dados disponíveis'
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardWithMonthlyFilters />;
      
      case 'ncm':
        return (
          <div className="space-y-6">
            {/* ✅ COMPONENTE NCM TOTALMENTE CORRIGIDO */}
            <NCMRankingFixedVisual />
          </div>
        );
      
      case 'companies':
        return (
          <div className="space-y-6">
            {/* Header Estados */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Ranking por Estados</h2>
                  <p className="text-gray-600">Dados agregados por UF</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <select
                    value={filters.flow}
                    onChange={(e) => setFilters(prev => ({ ...prev, flow: e.target.value as 'export' | 'import' }))}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="export">Exportação</option>
                    <option value="import">Importação</option>
                  </select>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">⚠️ Dados Empresariais</p>
                    <p className="text-xs text-yellow-700">
                      API pública não fornece dados por CNPJ. Disponível: agregação por estado.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ COMPONENTE EMPRESAS/ESTADOS */}
            <RankingRealOnly 
              flow={filters.flow} 
              period={filters.period}
              viewType="empresa"
            />
          </div>
        );
      
      case 'explorer':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900">Explorador da API ComexStat</h2>
              <p className="text-gray-600 mb-4">
                Descobrir quais dados estão disponíveis na API oficial
              </p>
            </div>

            <APIExplorer />
          </div>
        );
      
      default:
        return <DashboardWithMonthlyFilters />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">ComexStat Analytics Pro</h1>
                <p className="text-sm text-gray-600">Sistema Completo de Análise de Comércio Exterior</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Dados oficiais MDIC</span>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Sistema Ativo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                >
                  <Icon
                    className={`${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    } -ml-0.5 mr-2 h-5 w-5 transition-colors duration-200`}
                  />
                  <span>{tab.name}</span>
                  {isActive && (
                    <div className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Ativo
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <p>✅ Sistema atualizado: ZERO mock data - apenas dados reais API ComexStat MDIC</p>
              <p className="mt-1">
                🔧 NCM: 100% real | Empresas: Estados reais (CNPJ não disponível na API pública)
              </p>
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <span>ComexStat Analytics v3.1</span>
              <span>•</span>
              <span>Duri Trading</span>
              <span>•</span>
              <span>API MDIC Oficial</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardExpandidoUpdated;