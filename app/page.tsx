// app/page.tsx - Página principal com dashboard expandido
import dynamic from 'next/dynamic';

// ✅ IMPORT DINÂMICO DO DASHBOARD EXPANDIDO
const DashboardExpandido = dynamic(
  () => import('../components/DashboardExpandido'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Carregando ComexStat Analytics</h2>
          <p className="text-gray-600 mb-4">Inicializando sistema completo de análise...</p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>• Dashboard temporal</p>
            <p>• Ranking de NCM</p>
            <p>• Ranking de empresas</p>
            <p>• Explorador da API</p>
          </div>
        </div>
      </div>
    )
  }
);

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <DashboardExpandido />
    </main>
  );
}