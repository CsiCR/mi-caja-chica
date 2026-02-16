
'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { parseISO, isSameDay } from 'date-fns';

export function GlobalNotificationHandler() {
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status !== 'authenticated') return;

        const checkVencimientos = async () => {
            try {
                // Verificar si ya notificamos hoy
                const hoyStr = new Date().toDateString();
                const ultimaNotificacion = localStorage.getItem('last_notification_date');

                if (ultimaNotificacion === hoyStr) {
                    console.log('Notificación ya enviada hoy.');
                    return;
                }

                // Consultar vencimientos para hoy (endpoint ligero o específico si existiera)
                // Por ahora usaremos el endpoint de reportes pero pidiendo solo lo necesario
                const res = await fetch('/api/reportes/vencimientos?periodos=1&soloVencidas=false');
                if (!res.ok) return;

                const data = await res.json();
                const hoy = new Date();

                const tienePendientesHoy = data.grupos.some((g: any) =>
                    g.transacciones.some((t: any) => {
                        const fechaPlan = new Date(t.fechaPlanificada);
                        // Comparamos solo la fecha (día, mes, año)
                        return t.estado === 'PLANIFICADA' &&
                            fechaPlan.getUTCDate() === hoy.getUTCDate() &&
                            fechaPlan.getUTCMonth() === hoy.getUTCMonth() &&
                            fechaPlan.getUTCFullYear() === hoy.getUTCFullYear();
                    })
                );

                if (tienePendientesHoy && "Notification" in window && Notification.permission === "granted") {
                    new Notification("Mi Caja Chica", {
                        body: "Tienes vencimientos programados para hoy. ¡No olvides revisarlos!",
                        icon: "/app-icon.png",
                        badge: "/app-icon.png",
                        tag: "vencimiento-hoy"
                    });

                    localStorage.setItem('last_notification_date', hoyStr);
                }
            } catch (error) {
                console.error('Error en GlobalNotificationHandler:', error);
            }
        };

        // Pequeño delay para no saturar al inicio
        const timeout = setTimeout(checkVencimientos, 5000);
        return () => clearTimeout(timeout);
    }, [status]);

    return null;
}
