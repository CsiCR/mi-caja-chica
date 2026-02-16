
'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import toast from 'react-hot-toast';

export function NotificationBell() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        const isSupported = 'Notification' in window;
        setSupported(isSupported);
        if (isSupported) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if (!supported) return;

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                toast.success('¡Notificaciones activadas!');
                // Opcional: Enviar una notificación de prueba
                new Notification("Mi Caja Chica", {
                    body: "¡Genial! Ahora te avisaremos de tus próximos vencimientos.",
                    icon: "/app-icon.png"
                });
            } else if (result === 'denied') {
                toast.error('Notificaciones bloqueadas. Por favor, actívalas en la configuración de tu navegador.');
            }
        } catch (error) {
            console.error('Error al solicitar permisos:', error);
            toast.error('No se pudieron activar las notificaciones.');
        }
    };

    if (!supported) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-9 w-9 rounded-full"
                        onClick={requestPermission}
                    >
                        {permission === 'granted' ? (
                            <Bell className="h-5 w-5 text-green-600" />
                        ) : permission === 'denied' ? (
                            <BellOff className="h-5 w-5 text-red-400" />
                        ) : (
                            <div className="relative">
                                <BellRing className="h-5 w-5 text-orange-500 animate-pulse" />
                                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                            </div>
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs">
                        {permission === 'granted'
                            ? 'Notificaciones activadas'
                            : permission === 'denied'
                                ? 'Notificaciones bloqueadas'
                                : 'Haz clic para activar recordatorios de vencimientos'}
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
