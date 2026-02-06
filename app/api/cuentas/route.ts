
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
import { Prisma } from '@prisma/client';

const CuentaBancariaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede exceder 100 caracteres'),
  banco: z.string().min(1, 'El banco es requerido').max(50, 'El banco no puede exceder 50 caracteres'),
  numeroCuenta: z.string().optional(),
  tipoCuenta: z.string().optional(),
  moneda: z.enum(['ARS', 'USD']).default('ARS'),
  activa: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const moneda = searchParams.get('moneda') || '';
    const activa = searchParams.get('activa');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: Prisma.CuentaBancariaWhereInput = {
      userId: session.user.id,
      ...(search && {
        OR: [
          { nombre: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { banco: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { numeroCuenta: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
      ...(moneda && { moneda: moneda as any }),
      ...(activa !== null && { activa: activa === 'true' }),
    };

    const [cuentas, total] = await Promise.all([
      prisma.cuentaBancaria.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cuentaBancaria.count({ where }),
    ]);

    return NextResponse.json({
      cuentas,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error al obtener cuentas:', error);
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
    const validatedData = CuentaBancariaSchema.parse(body);

    const cuenta = await prisma.cuentaBancaria.create({
      data: {
        ...validatedData,
        userId: session.user.id,
      },
    });

    return NextResponse.json(cuenta, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    console.error('Error al crear cuenta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
