
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

    // El evento es un recordatorio para todo el día o una hora específica
    // Usamos la fecha planificada
    const eventDate = new Date(transaction.fechaPlanificada);
    const dateStr = eventDate.toISOString().split('T')[0];

    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary,
                description,
                start: {
                    date: dateStr,
                },
                end: {
                    date: dateStr,
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 60 * 9 }, // 9 horas antes (mañana del día)
                        { method: 'email', minutes: 24 * 60 }, // 1 día antes
                    ],
                },
            },
        });

        return response.data;
    } catch (error) {
        console.error('Error creando evento en Google Calendar:', error);
        throw error;
    }
}
