// app/page.tsx - Corrigido para eliminar warnings de hidratação
import dynamic from 'next/dynamic';

// ✅ IMPORT DINÂMICO - Elimina warnings de hidratação
const ComexStatDashboard = dynamic(
  () => import('../components/Dashboard'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando Dashboard ComexStat...</p>
        </div>
      </div>
    )
  }
);

export default function HomePage() {
  return (
    <main>
      <ComexStatDashboard />
    </main>
  );
}