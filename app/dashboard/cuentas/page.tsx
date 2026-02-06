
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayoutServer } from '@/components/layout/dashboard-layout-server';
import { CuentasList } from '@/components/cuentas/cuentas-list';

export default async function CuentasPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  return (
    <DashboardLayoutServer user={session.user}>
      <CuentasList />
    </DashboardLayoutServer>
  );
}
