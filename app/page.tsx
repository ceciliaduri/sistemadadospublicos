// app/page.tsx - Página principal atualizada com componentes corrigidos
import dynamic from 'next/dynamic';

// ✅ IMPORT DINÂMICO DO DASHBOARD CORRIGIDO
const DashboardExpandidoUpdated = dynamic(
  () => import('../components/DashboardExpandidoUpdated'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-8"></div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Carregando ComexStat Analytics Pro
          </h2>
          <p className="text-gray-600 mb-6">
            Inicializando sistema corrigido com rate limiting inteligente...
          </p>
          
          {/* Progress Animation */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
          </div>
          
          <div className="space-y-3 text-sm text-gray-500">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
              <span>✅ Rate limiting inteligente carregado</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <span>✅ Gráficos NCM corrigidos</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <span>✅ Filtros mensais implementados</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              <span>✅ Endpoints corrigidos</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>🔄 Conectando à API ComexStat...</span>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Melhorias implementadas:</strong><br/>
              • Rate limiting: 3-15s entre requests<br/>
              • NCM: Gráfico horizontal corrigido<br/>
              • Empresas: Fallback data quando API não disponível<br/>
              • Filtros: Suporte mensal completo<br/>
              • API: Endpoints corrigidos para evitar 400/429
            </p>
          </div>
        </div>
      </div>
    )
  }
);

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardExpandidoUpdated />
    </main>
  );
}