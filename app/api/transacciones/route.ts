
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { createGoogleCalendarEvent } from '@/lib/calendar';

export const dynamic = 'force-dynamic';
import { Prisma } from '@prisma/client';

const TransaccionSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es requerida').max(255, 'La descripción no puede exceder 255 caracteres'),
  monto: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  moneda: z.enum(['ARS', 'USD']).default('ARS'),
  tipo: z.enum(['INGRESO', 'EGRESO']),
  estado: z.enum(['REAL', 'PLANIFICADA']).default('REAL'),
  fecha: z.string().transform((str) => new Date(str)).optional(),
  fechaPlanificada: z.string().transform((str) => new Date(str)).optional(),
  comentario: z.string().optional(),
  entidadId: z.string().min(1, 'La entidad es requerida'),
  cuentaBancariaId: z.string().min(1, 'La cuenta bancaria es requerida'),
  asientoContableId: z.string().min(1, 'El asiento contable es requerido'),
});

const TransaccionLoteSchema = z.object({
  transacciones: z.array(TransaccionSchema).min(1, 'Debe incluir al menos una transacción'),
});

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
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: Prisma.TransaccionWhereInput = {
      userId: session.user.id,
      ...(search && {
        OR: [
          { descripcion: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { comentario: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
      ...(tipo && { tipo: tipo as any }),
      ...(estado && { estado: estado as any }),
      ...(moneda && { moneda: moneda as any }),
      ...(entidadId && { entidadId }),
      ...(cuentaBancariaId && { cuentaBancariaId }),
      ...(fechaDesde && fechaHasta && {
        fecha: {
          gte: new Date(fechaDesde),
          lte: new Date(fechaHasta),
        },
      }),
    };

    const [transacciones, total] = await Promise.all([
      prisma.transaccion.findMany({
        where,
        include: {
          entidad: true,
          cuentaBancaria: true,
          asientoContable: true,
        },
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaccion.count({ where }),
    ]);

    return NextResponse.json({
      transacciones,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Verificar si es carga individual o por lotes
    if (body.transacciones && Array.isArray(body.transacciones)) {
      // Carga por lotes
      const validatedData = TransaccionLoteSchema.parse(body);

      // Verificar que todas las entidades, cuentas y asientos pertenecen al usuario
      const entidadIds = [...new Set(validatedData.transacciones.map(t => t.entidadId))];
      const cuentaIds = [...new Set(validatedData.transacciones.map(t => t.cuentaBancariaId))];
      const asientoIds = [...new Set(validatedData.transacciones.map(t => t.asientoContableId))];

      const [entidades, cuentas, asientos] = await Promise.all([
        prisma.entidad.findMany({ where: { id: { in: entidadIds }, userId: session.user.id } }),
        prisma.cuentaBancaria.findMany({ where: { id: { in: cuentaIds }, userId: session.user.id } }),
        prisma.asientoContable.findMany({ where: { id: { in: asientoIds }, userId: session.user.id } }),
      ]);

      if (entidades.length !== entidadIds.length ||
        cuentas.length !== cuentaIds.length ||
        asientos.length !== asientoIds.length) {
        return NextResponse.json({ error: 'Algunas referencias no son válidas' }, { status: 400 });
      }

      const transacciones = await prisma.transaccion.createMany({
        data: validatedData.transacciones.map(t => {
          const fechaToUse = t.estado === 'PLANIFICADA'
            ? (t.fechaPlanificada || new Date())
            : (t.fecha || new Date());

          return {
            descripcion: t.descripcion,
            monto: t.monto,
            moneda: t.moneda,
            tipo: t.tipo,
            estado: t.estado,
            fecha: fechaToUse,
            fechaPlanificada: t.estado === 'PLANIFICADA' ? (t.fechaPlanificada || fechaToUse) : null,
            comentario: t.comentario || null,
            entidadId: t.entidadId,
            cuentaBancariaId: t.cuentaBancariaId,
            asientoContableId: t.asientoContableId,
            userId: session.user.id,
          };
        }),
      });

      return NextResponse.json({ message: `${validatedData.transacciones.length} transacciones creadas correctamente` }, { status: 201 });
    } else {
      // Carga individual
      const validatedData = TransaccionSchema.parse(body);

      // Verificar que las referencias pertenecen al usuario
      const [entidad, cuenta, asiento] = await Promise.all([
        prisma.entidad.findFirst({ where: { id: validatedData.entidadId, userId: session.user.id } }),
        prisma.cuentaBancaria.findFirst({ where: { id: validatedData.cuentaBancariaId, userId: session.user.id } }),
        prisma.asientoContable.findFirst({ where: { id: validatedData.asientoContableId, userId: session.user.id } }),
      ]);

      if (!entidad || !cuenta || !asiento) {
        return NextResponse.json({ error: 'Referencias no válidas' }, { status: 400 });
      }

      const fechaToUse = validatedData.estado === 'PLANIFICADA'
        ? (validatedData.fechaPlanificada || new Date())
        : (validatedData.fecha || new Date());

      const transaccion = await prisma.transaccion.create({
        data: {
          descripcion: validatedData.descripcion,
          monto: validatedData.monto,
          moneda: validatedData.moneda,
          tipo: validatedData.tipo,
          estado: validatedData.estado,
          fecha: fechaToUse,
          fechaPlanificada: validatedData.estado === 'PLANIFICADA' ? (validatedData.fechaPlanificada || fechaToUse) : null,
          comentario: validatedData.comentario || null,
          entidadId: validatedData.entidadId,
          cuentaBancariaId: validatedData.cuentaBancariaId,
          asientoContableId: validatedData.asientoContableId,
          userId: session.user.id,
        },
        include: {
          entidad: true,
          cuentaBancaria: true,
          asientoContable: true,
        },
      });

      // Sincronizar con Google Calendar si es PLANIFICADA y hay token
      if (transaccion.estado === 'PLANIFICADA' && (session as any).accessToken) {
        try {
          await createGoogleCalendarEvent((session as any).accessToken, {
            descripcion: transaccion.descripcion,
            monto: Number(transaccion.monto),
            moneda: transaccion.moneda,
            fechaPlanificada: transaccion.fechaPlanificada!,
            tipo: transaccion.tipo as 'INGRESO' | 'EGRESO'
          });
        } catch (calErr) {
          console.error('Error no crítico al sincronizar con Calendar:', calErr);
          // No bloqueamos la creación de la transacción si falla el calendario
        }
      }

      return NextResponse.json(transaccion, { status: 201 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    console.error('Error al crear transacción:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
