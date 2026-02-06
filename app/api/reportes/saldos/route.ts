
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entidadId = searchParams.get('entidadId') || '';
    const cuentaBancariaId = searchParams.get('cuentaBancariaId') || '';
    const moneda = searchParams.get('moneda') || '';
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const incluirPlanificadas = searchParams.get('incluirPlanificadas') === 'true';

    // Obtener todas las entidades y cuentas del usuario
    const [entidades, cuentas] = await Promise.all([
      prisma.entidad.findMany({
        where: { 
          userId: session.user.id, 
          activa: true,
          ...(entidadId && { id: entidadId }),
        },
        orderBy: { nombre: 'asc' },
      }),
      prisma.cuentaBancaria.findMany({
        where: { 
          userId: session.user.id, 
          activa: true,
          ...(cuentaBancariaId && { id: cuentaBancariaId }),
          ...(moneda && { moneda: moneda as any }),
        },
        orderBy: { nombre: 'asc' },
      }),
    ]);

    // Construir filtros para transacciones
    const transaccionWhere: Prisma.TransaccionWhereInput = {
      userId: session.user.id,
      ...(entidadId && { entidadId }),
      ...(cuentaBancariaId && { cuentaBancariaId }),
      ...(moneda && { moneda: moneda as any }),
      ...(fechaDesde && fechaHasta && {
        fecha: {
          gte: new Date(fechaDesde),
          lte: new Date(fechaHasta),
        },
      }),
      ...(incluirPlanificadas ? {} : { estado: 'REAL' }),
    };

    // Obtener transacciones agrupadas
    const transacciones = await prisma.transaccion.findMany({
      where: transaccionWhere,
      include: {
        entidad: true,
        cuentaBancaria: true,
      },
    });

    // Calcular saldos por entidad y cuenta
    const saldosMatrix: { [entidadId: string]: { [cuentaId: string]: { ARS: number; USD: number } } } = {};
    const totalesPorEntidad: { [entidadId: string]: { ARS: number; USD: number } } = {};
    const totalesPorCuenta: { [cuentaId: string]: { ARS: number; USD: number } } = {};

    // Inicializar matrices
    entidades.forEach(entidad => {
      saldosMatrix[entidad.id] = {};
      totalesPorEntidad[entidad.id] = { ARS: 0, USD: 0 };
      
      cuentas.forEach(cuenta => {
        saldosMatrix[entidad.id][cuenta.id] = { ARS: 0, USD: 0 };
      });
    });

    cuentas.forEach(cuenta => {
      totalesPorCuenta[cuenta.id] = { ARS: 0, USD: 0 };
    });

    // Calcular saldos
    transacciones.forEach(transaccion => {
      const entidadId = transaccion.entidadId;
      const cuentaId = transaccion.cuentaBancariaId;
      const moneda = transaccion.moneda;
      const monto = Number(transaccion.monto);
      const factor = transaccion.tipo === 'INGRESO' ? 1 : -1;
      const montoFinal = monto * factor;

      if (saldosMatrix[entidadId] && saldosMatrix[entidadId][cuentaId]) {
        saldosMatrix[entidadId][cuentaId][moneda] += montoFinal;
      }
      
      if (totalesPorEntidad[entidadId]) {
        totalesPorEntidad[entidadId][moneda] += montoFinal;
      }
      
      if (totalesPorCuenta[cuentaId]) {
        totalesPorCuenta[cuentaId][moneda] += montoFinal;
      }
    });

    // Calcular total general
    const totalGeneral = { ARS: 0, USD: 0 };
    Object.values(totalesPorEntidad).forEach(total => {
      totalGeneral.ARS += total.ARS;
      totalGeneral.USD += total.USD;
    });

    return NextResponse.json({
      entidades,
      cuentas,
      saldosMatrix,
      totalesPorEntidad,
      totalesPorCuenta,
      totalGeneral,
      filtros: {
        entidadId,
        cuentaBancariaId,
        moneda,
        fechaDesde,
        fechaHasta,
        incluirPlanificadas,
      },
    });
  } catch (error) {
    console.error('Error al generar reporte de saldos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
