// components/DashboardExpandido.tsx - Dashboard completo com NCM e Empresas
'use client';

import React, { useState } from 'react';
import { BarChart3, Package, Building, Database, TrendingUp, Calendar } from 'lucide-react';
import ComexStatDashboard from './Dashboard';
import NCMRanking from './NCMRanking';
import CompanyRanking from './CompanyRanking';
import APIExplorer from './APIExplorer';

type TabType = 'overview' | 'ncm' | 'companies' | 'explorer';

export const DashboardExpandido: React.FC = () => {
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
      description: 'Dashboard principal com evolução temporal'
    },
    {
      id: 'ncm' as TabType,
      name: 'NCM',
      icon: Package,
      description: 'Ranking dos produtos mais negociados'
    },
    {
      id: 'companies' as TabType,
      name: 'Empresas',
      icon: Building,
      description: 'Ranking das empresas por volume'
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
        return <ComexStatDashboard />;
      
      case 'ncm':
        return (
          <div className="space-y-6">
            {/* Header NCM */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Análise por NCM</h2>
                  <p className="text-gray-600">Nomenclatura Comum do Mercosul - Classificação de produtos</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fluxo</label>
                    <select
                      value={filters.flow}
                      onChange={(e) => setFilters({...filters, flow: e.target.value as 'export' | 'import'})}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="export">Exportação</option>
                      <option value="import">Importação</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                    <div className="flex space-x-2">
                      <input
                        type="month"
                        value={filters.period.from}
                        onChange={(e) => setFilters({...filters, period: {...filters.period, from: e.target.value}})}
                        className="border border-gray-300 rounded-lg px-3 py-2"
                      />
                      <span className="self-end pb-2 text-gray-500">até</span>
                      <input
                        type="month"
                        value={filters.period.to}
                        onChange={(e) => setFilters({...filters, period: {...filters.period, to: e.target.value}})}
                        className="border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <NCMRanking flow={filters.flow} period={filters.period} />
          </div>
        );
      
      case 'companies':
        return (
          <div className="space-y-6">
            {/* Header Empresas */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Análise por Empresas</h2>
                  <p className="text-gray-600">Ranking das empresas por volume de negociação</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fluxo</label>
                    <select
                      value={filters.flow}
                      onChange={(e) => setFilters({...filters, flow: e.target.value as 'export' | 'import'})}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="export">Exportação</option>
                      <option value="import">Importação</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                    <div className="flex space-x-2">
                      <input
                        type="month"
                        value={filters.period.from}
                        onChange={(e) => setFilters({...filters, period: {...filters.period, from: e.target.value}})}
                        className="border border-gray-300 rounded-lg px-3 py-2"
                      />
                      <span className="self-end pb-2 text-gray-500">até</span>
                      <input
                        type="month"
                        value={filters.period.to}
                        onChange={(e) => setFilters({...filters, period: {...filters.period, to: e.target.value}})}
                        className="border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <CompanyRanking flow={filters.flow} period={filters.period} />
          </div>
        );
      
      case 'explorer':
        return (
          <div className="space-y-6">
            {/* Header Explorer */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Explorador da API ComexStat</h2>
                <p className="text-gray-600">Ferramenta para descobrir quais dados estão disponíveis na API oficial</p>
              </div>
            </div>

            <APIExplorer />
          </div>
        );
      
      default:
        return <ComexStatDashboard />;
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
                <h1 className="text-xl font-bold text-gray-900">ComexStat Analytics</h1>
                <p className="text-sm text-gray-600">Sistema Completo de Análise de Comércio Exterior</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Dados oficiais MDIC</span>
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
                  } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  <Icon
                    className={`${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    } -ml-0.5 mr-2 h-5 w-5`}
                  />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Description */}
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Tab Content */}
        {renderContent()}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Sobre o Sistema</h3>
              <p className="text-sm text-gray-600">
                Dashboard completo para análise de dados de comércio exterior brasileiro, 
                utilizando exclusivamente dados oficiais da API ComexStat do MDIC.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Funcionalidades</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Evolução temporal de FOB e Peso</li>
                <li>• Ranking de produtos por NCM</li>
                <li>• Ranking de empresas por volume</li>
                <li>• Explorador de dados da API</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Dados</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Fonte: API ComexStat Oficial</li>
                <li>• Frequência: Dados mensais</li>
                <li>• Cobertura: Todo território nacional</li>
                <li>• Atualização: Conforme MDIC</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              © 2024 Duri Trading - Sistema de Análise ComexStat | 
              Desenvolvido por Carlos Leal
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardExpandido;