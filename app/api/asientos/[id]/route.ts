
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const AsientoContableUpdateSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20, 'El código no puede exceder 20 caracteres'),
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede exceder 100 caracteres'),
  descripcion: z.string().optional(),
  activo: z.boolean().default(true),
  entidadId: z.string().optional().nullable().transform(val => val === 'none' ? null : val),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = AsientoContableUpdateSchema.parse(body);

    const existingAsiento = await prisma.asientoContable.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existingAsiento) {
      return NextResponse.json({ error: 'Asiento no encontrado' }, { status: 404 });
    }

    // Verificar que el código no exista para otro asiento del mismo usuario
    const duplicateAsiento = await prisma.asientoContable.findFirst({
      where: {
        userId: session.user.id,
        codigo: validatedData.codigo,
        id: { not: params.id }
      },
    });

    if (duplicateAsiento) {
      return NextResponse.json({ error: 'Ya existe un asiento con este código' }, { status: 400 });
    }

    const asiento = await prisma.asientoContable.update({
      where: { id: params.id },
      data: validatedData,
    });

    return NextResponse.json(asiento);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    console.error('Error al actualizar asiento:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const existingAsiento = await prisma.asientoContable.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existingAsiento) {
      return NextResponse.json({ error: 'Asiento no encontrado' }, { status: 404 });
    }

    // Verificar si tiene transacciones asociadas
    const transaccionesCount = await prisma.transaccion.count({
      where: { asientoContableId: params.id },
    });

    if (transaccionesCount > 0) {
      return NextResponse.json({
        error: 'No se puede eliminar el asiento porque tiene transacciones asociadas. Puede desactivarlo en su lugar.'
      }, { status: 400 });
    }

    await prisma.asientoContable.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Asiento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar asiento:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
