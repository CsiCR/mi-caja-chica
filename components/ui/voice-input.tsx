
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
        // Verificar soporte del navegador (común en Chrome/Android)
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            setBrowserSupportsSpeech(true);
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recog = new SpeechRecognition();
            recog.continuous = false;
            recog.lang = 'es-AR'; // Español Argentina
            recog.interimResults = false;

            recog.onstart = () => setIsListening(true);

            recog.onend = () => setIsListening(false);

            recog.onerror = (event: any) => {
                console.error('Error de voz:', event.error);
                setIsListening(false);
                toast.error('Error al escuchar. Intenta de nuevo.');
            };

            recog.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                console.log('Escuchado:', transcript);
                toast.success(`" ${transcript} "`);

                // Enviar texto crudo para que el padre decida cómo procesarlo (IA o Local)
                onDataDetected({ description: transcript });
            };

            setRecognition(recog);
        }
    }, [onDataDetected]);

    const toggleListening = () => {
        if (!recognition) return;

        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (e) {
                console.error(e);
            }
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
