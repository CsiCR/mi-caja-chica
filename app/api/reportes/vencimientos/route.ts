
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, addWeeks, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agrupacion = searchParams.get('agrupacion') || 'semana'; // 'semana' o 'mes'
    const tipo = searchParams.get('tipo') || '';
    const moneda = searchParams.get('moneda') || '';
    const entidadId = searchParams.get('entidadId') || '';
    const cuentaBancariaId = searchParams.get('cuentaBancariaId') || '';
    const periodosHaciaAdelante = parseInt(searchParams.get('periodos') || '12');
    const soloVencidas = searchParams.get('soloVencidas') === 'true';

    const fechaBaseStr = searchParams.get('fechaBase');
    const baseDate = fechaBaseStr ? new Date(fechaBaseStr) : new Date();

    const today = new Date();
    // Siempre queremos ver desde el principio del mes base o desde hoy si es el mes actual
    const fechaInicio = soloVencidas ? new Date('2020-01-01') : startOfMonth(baseDate);

    // Calcular fecha límite hacia adelante (un mes desde el inicio del mes base para cubrir el calendario)
    const fechaLimite = endOfMonth(baseDate);

    // Construir filtros
    const where: Prisma.TransaccionWhereInput = {
      userId: session.user.id,
      estado: 'PLANIFICADA',
      fechaPlanificada: {
        gte: fechaInicio,
        lte: soloVencidas ? today : fechaLimite,
      },
      ...(tipo && { tipo: tipo as any }),
      ...(moneda && { moneda: moneda as any }),
      ...(entidadId && { entidadId }),
      ...(cuentaBancariaId && { cuentaBancariaId }),
    };

    // Obtener transacciones planificadas
    const transacciones = await prisma.transaccion.findMany({
      where,
      include: {
        entidad: true,
        cuentaBancaria: true,
        asientoContable: true,
      },
      orderBy: { fechaPlanificada: 'asc' },
    });

    // Agrupar por períodos
    const grupos: {
      [key: string]: {
        periodo: string;
        fechaInicio: Date;
        fechaFin: Date;
        transacciones: typeof transacciones;
        totales: { ARS: { ingresos: number; egresos: number; neto: number }; USD: { ingresos: number; egresos: number; neto: number } };
        vencido: boolean;
      }
    } = {};

    transacciones.forEach(transaccion => {
      if (!transaccion.fechaPlanificada) return;

      const fecha = new Date(transaccion.fechaPlanificada);
      let periodoKey: string;
      let fechaInicioPeriodo: Date;
      let fechaFinPeriodo: Date;
      let nombrePeriodo: string;

      if (agrupacion === 'semana') {
        fechaInicioPeriodo = startOfWeek(fecha, { weekStartsOn: 0 }); // Domingo
        fechaFinPeriodo = endOfWeek(fecha, { weekStartsOn: 0 }); // Sábado
        periodoKey = format(fechaInicioPeriodo, 'yyyy-ww');
        nombrePeriodo = `Semana del ${format(fechaInicioPeriodo, 'dd/MM', { locale: es })} al ${format(fechaFinPeriodo, 'dd/MM/yyyy', { locale: es })}`;
      } else {
        fechaInicioPeriodo = startOfMonth(fecha);
        fechaFinPeriodo = endOfMonth(fecha);
        periodoKey = format(fechaInicioPeriodo, 'yyyy-MM');
        nombrePeriodo = format(fechaInicioPeriodo, 'MMMM yyyy', { locale: es });
      }

      if (!grupos[periodoKey]) {
        grupos[periodoKey] = {
          periodo: nombrePeriodo,
          fechaInicio: fechaInicioPeriodo,
          fechaFin: fechaFinPeriodo,
          transacciones: [],
          totales: {
            ARS: { ingresos: 0, egresos: 0, neto: 0 },
            USD: { ingresos: 0, egresos: 0, neto: 0 }
          },
          vencido: fechaFinPeriodo < today,
        };
      }

      grupos[periodoKey].transacciones.push(transaccion);

      // Calcular totales
      const monto = Number(transaccion.monto);
      const monedaTransaccion = transaccion.moneda as 'ARS' | 'USD';

      if (transaccion.tipo === 'INGRESO') {
        grupos[periodoKey].totales[monedaTransaccion].ingresos += monto;
      } else {
        grupos[periodoKey].totales[monedaTransaccion].egresos += monto;
      }

      grupos[periodoKey].totales[monedaTransaccion].neto =
        grupos[periodoKey].totales[monedaTransaccion].ingresos -
        grupos[periodoKey].totales[monedaTransaccion].egresos;
    });

    // Convertir a array y ordenar
    const gruposArray = Object.entries(grupos)
      .map(([key, grupo]) => ({ key, ...grupo }))
      .sort((a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime());

    // Calcular totales generales
    const totalesGenerales = {
      ARS: { ingresos: 0, egresos: 0, neto: 0 },
      USD: { ingresos: 0, egresos: 0, neto: 0 },
      totalTransacciones: transacciones.length,
    };

    gruposArray.forEach(grupo => {
      totalesGenerales.ARS.ingresos += grupo.totales.ARS.ingresos;
      totalesGenerales.ARS.egresos += grupo.totales.ARS.egresos;
      totalesGenerales.ARS.neto += grupo.totales.ARS.neto;
      totalesGenerales.USD.ingresos += grupo.totales.USD.ingresos;
      totalesGenerales.USD.egresos += grupo.totales.USD.egresos;
      totalesGenerales.USD.neto += grupo.totales.USD.neto;
    });

    return NextResponse.json({
      grupos: gruposArray,
      totalesGenerales,
      filtros: {
        agrupacion,
        tipo,
        moneda,
        entidadId,
        cuentaBancariaId,
        periodosHaciaAdelante,
        soloVencidas,
      },
      metadata: {
        totalPeriodos: gruposArray.length,
        periodosVencidos: gruposArray.filter(g => g.vencido).length,
        transaccionesPendientes: transacciones.length,
      },
    });
  } catch (error) {
    console.error('Error al generar reporte de vencimientos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
