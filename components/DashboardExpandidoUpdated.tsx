// components/DashboardExpandidoUpdated.tsx - Dashboard Expandido com Componentes Corrigidos
'use client';

import React, { useState } from 'react';
import { BarChart3, Package, Building, Database, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import DashboardWithMonthlyFilters from './DashboardWithMonthlyFilters';
import NCMRankingFixed from './NCMRankingFixed';
import CompanyRankingFixed from './CompanyRankingFixed';
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
        return <DashboardWithMonthlyFilters />;
      
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Operação
                    </label>
                    <select
                      value={filters.flow}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        flow: e.target.value as 'export' | 'import' 
                      }))}
                      className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="export">Exportação</option>
                      <option value="import">Importação</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Período
                    </label>
                    <select
                      value={`${filters.period.from}-${filters.period.to}`}
                      onChange={(e) => {
                        const [from, to] = e.target.value.split('-');
                        setFilters(prev => ({ 
                          ...prev, 
                          period: { from: `${from}-01`, to: `${to}-12` }
                        }));
                      }}
                      className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="2024-2024">2024</option>
                      <option value="2023-2023">2023</option>
                      <option value="2022-2022">2022</option>
                      <option value="2021-2021">2021</option>
                      <option value="2020-2020">2020</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <NCMRankingFixed flow={filters.flow} period={filters.period} />
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
                  <p className="text-gray-600">Ranking das empresas por volume de operações</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Operação
                    </label>
                    <select
                      value={filters.flow}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        flow: e.target.value as 'export' | 'import' 
                      }))}
                      className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="export">Exportação</option>
                      <option value="import">Importação</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Período
                    </label>
                    <select
                      value={`${filters.period.from}-${filters.period.to}`}
                      onChange={(e) => {
                        const [from, to] = e.target.value.split('-');
                        setFilters(prev => ({ 
                          ...prev, 
                          period: { from: `${from}-01`, to: `${to}-12` }
                        }));
                      }}
                      className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="2024-2024">2024</option>
                      <option value="2023-2023">2023</option>
                      <option value="2022-2022">2022</option>
                      <option value="2021-2021">2021</option>
                      <option value="2020-2020">2020</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Aviso sobre limitações da API */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-medium">Limitações dos Dados Empresariais</p>
                  <p className="text-amber-700 text-sm mt-1">
                    A API ComexStat pode ter restrições para dados empresariais devido a questões de privacidade.
                    Quando os dados reais não estão disponíveis, exibimos exemplos baseados em estatísticas oficiais.
                  </p>
                </div>
              </div>
            </div>

            <CompanyRankingFixed flow={filters.flow} period={filters.period} />
          </div>
        );
      
      case 'explorer':
        return (
          <div className="space-y-6">
            {/* Header Explorer */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Explorador da API ComexStat</h2>
                <p className="text-gray-600">
                  Ferramenta para descobrir quais dados estão disponíveis na API oficial
                </p>
              </div>
            </div>

            {/* Aviso sobre Rate Limiting */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <TrendingUp className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-blue-800 font-medium">Rate Limiting Implementado</p>
                  <p className="text-blue-700 text-sm mt-1">
                    O sistema agora implementa rate limiting inteligente (3-15s entre requests) para evitar 
                    erros 429. A exploração será mais lenta mas mais estável.
                  </p>
                </div>
              </div>
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
              <p>✅ Sistema corrigido com rate limiting inteligente e filtros mensais</p>
              <p className="mt-1">
                🔧 Problemas resolvidos: Rate limit 429, Endpoints 400, Gráfico NCM, Dados empresa, Filtros mensais
              </p>
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <span>ComexStat Analytics v2.1</span>
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