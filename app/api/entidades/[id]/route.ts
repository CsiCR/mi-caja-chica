
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const EntidadUpdateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede exceder 100 caracteres'),
  descripcion: z.string().optional(),
  tipo: z.enum(['FREELANCE', 'COMERCIO', 'SERVICIOS', 'CONSTRUCCION', 'TECNOLOGIA', 'PERSONAL']),
  activa: z.boolean(),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = EntidadUpdateSchema.parse(body);

    // Verificar que la entidad pertenece al usuario
    const existingEntidad = await prisma.entidad.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existingEntidad) {
      return NextResponse.json({ error: 'Entidad no encontrada' }, { status: 404 });
    }

    const entidad = await prisma.entidad.update({
      where: { id: params.id },
      data: validatedData,
    });

    return NextResponse.json(entidad);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    console.error('Error al actualizar entidad:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que la entidad pertenece al usuario
    const existingEntidad = await prisma.entidad.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existingEntidad) {
      return NextResponse.json({ error: 'Entidad no encontrada' }, { status: 404 });
    }

    // Verificar si tiene transacciones asociadas
    const transaccionesCount = await prisma.transaccion.count({
      where: { entidadId: params.id },
    });

    if (transaccionesCount > 0) {
      return NextResponse.json({
        error: 'No se puede eliminar la entidad porque tiene transacciones asociadas. Puede desactivarla en su lugar.'
      }, { status: 400 });
    }

    await prisma.entidad.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Entidad eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar entidad:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
