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
            Carregando Sitema Comex Duri
          </h2>
          <p className="text-gray-600 mb-6">
            Inicializando sistema...
          </p>
          
          {/* Progress Animation */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
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