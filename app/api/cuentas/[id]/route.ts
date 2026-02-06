
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const CuentaBancariaUpdateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede exceder 100 caracteres'),
  banco: z.string().min(1, 'El banco es requerido').max(50, 'El banco no puede exceder 50 caracteres'),
  numeroCuenta: z.string().optional(),
  tipoCuenta: z.string().optional(),
  moneda: z.enum(['ARS', 'USD']),
  activa: z.boolean(),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CuentaBancariaUpdateSchema.parse(body);

    const existingCuenta = await prisma.cuentaBancaria.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existingCuenta) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    const cuenta = await prisma.cuentaBancaria.update({
      where: { id: params.id },
      data: validatedData,
    });

    return NextResponse.json(cuenta);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    console.error('Error al actualizar cuenta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const existingCuenta = await prisma.cuentaBancaria.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existingCuenta) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    // Verificar si tiene transacciones asociadas
    const transaccionesCount = await prisma.transaccion.count({
      where: { cuentaBancariaId: params.id },
    });

    if (transaccionesCount > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar la cuenta porque tiene transacciones asociadas. Puede desactivarla en su lugar.' 
      }, { status: 400 });
    }

    await prisma.cuentaBancaria.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Cuenta eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
