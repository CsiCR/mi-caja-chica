
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { updateGoogleCalendarEvent, deleteGoogleCalendarEvent, createGoogleCalendarEvent } from '@/lib/calendar';

const TransaccionUpdateSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es requerida').max(255, 'La descripción no puede exceder 255 caracteres'),
  monto: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  moneda: z.enum(['ARS', 'USD']),
  tipo: z.enum(['INGRESO', 'EGRESO']),
  estado: z.enum(['REAL', 'PLANIFICADA']),
  fecha: z.string().transform((str) => new Date(str)),
  fechaPlanificada: z.string().transform((str) => new Date(str)).optional(),
  comentario: z.string().optional(),
  entidadId: z.string().min(1, 'La entidad es requerida'),
  cuentaBancariaId: z.string().min(1, 'La cuenta bancaria es requerida'),
  asientoContableId: z.string().min(1, 'El asiento contable es requerido'),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = TransaccionUpdateSchema.parse(body);

    const existingTransaccion = await prisma.transaccion.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existingTransaccion) {
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
    }

    // Verificar que las referencias pertenecen al usuario
    const [entidad, cuenta, asiento] = await Promise.all([
      prisma.entidad.findFirst({ where: { id: validatedData.entidadId, userId: session.user.id } }),
      prisma.cuentaBancaria.findFirst({ where: { id: validatedData.cuentaBancariaId, userId: session.user.id } }),
      prisma.asientoContable.findFirst({ where: { id: validatedData.asientoContableId, userId: session.user.id } }),
    ]);

    if (!entidad || !cuenta || !asiento) {
      return NextResponse.json({ error: 'Referencias no válidas' }, { status: 400 });
    }

    const transaccion = await prisma.transaccion.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        entidad: true,
        cuentaBancaria: true,
        asientoContable: true,
      },
    });

    // Sincronizar con Google Calendar
    if ((session as any).accessToken) {
      if (transaccion.estado === 'PLANIFICADA') {
        if (transaccion.googleEventId) {
          // Actualizar evento existente
          await updateGoogleCalendarEvent((session as any).accessToken, transaccion.googleEventId, {
            descripcion: transaccion.descripcion,
            monto: Number(transaccion.monto),
            moneda: transaccion.moneda,
            fechaPlanificada: transaccion.fechaPlanificada!,
            tipo: transaccion.tipo as 'INGRESO' | 'EGRESO'
          });
        } else {
          // Crear evento si ahora es planificada pero no tenía evento
          const googleEventId = await createGoogleCalendarEvent((session as any).accessToken, {
            descripcion: transaccion.descripcion,
            monto: Number(transaccion.monto),
            moneda: transaccion.moneda,
            fechaPlanificada: transaccion.fechaPlanificada!,
            tipo: transaccion.tipo as 'INGRESO' | 'EGRESO'
          });
          if (googleEventId) {
            await prisma.transaccion.update({
              where: { id: transaccion.id },
              data: { googleEventId }
            });
          }
        }
      } else if (existingTransaccion.googleEventId) {
        // Si dejó de ser planificada, borrar el evento
        await deleteGoogleCalendarEvent((session as any).accessToken, existingTransaccion.googleEventId);
        await prisma.transaccion.update({
          where: { id: transaccion.id },
          data: { googleEventId: null }
        });
      }
    }

    return NextResponse.json(transaccion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    console.error('Error al actualizar transacción:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const existingTransaccion = await prisma.transaccion.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existingTransaccion) {
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
    }

    // Borrar de Google Calendar si existe
    if (existingTransaccion.googleEventId && (session as any).accessToken) {
      await deleteGoogleCalendarEvent((session as any).accessToken, existingTransaccion.googleEventId);
    }

    await prisma.transaccion.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Transacción eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar transacción:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
