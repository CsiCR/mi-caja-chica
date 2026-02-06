
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { suggestAsientoWithGemini, suggestNewAsientoWithGemini } from '@/lib/gemini';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { transaccion, actividad, propositos, entidad, isCreation, proposito } = await req.json();

        if (isCreation) {
            if (!proposito) {
                return NextResponse.json({ error: 'Propósito requerido para sugerencia' }, { status: 400 });
            }

            // Obtener todos los códigos existentes del usuario para evitar duplicidades
            const cuentasExistentes = await prisma.asientoContable.findMany({
                where: { userId: session.user.id },
                select: { codigo: true }
            });
            const codigosExistentes = cuentasExistentes.map(c => c.codigo);

            const suggestion = await suggestNewAsientoWithGemini(
                proposito,
                entidad || '',
                actividad || 'General',
                codigosExistentes
            );

            if (!suggestion) {
                return NextResponse.json({ error: 'No se pudo generar la sugerencia con IA' }, { status: 500 });
            }

            return NextResponse.json(suggestion);
        }

        if (!transaccion || !transaccion.descripcion) {
            return NextResponse.json({ error: 'Descripción de transacción requerida' }, { status: 400 });
        }

        // Obtener asientos del usuario
        const asientos = await prisma.asientoContable.findMany({
            where: { userId: session.user.id, activo: true },
            select: { id: true, codigo: true, nombre: true }
        });

        if (asientos.length === 0) {
            return NextResponse.json({ error: 'No hay asientos contables definidos' }, { status: 400 });
        }

        const suggestionId = await suggestAsientoWithGemini(transaccion, actividad, asientos, entidad);

        if (!suggestionId) {
            return NextResponse.json({ error: 'No se pudo obtener sugerencia' }, { status: 500 });
        }

        return NextResponse.json({ asientoId: suggestionId });

    } catch (error) {
        console.error('Error en API de sugerencia:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
