
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const entidadId = searchParams.get('entidadId');
        const cuentaBancariaId = searchParams.get('cuentaBancariaId');
        const incluirPlanificadas = searchParams.get('incluirPlanificadas') === 'true';

        if (!entidadId || !cuentaBancariaId) {
            return NextResponse.json({ error: 'Entidad y Cuenta son requeridas' }, { status: 400 });
        }

        const transacciones = await prisma.transaccion.findMany({
            where: {
                userId: session.user.id,
                entidadId,
                cuentaBancariaId,
                ...(incluirPlanificadas ? {} : { estado: 'REAL' }),
            },
            include: {
                entidad: true,
                cuentaBancaria: true,
                asientoContable: true,
            },
            orderBy: {
                fecha: 'desc',
            },
        });

        return NextResponse.json(transacciones);
    } catch (error) {
        console.error('Error al obtener detalle de saldos:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
