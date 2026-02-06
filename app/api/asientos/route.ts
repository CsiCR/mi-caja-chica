
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
import { Prisma } from '@prisma/client';

const AsientoContableSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20, 'El código no puede exceder 20 caracteres'),
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede exceder 100 caracteres'),
  descripcion: z.string().optional(),
  activo: z.boolean().default(true),
  entidadId: z.string().optional().nullable().transform(val => val === 'none' ? null : val),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const activo = searchParams.get('activo');
    const entidadId = searchParams.get('entidadId');
    const clase = searchParams.get('clase'); // e.g., "1"
    const mayor = searchParams.get('mayor'); // e.g., "1.1"
    const subcuenta = searchParams.get('subcuenta'); // e.g., "1.1.01"
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50'); // Increased default limit for accounts

    const where: Prisma.AsientoContableWhereInput = {
      userId: session.user.id,
      ...(search && {
        OR: [
          { codigo: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { nombre: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { descripcion: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
      ...(activo !== null && { activo: activo === 'true' }),
      ...(entidadId && { entidadId }),
      ...(clase && { codigo: { startsWith: clase } }),
      ...(mayor && { codigo: { startsWith: mayor } }),
      ...(subcuenta && { codigo: { startsWith: subcuenta } }),
    };

    const [asientos, total] = await Promise.all([
      prisma.asientoContable.findMany({
        where,
        orderBy: { codigo: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.asientoContable.count({ where }),
    ]);

    return NextResponse.json({
      asientos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error al obtener asientos:', error);
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
    const validatedData = AsientoContableSchema.parse(body);

    // Verificar que el código no exista para este usuario
    const existingAsiento = await prisma.asientoContable.findFirst({
      where: {
        userId: session.user.id,
        codigo: validatedData.codigo
      },
    });

    if (existingAsiento) {
      return NextResponse.json({ error: 'Ya existe un asiento con este código' }, { status: 400 });
    }

    const asiento = await prisma.asientoContable.create({
      data: {
        ...validatedData,
        userId: session.user.id,
      },
    });

    return NextResponse.json(asiento, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    console.error('Error al crear asiento:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { ids, activo } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Se requieren IDs para la actualización' }, { status: 400 });
    }

    const result = await prisma.asientoContable.updateMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
      },
      data: {
        activo: !!activo,
      },
    });

    return NextResponse.json({
      message: 'Actualización exitosa',
      count: result.count
    });
  } catch (error) {
    console.error('Error en bulk update de asientos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
