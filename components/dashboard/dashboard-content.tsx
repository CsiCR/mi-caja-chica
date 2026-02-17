
'use client';

import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { OverviewStats } from '@/components/dashboard/overview-stats';
import { SaldosTable } from '@/components/dashboard/saldos-table';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { PieChart, BarChart3, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardContent() {
  const { data: session } = useSession();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Encabezado de bienvenida */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">
            ¡Bienvenido{session?.user?.firstName || session?.user?.name ? `, ${session.user.firstName || session.user.name}` : ''}!
          </h1>
          <p className="text-green-100">
            Aquí tienes un resumen de tus finanzas y emprendimientos
          </p>
        </div>

        {/* Estadísticas principales */}
        <OverviewStats />

        {/* Tabla de saldos principal */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Saldos por Entidad y Cuenta
            </CardTitle>
            <CardDescription>
              Vista general de los saldos de cada entidad distribuidos por cuenta bancaria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SaldosTable />
          </CardContent>
        </Card>

        {/* Transacciones recientes */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Movimientos Recientes
            </CardTitle>
            <CardDescription>
              Últimas transacciones registradas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentTransactions />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
