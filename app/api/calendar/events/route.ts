
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listGoogleCalendarEvents } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions) as any;

        if (!session?.user?.id || !session?.accessToken) {
            return NextResponse.json({ error: 'No vinculado con Google' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const timeMin = searchParams.get('timeMin')
            ? new Date(searchParams.get('timeMin')!)
            : new Date();
        const timeMax = searchParams.get('timeMax')
            ? new Date(searchParams.get('timeMax')!)
            : new Date(new Date().setMonth(new Date().getMonth() + 3));

        const events = await listGoogleCalendarEvents(
            session.accessToken,
            timeMin,
            timeMax
        );

        console.log(`API Google Calendar: Recuperados ${events.length} eventos para el usuario ${session.user.id}`);

        return NextResponse.json({ events });
    } catch (error: any) {
        console.error('Error en API Google Calendar:', error);

        // Si el error es un 401 de Google, probablemente el token expiró
        if (error.code === 401) {
            return NextResponse.json({ error: 'Token expirado o inválido' }, { status: 401 });
        }

        return NextResponse.json({ error: 'Error al obtener eventos' }, { status: 500 });
    }
}
