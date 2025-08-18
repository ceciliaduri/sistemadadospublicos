// components/DashboardExpandidoUpdated.tsx - Interface limpa sem API Explorer
'use client';

import React, { useState } from 'react';
import { TrendingUp, Calendar, BarChart3, Building2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// ✅ COMPONENTES DINÂMICOS
const DashboardWithMonthlyFilters = dynamic(() => import('./DashboardWithMonthlyFilters'), { ssr: false });
const NCMRankingEnhanced = dynamic(() => import('./NCMRankingEnhanced'), { ssr: false });
const RankingRealOnly = dynamic(() => import('./RankingRealOnly'), { ssr: false });

interface Tab {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
}

const DashboardExpandidoUpdated: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // ✅ TABS ENTERPRISE
  const tabs: Tab[] = [
    {
      id: 'overview',
      name: 'Dashboard',
      icon: TrendingUp,
      description: 'Executive overview and key metrics'
    },
    {
      id: 'ncm',
      name: 'Product Analysis',
      icon: BarChart3,
      description: 'Product classification performance'
    },
    {
      id: 'empresas',
      name: 'Regional Analysis',
      icon: Building2,
      description: 'Geographic performance insights'
    }
  ];

  // ✅ FILTROS UNIFICADOS
  const [filters] = useState({
    flow: 'export' as 'export' | 'import',
    period: { from: '2023-01', to: '2023-12' }
  });

  // ✅ RENDERIZAR CONTEÚDO BASEADO NA TAB
  const renderContent = () => {
    switch (activeTab) {
      case 'ncm':
        return (
          <div className="space-y-6">
            {/* ✅ NOVO COMPONENTE NCM COM FILTROS E NOMES REAIS */}
            <NCMRankingEnhanced />
          </div>
        );
      
      case 'empresas':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Regional Performance Analysis - {filters.flow === 'export' ? 'Exports' : 'Imports'}
              </h2>
              <p className="text-gray-600 mb-4">
                Trade volume analysis by geographic regions
              </p>
            </div>

            {/* ✅ COMPONENTE EMPRESAS/ESTADOS */}
            <RankingRealOnly 
              flow={filters.flow} 
              period={filters.period}
              viewType="empresa"
            />
          </div>
        );
      
      default:
        return <DashboardWithMonthlyFilters />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Enterprise */}
      <div className="bg-white shadow-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Trade Analytics Enterprise</h1>
                <p className="text-sm text-gray-500">Advanced Commerce Intelligence Platform</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Carlos Leal</p>
                <p className="text-xs text-gray-500">Staff Engineer</p>
              </div>
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">CL</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação Tabs */}
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

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default DashboardExpandidoUpdated;