
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayoutServer } from '@/components/layout/dashboard-layout-server';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  return (
    <DashboardLayoutServer user={session.user}>
      <div className="space-y-6">
        {/* Encabezado de bienvenida */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">
            ¡Bienvenido, {session.user.firstName || session.user.name}!
          </h1>
          <p className="text-green-100">
            Aquí tienes un resumen actualizado de tus finanzas y emprendimientos
          </p>
        </div>

        {/* Estadísticas dinámicas */}
        <DashboardStats />
      </div>
    </DashboardLayoutServer>
  );
}
