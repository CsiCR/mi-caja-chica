
import { google } from 'googleapis';

export async function createGoogleCalendarEvent(
    accessToken: string,
    transaction: {
        descripcion: string;
        monto: number;
        moneda: string;
        fechaPlanificada: Date;
        tipo: 'INGRESO' | 'EGRESO';
    }
) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth });

    const summary = `${transaction.tipo === 'INGRESO' ? '💰 Cobro' : '💸 Pago'}: ${transaction.descripcion}`;
    const description = `Monto: ${transaction.monto} ${transaction.moneda}\nRegistrado en Mi Caja Chica.`;

    const eventDate = new Date(transaction.fechaPlanificada);
    const dateStr = eventDate.toISOString().split('T')[0];

    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary,
                description,
                start: { date: dateStr },
                end: { date: dateStr },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 60 * 9 },
                        { method: 'email', minutes: 24 * 60 },
                    ],
                },
            },
        });

        return response.data.id;
    } catch (error) {
        console.error('Error creando evento en Google Calendar:', error);
        throw error;
    }
}

export async function updateGoogleCalendarEvent(
    accessToken: string,
    eventId: string,
    transaction: {
        descripcion: string;
        monto: number;
        moneda: string;
        fechaPlanificada: Date;
        tipo: 'INGRESO' | 'EGRESO';
    }
) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth });

    const summary = `${transaction.tipo === 'INGRESO' ? '💰 Cobro' : '💸 Pago'}: ${transaction.descripcion}`;
    const description = `Monto: ${transaction.monto} ${transaction.moneda}\nRegistrado en Mi Caja Chica.`;

    const eventDate = new Date(transaction.fechaPlanificada);
    const dateStr = eventDate.toISOString().split('T')[0];

    try {
        await calendar.events.update({
            calendarId: 'primary',
            eventId,
            requestBody: {
                summary,
                description,
                start: { date: dateStr },
                end: { date: dateStr },
            },
        });
    } catch (error) {
        console.error('Error actualizando evento en Google Calendar:', error);
        // No lanzamos error para no bloquear la app si el evento fue borrado manualmente en Calendar
    }
}

export async function deleteGoogleCalendarEvent(accessToken: string, eventId: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth });

    try {
        await calendar.events.delete({
            calendarId: 'primary',
            eventId,
        });
    } catch (error) {
        console.error('Error eliminando evento en Google Calendar:', error);
    }
}
