
'use client';

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

interface VoiceInputProps {
    onDataDetected: (data: { description: string }) => void;
}

export function VoiceInput({ onDataDetected }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [browserSupportsSpeech, setBrowserSupportsSpeech] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            setBrowserSupportsSpeech(true);
        }
    }, []);

    const startListening = () => {
        if (typeof window === 'undefined') return;

        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                toast.error('Tu navegador no soporta dictado por voz.');
                return;
            }

            const recog = new SpeechRecognition();
            recog.continuous = false;
            recog.lang = 'es-AR';
            // CRÍTICO para iOS Safari: Sin interimResults=true, a menudo no se dispara onresult
            recog.interimResults = true;

            recog.onstart = () => {
                setIsListening(true);
            };

            recog.onend = () => {
                setIsListening(false);
            };

            recog.onerror = (event: any) => {
                console.error('Error de voz:', event.error);
                setIsListening(false);

                if (event.error === 'not-allowed') {
                    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                        toast.error('El micrófono requiere una conexión segura (HTTPS).');
                    } else {
                        toast.error('Permiso de micrófono denegado. Revisa la configuración del sitio.');
                    }
                } else if (event.error === 'network') {
                    toast.error('Error de red. Asegúrate de tener conexión a internet.');
                } else if (event.error === 'service-not-allowed') {
                    toast.error('Servicio de dictado no disponible. Verifica si Siri está activo.');
                } else {
                    toast.error('Error al escuchar. Intenta de nuevo.');
                }
            };

            let finalTranscript = '';
            recog.onresult = (event: any) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    console.log('Escuchado (Final):', finalTranscript);
                    toast.success(`" ${finalTranscript} "`);
                    onDataDetected({ description: finalTranscript });
                    recog.stop(); // Detener después de obtener el resultado final
                }
            };

            recog.start();
            setRecognition(recog);
        } catch (e) {
            console.error('Error iniciando reconocimiento:', e);
            toast.error('No se pudo iniciar el micrófono.');
        }
    };

    const toggleListening = () => {
        if (isListening && recognition) {
            try {
                recognition.stop();
            } catch (err) {
                console.error('Error al detener recognition:', err);
            }
        } else {
            startListening();
        }
    };

    if (!browserSupportsSpeech) {
        return null; // Ocultar si no hay soporte
    }

    return (
        <Button
            type="button"
            variant={isListening ? "destructive" : "secondary"}
            size="icon"
            className={`rounded-full w-12 h-12 shadow-md transition-all ${isListening ? 'animate-pulse scale-110' : ''}`}
            onClick={toggleListening}
            title="Dictar transacción"
        >
            {isListening ? <Loader2 className="h-6 w-6 animate-spin" /> : <Mic className="h-6 w-6" />}
        </Button>
    );
}
