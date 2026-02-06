

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener estadísticas en paralelo para mejor rendimiento
    const [
      entidadesCount,
      cuentasCount,
      transaccionesCount,
      asientosCount,
      transaccionesPendientes,
      saldos
    ] = await Promise.all([
      // Contar entidades activas
      prisma.entidad.count({
        where: {
          userId: session.user.id,
          activa: true
        }
      }),
      
      // Contar cuentas bancarias activas
      prisma.cuentaBancaria.count({
        where: {
          userId: session.user.id,
          activa: true
        }
      }),
      
      // Contar transacciones totales
      prisma.transaccion.count({
        where: {
          userId: session.user.id
        }
      }),
      
      // Contar asientos contables activos
      prisma.asientoContable.count({
        where: {
          userId: session.user.id,
          activo: true
        }
      }),
      
      // Contar transacciones planificadas (pendientes)
      prisma.transaccion.count({
        where: {
          userId: session.user.id,
          estado: 'PLANIFICADA'
        }
      }),
      
      // Calcular saldos por moneda - obtener todas las transacciones reales
      prisma.transaccion.findMany({
        where: {
          userId: session.user.id,
          estado: 'REAL' // Solo contar transacciones reales
        },
        select: {
          monto: true,
          moneda: true,
          tipo: true
        }
      })
    ]);

    // Calcular saldos totales por moneda
    const saldoTotal = {
      ARS: 0,
      USD: 0
    };

    saldos.forEach((transaccion) => {
      const monto = Number(transaccion.monto || 0);
      const moneda = transaccion.moneda as 'ARS' | 'USD';
      
      if (transaccion.tipo === 'INGRESO') {
        saldoTotal[moneda] += monto;
      } else if (transaccion.tipo === 'EGRESO') {
        saldoTotal[moneda] -= monto;
      }
    });

    const stats = {
      entidades: entidadesCount,
      cuentas: cuentasCount,
      transacciones: transaccionesCount,
      asientos: asientosCount,
      transaccionesPendientes,
      saldoTotal
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

