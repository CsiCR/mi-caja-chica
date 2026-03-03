
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
    const search = searchParams.get('search') || '';
    const tipo = searchParams.get('tipo') || '';
    const estado = searchParams.get('estado') || '';
    const moneda = searchParams.get('moneda') || '';
    const entidadId = searchParams.get('entidadId') || '';
    const cuentaBancariaId = searchParams.get('cuentaBancariaId') || '';
    const asientoContableId = searchParams.get('asientoContableId') || '';
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const montoDesde = searchParams.get('montoDesde');
    const montoHasta = searchParams.get('montoHasta');
    const sortBy = searchParams.get('sortBy') || 'fecha';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const export_format = searchParams.get('export') || '';
    const modo = searchParams.get('modo') || 'LISTA'; // LISTA o MAYOR
    const agruparPor = searchParams.get('agruparPor') || 'CUENTA'; // CUENTA o ASIENTO

    const where: Prisma.TransaccionWhereInput = {
      userId: session.user.id,
      ...(search && {
        OR: [
          { descripcion: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { comentario: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { entidad: { nombre: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          { cuentaBancaria: { nombre: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          { asientoContable: { nombre: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        ],
      }),
      ...(tipo && { tipo: tipo as any }),
      ...(estado && { estado: estado as any }),
      ...(moneda && { moneda: moneda as any }),
      ...(entidadId && { entidadId }),
      ...(cuentaBancariaId && { cuentaBancariaId }),
      ...(asientoContableId && { asientoContableId }),
      ...((fechaDesde || fechaHasta) && {
        fecha: {
          ...(fechaDesde && { gte: new Date(fechaDesde) }),
          ...(fechaHasta && { lte: new Date(fechaHasta) }),
        },
      }),
      ...(montoDesde && montoHasta && {
        monto: {
          gte: parseFloat(montoDesde),
          lte: parseFloat(montoHasta),
        },
      }),
    };

    // Determinar ordenamiento
    let orderBy: any = [{ fecha: 'desc' }];

    if (modo === 'MAYOR') {
      if (agruparPor === 'ASIENTO') {
        orderBy = [
          { asientoContable: { codigo: 'asc' } },
          { fecha: 'asc' }
        ];
      } else {
        orderBy = [
          { cuentaBancaria: { nombre: 'asc' } },
          { fecha: 'asc' }
        ];
      }
    } else {
      let sortField = sortBy;
      let order = sortOrder as any;

      switch (sortBy) {
        case 'descripcion':
          orderBy = [{ descripcion: order }];
          break;
        case 'monto':
          orderBy = [{ monto: order }];
          break;
        case 'entidad':
          orderBy = [{ entidad: { nombre: order } }];
          break;
        case 'cuenta':
          orderBy = [{ cuentaBancaria: { nombre: order } }];
          break;
        case 'asiento':
          orderBy = [{ asientoContable: { codigo: order } }];
          break;
        case 'tipo':
          orderBy = [{ tipo: order }];
          break;
        case 'estado':
          orderBy = [{ estado: order }];
          break;
        default:
          orderBy = [{ fecha: order }];
      }
    }

    if (export_format === 'csv') {
      // Exportar todas las transacciones sin paginación para CSV
      const todasTransacciones = await prisma.transaccion.findMany({
        where,
        include: {
          entidad: true,
          cuentaBancaria: true,
          asientoContable: true,
        },
        orderBy,
      });

      // Convertir a formato CSV
      const csvHeaders = [
        'Fecha',
        'Descripción',
        'Entidad',
        'Cuenta Bancaria',
        'Banco',
        'Asiento Contable',
        'Tipo',
        'Monto',
        'Moneda',
        'Estado',
        'Fecha Planificada',
        'Comentario',
      ];

      const csvRows = todasTransacciones.map(t => [
        new Date(t.fecha).toLocaleDateString('es-AR'),
        t.descripcion,
        t.entidad.nombre,
        t.cuentaBancaria.nombre,
        t.cuentaBancaria.banco,
        `${t.asientoContable.codigo} - ${t.asientoContable.nombre}`,
        t.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso',
        Number(t.monto).toFixed(2),
        t.moneda,
        t.estado === 'REAL' ? 'Real' : 'Planificada',
        t.fechaPlanificada ? new Date(t.fechaPlanificada).toLocaleDateString('es-AR') : '',
        t.comentario || '',
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="transacciones_mi_caja_chica.csv"',
        },
      });
    }

    // Si es modo MAYOR, necesitamos calcular saldos iniciales por entidad de agrupación independientemente de la paginación
    let saldosIniciales: Record<string, Record<string, number>> = {};
    if (modo === 'MAYOR' && fechaDesde) {
      const fieldId = agruparPor === 'ASIENTO' ? 'asientoContableId' : 'cuentaBancariaId';

      const results = await prisma.transaccion.groupBy({
        by: [fieldId, 'tipo', 'moneda'],
        where: {
          userId: session.user.id,
          fecha: { lt: new Date(fechaDesde) },
          estado: 'REAL'
        },
        _sum: {
          monto: true
        }
      });

      results.forEach(res => {
        const id = (res as any)[fieldId];
        if (!id) return;
        const moneda = res.moneda;
        const monto = Number(res._sum.monto || 0);

        if (!saldosIniciales[id]) saldosIniciales[id] = {};
        if (!saldosIniciales[id][moneda]) saldosIniciales[id][moneda] = 0;

        if (res.tipo === 'INGRESO') saldosIniciales[id][moneda] += monto;
        else saldosIniciales[id][moneda] -= monto;
      });
    }

    const [transacciones, total] = await Promise.all([
      prisma.transaccion.findMany({
        where,
        include: {
          entidad: true,
          cuentaBancaria: true,
          asientoContable: true,
        },
        orderBy,
        skip: modo === 'MAYOR' ? undefined : (page - 1) * limit, // En modo mayor mandamos todo o paginamos por cuenta?
        take: modo === 'MAYOR' ? 1000 : limit, // Limitamos a 1000 para no romper memoria si es mayor, idealmente debería paginar por cuenta
      }),
      prisma.transaccion.count({ where }),
    ]);

    // Calcular resumen por tipo y moneda
    let resumenDetallado: any[] = [];
    try {
      // Intentamos agrupar, pero si falla por filtros de relación, lo ignoramos para no romper el reporte
      resumenDetallado = await (prisma.transaccion.groupBy as any)({
        by: ['tipo', 'moneda'],
        where,
        _sum: {
          monto: true,
        },
        _count: {
          _all: true,
        },
      });
    } catch (err) {
      console.error('Error en groupBy resumenDetallado:', err);
      resumenDetallado = [];
    }

    return NextResponse.json({
      transacciones,
      saldosIniciales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      resumen: {
        totalTransacciones: total,
        detalle: resumenDetallado,
      },
      filtros: {
        search,
        tipo,
        estado,
        moneda,
        entidadId,
        cuentaBancariaId,
        asientoContableId,
        fechaDesde,
        fechaHasta,
        montoDesde,
        montoHasta,
        sortBy,
        sortOrder,
        modo,
      },
    });
  } catch (error: any) {
    console.error('Error al generar reporte de transacciones:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
