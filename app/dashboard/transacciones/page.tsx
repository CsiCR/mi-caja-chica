
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayoutServer } from '@/components/layout/dashboard-layout-server';
import { TransaccionesList } from '@/components/transacciones/transacciones-list';

export default async function TransaccionesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  return (
    <DashboardLayoutServer user={session.user}>
      <TransaccionesList />
    </DashboardLayoutServer>
  );
}
