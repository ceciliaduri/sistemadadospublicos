// components/DashboardExpandidoUpdated.tsx - DYNAMIC IMPORTS CORRIGIDOS
'use client';

import React, { useState } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';
import dynamic from 'next/dynamic';

// ✅ DYNAMIC IMPORTS CORRIGIDOS - com default export
const DashboardWithMonthlyFilters = dynamic(() => 
  import('./DashboardWithMonthlyFilters').then(mod => ({ default: mod.DashboardWithMonthlyFilters })), 
  { 
    ssr: false,
    loading: () => <div className="p-8 text-center">Carregando dashboard...</div>
  }
);

const NCMRankingEnhanced = dynamic(() => 
  import('./NCMRankingEnhanced').then(mod => ({ default: mod.NCMRankingEnhanced })), 
  { 
    ssr: false,
    loading: () => <div className="p-8 text-center">Carregando análise NCM...</div>
  }
);

interface Tab {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
}

const DashboardExpandidoUpdated: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // ✅ TABS LIMPAS (apenas 2 abas)
  const tabs: Tab[] = [
    {
      id: 'overview',
      name: 'Dashboard',
      icon: TrendingUp,
      description: 'Visão executiva e métricas principais'
    },
    {
      id: 'ncm',
      name: 'Análise por NCM',
      icon: BarChart3,
      description: 'Análise de performance por classificação de produtos'
    }
  ];

  // ✅ RENDERIZAR CONTEÚDO BASEADO NA TAB
  const renderContent = () => {
    switch (activeTab) {
      case 'ncm':
        return (
          <div className="space-y-6">
            <NCMRankingEnhanced />
          </div>
        );
      
      default: // overview
        return (
          <div className="space-y-6">
            <DashboardWithMonthlyFilters />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Limpo */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">ComexStat Analytics</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Sistema de análise de comércio exterior
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default DashboardExpandidoUpdated;