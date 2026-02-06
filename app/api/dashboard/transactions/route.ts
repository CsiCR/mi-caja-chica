
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const transacciones = await prisma.transaccion.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        descripcion: true,
        monto: true,
        moneda: true,
        tipo: true,
        estado: true,
        fecha: true,
        fechaPlanificada: true,
        entidad: {
          select: { nombre: true }
        },
        cuentaBancaria: {
          select: { nombre: true }
        },
        asientoContable: {
          select: { nombre: true }
        }
      },
      orderBy: [
        { fecha: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });

    // Convertir BigInt a string para evitar problemas de serialización
    const formattedTransactions = transacciones.map(t => ({
      ...t,
      monto: parseFloat(t.monto.toString()),
      fecha: t.fecha.toISOString(),
      fechaPlanificada: t.fechaPlanificada?.toISOString() || null
    }));

    return NextResponse.json(formattedTransactions);

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
