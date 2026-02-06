
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AsientosGenerateDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const activityOptions = [
    { value: 'FREELANCE', label: 'Freelance / Profesional Independiente' },
    { value: 'COMERCIO', label: 'Comercio Minorista / Negocio' },
    { value: 'SERVICIOS', label: 'Empresa de Servicios' },
    { value: 'CONSTRUCCION', label: 'Construcción y Refacciones' },
    { value: 'TECNOLOGIA', label: 'Software y Tecnología' },
    { value: 'PERSONAL', label: 'Finanzas Personales e Inversiones' },
];

export function AsientosGenerateDialog({ open, onClose, onSuccess }: AsientosGenerateDialogProps) {
    const [loading, setLoading] = useState(false);
    const [actividad, setActividad] = useState('');

    const handleGenerate = async () => {
        if (!actividad) {
            toast.error('Por favor selecciona una actividad');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch('/api/asientos/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipoActividad: actividad }), // actividad now holds the Enum value
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al generar el plan');
            }

            const data = await response.json();
            toast.success(`Se crearon ${data.count} asientos contables para tu actividad.`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error:', error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-yellow-500" />
                        Auto-generar Plan Contable
                    </DialogTitle>
                    <DialogDescription>
                        Gemini generará un plan de cuentas profesional estructurado con códigos jerárquicos (X-XX-XXX-XXXX) adaptado a tu actividad actual.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="actividad">Tu Actividad Principal</Label>
                        <Select onValueChange={setActividad} value={actividad}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una actividad" />
                            </SelectTrigger>
                            <SelectContent>
                                {activityOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleGenerate} disabled={loading || !actividad}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generando...
                            </>
                        ) : (
                            'Generar Plan'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
