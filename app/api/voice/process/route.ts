
import { NextResponse } from 'next/server';
import { processVoiceWithGemini } from '@/lib/gemini';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Buscar el ID de usuario si no está en la sesión (por si acaso)
        let userId = (session.user as any).id;
        if (!userId) {
            const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
            userId = user?.id;
        }

        if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Texto requerido' }, { status: 400 });
        }

        // 1. Obtener contexto actual del usuario desde la DB
        const [entities, accounts, seats] = await Promise.all([
            prisma.entidad.findMany({ where: { userId, activa: true }, select: { nombre: true } }),
            prisma.cuentaBancaria.findMany({ where: { userId, activa: true }, select: { nombre: true, banco: true } }),
            prisma.asientoContable.findMany({ where: { userId, activo: true }, select: { nombre: true, codigo: true } }),
        ]);

        // 2. Formatear contexto para Gemini
        const context = {
            entities: entities.map(e => e.nombre),
            accounts: accounts.map(a => `${a.nombre} (${a.banco})`),
            seats: seats.map(s => s.nombre),
        };

        // 3. Procesar con Gemini pasando el contexto dinámico
        const data = await processVoiceWithGemini(text, context);

        if (!data) {
            return NextResponse.json({ error: 'No se pudo procesar el audio con IA' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error en API de voz:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
