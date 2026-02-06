
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener todas las entidades y cuentas del usuario
    const [entidades, cuentas, transacciones] = await Promise.all([
      prisma.entidad.findMany({
        where: { userId: session.user.id, activa: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' }
      }),
      prisma.cuentaBancaria.findMany({
        where: { userId: session.user.id, activa: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' }
      }),
      prisma.transaccion.findMany({
        where: { 
          userId: session.user.id,
          estado: 'REAL'
        },
        select: {
          monto: true,
          moneda: true,
          tipo: true,
          entidadId: true,
          cuentaBancariaId: true,
          entidad: {
            select: { nombre: true }
          },
          cuentaBancaria: {
            select: { nombre: true }
          }
        }
      })
    ]);

    // Inicializar estructura de saldos
    const saldos: Record<string, Record<string, { ARS: number; USD: number }>> = {};
    
    entidades.forEach(entidad => {
      saldos[entidad.nombre] = {};
      cuentas.forEach(cuenta => {
        saldos[entidad.nombre][cuenta.nombre] = { ARS: 0, USD: 0 };
      });
    });

    // Calcular saldos por entidad y cuenta
    transacciones.forEach(t => {
      const entidadNombre = t.entidad.nombre;
      const cuentaNombre = t.cuentaBancaria.nombre;
      const amount = parseFloat(t.monto.toString());
      const multiplier = t.tipo === 'INGRESO' ? 1 : -1;

      if (saldos[entidadNombre]?.[cuentaNombre]) {
        saldos[entidadNombre][cuentaNombre][t.moneda] += amount * multiplier;
      }
    });

    return NextResponse.json({
      entidades: entidades.map(e => e.nombre),
      cuentas: cuentas.map(c => c.nombre),
      saldos
    });

  } catch (error) {
    console.error('Error fetching saldos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
