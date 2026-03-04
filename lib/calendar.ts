
import { google } from 'googleapis';

export async function createGoogleCalendarEvent(
    accessToken: string,
    transaction: {
        descripcion: string;
        monto: number;
        moneda: string;
        fechaPlanificada: Date;
        tipo: 'INGRESO' | 'EGRESO';
        entidadNombre?: string;
    }
) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth });

    const summary = `${transaction.entidadNombre ? `[${transaction.entidadNombre}] ` : ''}${transaction.tipo === 'INGRESO' ? '💰 Cobro' : '💸 Pago'}: ${transaction.descripcion}`;
    const description = `Monto: ${transaction.monto} ${transaction.moneda}\nEntidad: ${transaction.entidadNombre || 'N/A'}\nRegistrado en Mi Caja Chica.`;

    const y = transaction.fechaPlanificada.getFullYear();
    const m = String(transaction.fechaPlanificada.getMonth() + 1).padStart(2, '0');
    const d = String(transaction.fechaPlanificada.getDate()).padStart(2, '0');

    // Crear strings ISO para las 9:00 AM y 10:00 AM en la zona horaria local
    const startDateTime = `${y}-${m}-${d}T09:00:00`;
    const endDateTime = `${y}-${m}-${d}T10:00:00`;

    const requestBody = {
        summary,
        description,
        start: {
            dateTime: startDateTime,
            timeZone: 'America/Argentina/Buenos_Aires'
        },
        end: {
            dateTime: endDateTime,
            timeZone: 'America/Argentina/Buenos_Aires'
        },
        colorId: transaction.tipo === 'INGRESO' ? '10' : '11', // 10: Basil (Verde), 11: Tomato (Rojo)
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 0 }, // A las 9:00 AM del mismo día
                { method: 'email', minutes: 12 * 60 }, // 12 horas antes de las 9:00 AM (9:00 PM del día anterior)
            ],
        },
    };


    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody,
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
        entidadNombre?: string;
    }
) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth });

    const summary = `${transaction.entidadNombre ? `[${transaction.entidadNombre}] ` : ''}${transaction.tipo === 'INGRESO' ? '💰 Cobro' : '💸 Pago'}: ${transaction.descripcion}`;
    const description = `Monto: ${transaction.monto} ${transaction.moneda}\nEntidad: ${transaction.entidadNombre || 'N/A'}\nRegistrado en Mi Caja Chica.`;

    const y = transaction.fechaPlanificada.getFullYear();
    const m = String(transaction.fechaPlanificada.getMonth() + 1).padStart(2, '0');
    const d = String(transaction.fechaPlanificada.getDate()).padStart(2, '0');

    const startDateTime = `${y}-${m}-${d}T09:00:00`;
    const endDateTime = `${y}-${m}-${d}T10:00:00`;

    const requestBody = {
        summary,
        description,
        start: {
            dateTime: startDateTime,
            timeZone: 'America/Argentina/Buenos_Aires'
        },
        end: {
            dateTime: endDateTime,
            timeZone: 'America/Argentina/Buenos_Aires'
        },
        colorId: transaction.tipo === 'INGRESO' ? '10' : '11',
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 0 },
                { method: 'email', minutes: 12 * 60 },
            ],
        },
    };


    try {
        await calendar.events.update({
            calendarId: 'primary',
            eventId,
            requestBody,
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

export async function listGoogleCalendarEvents(
    accessToken: string,
    timeMin: Date,
    timeMax: Date
) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth });

    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        return response.data.items || [];
    } catch (error) {
        console.error('Error listando eventos de Google Calendar:', error);
        throw error;
    }
}
