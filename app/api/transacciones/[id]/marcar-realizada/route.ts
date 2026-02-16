
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { fechaReal } = body;

    // Verificar que la transacción existe y pertenece al usuario
    const transaccionExistente = await prisma.transaccion.findFirst({
      where: {
        id,
        userId: session.user.id,
        estado: 'PLANIFICADA',
      },
    });

    if (!transaccionExistente) {
      return NextResponse.json({
        error: 'Transacción no encontrada o ya fue marcada como realizada'
      }, { status: 404 });
    }

    // Marcar como realizada
    const transaccionActualizada = await prisma.transaccion.update({
      where: { id },
      data: {
        estado: 'REAL',
        fecha: new Date(fechaReal || new Date()),
      },
      include: {
        entidad: true,
        cuentaBancaria: true,
        asientoContable: true,
      },
    });

    // Sincronizar con Google Calendar si tenía un evento vinculado
    if (transaccionExistente.googleEventId && (session as any).accessToken) {
      try {
        const { deleteGoogleCalendarEvent } = await import('@/lib/calendar');
        await deleteGoogleCalendarEvent((session as any).accessToken, transaccionExistente.googleEventId);

        // Limpiamos el ID del evento ya que ya no existe en Google
        await prisma.transaccion.update({
          where: { id },
          data: { googleEventId: null }
        });
      } catch (calErr) {
        console.error('Error al eliminar evento de Google Calendar:', calErr);
        // No bloqueamos el proceso principal si falla la eliminación en Google
      }
    }

    return NextResponse.json({
      success: true,
      transaccion: transaccionActualizada,
    });
  } catch (error) {
    console.error('Error al marcar transacción como realizada:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
