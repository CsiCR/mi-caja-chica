
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
            recog.interimResults = false;

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
                    toast.error('Permiso de micrófono denegado.');
                } else {
                    toast.error('Error al escuchar. Intenta de nuevo.');
                }
            };

            recog.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                console.log('Escuchado:', transcript);
                toast.success(`" ${transcript} "`);
                onDataDetected({ description: transcript });
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
            recognition.stop();
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
