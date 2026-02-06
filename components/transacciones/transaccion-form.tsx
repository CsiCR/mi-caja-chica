
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Sparkles, Loader2 } from 'lucide-react';
import { Transaccion } from './transacciones-list';
import toast from 'react-hot-toast';
import { VoiceInput } from '@/components/ui/voice-input';

const formSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es requerida').max(255, 'La descripción no puede exceder 255 caracteres'),
  monto: z.string().min(1, 'El monto es requerido').refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'El monto debe ser mayor a 0'),
  moneda: z.enum(['ARS', 'USD']),
  tipo: z.enum(['INGRESO', 'EGRESO']),
  estado: z.enum(['REAL', 'PLANIFICADA']),
  fecha: z.date({ required_error: 'La fecha es requerida' }),
  fechaPlanificada: z.date().optional(),
  comentario: z.string().optional(),
  entidadId: z.string().min(1, 'La entidad es requerida'),
  cuentaBancariaId: z.string().min(1, 'La cuenta bancaria es requerida'),
  asientoContableId: z.string().min(1, 'El asiento contable es requerido'),
});

type FormData = z.infer<typeof formSchema>;

interface TransaccionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaccion?: Transaccion;
}

interface SelectOption {
  id: string;
  nombre: string;
  activa?: boolean;
  activo?: boolean;
  banco?: string;
  codigo?: string;
}

export function TransaccionForm({ open, onClose, onSuccess, transaccion }: TransaccionFormProps) {
  const [loading, setLoading] = useState(false);
  const [entidades, setEntidades] = useState<SelectOption[]>([]);
  const [cuentas, setCuentas] = useState<SelectOption[]>([]);
  const [asientos, setAsientos] = useState<SelectOption[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const isEditing = !!transaccion;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descripcion: transaccion?.descripcion || '',
      monto: transaccion?.monto?.toString() || '',
      moneda: transaccion?.moneda || 'ARS',
      tipo: transaccion?.tipo || 'INGRESO',
      estado: transaccion?.estado || 'REAL',
      fecha: transaccion?.fecha ? new Date(transaccion.fecha) : new Date(),
      fechaPlanificada: transaccion?.fechaPlanificada ? new Date(transaccion.fechaPlanificada) : undefined,
      comentario: transaccion?.comentario || '',
      entidadId: transaccion?.entidad?.id || '',
      cuentaBancariaId: transaccion?.cuentaBancaria?.id || '',
      asientoContableId: transaccion?.asientoContable?.id || '',
    },
  });

  const estado = form.watch('estado');

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [entidadesRes, cuentasRes, asientosRes] = await Promise.all([
          fetch('/api/entidades?limit=1000&activa=true'),
          fetch('/api/cuentas?limit=1000&activa=true'),
          fetch('/api/asientos?limit=1000&activo=true'),
        ]);

        const [entidadesData, cuentasData, asientosData] = await Promise.all([
          entidadesRes.json(),
          cuentasRes.json(),
          asientosRes.json(),
        ]);

        setEntidades(entidadesData.entidades || []);
        setCuentas(cuentasData.cuentas || []);
        setAsientos(asientosData.asientos || []);
      } catch (error) {
        console.error('Error al cargar opciones:', error);
        toast.error('Error al cargar las opciones del formulario');
      }
    };

    if (open) {
      fetchOptions();
    }
  }, [open]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const submitData = {
        ...data,
        monto: parseFloat(data.monto),
        fecha: data.fecha.toISOString(),
        fechaPlanificada: data.fechaPlanificada?.toISOString(),
      };

      const url = isEditing ? `/api/transacciones/${transaccion.id}` : '/api/transacciones';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar la transacción');
      }

      onSuccess();
      form.reset();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar la transacción');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleVoiceData = async (localData: { description: string }) => {
    console.log('🎤 handleVoiceData activado con:', localData);
    // Si viene del parser local (fallback), lo usamos por ahora como display
    // Pero aquí interceptamos para llamar a la API de Gemini
    try {
      const textToProcess = localData.description || '';
      if (!textToProcess) {
        console.warn('⚠️ Texto vacío recibido del micrófono');
        return;
      }

      console.log('🚀 Iniciando petición a Gemini...');
      toast.loading('Procesando con IA...', { id: 'voice-process' });

      const response = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToProcess })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error API (${response.status}): ${errorText}`);
      }

      const normalizeString = (str: string) =>
        str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      const aiData = await response.json();
      console.log('🤖 Respuesta de IA:', aiData);

      // Usar datos de IA (Gemini)
      if (aiData.description) form.setValue('descripcion', aiData.description);
      if (aiData.amount) form.setValue('monto', aiData.amount.toString());
      if (aiData.currency) form.setValue('moneda', aiData.currency);
      if (aiData.type) form.setValue('tipo', aiData.type);

      if (aiData.date) {
        const [y, m, d] = aiData.date.split('-').map(Number);
        const localDate = new Date(y, m - 1, d);
        form.setValue('fecha', localDate);
      }

      // 1. Matcheo de Asiento Contable
      if (aiData.categoryKeyword) {
        const keyword = normalizeString(aiData.categoryKeyword);
        const match = asientos.find(a =>
          normalizeString(a.nombre).includes(keyword) ||
          (a.codigo && normalizeString(a.codigo).includes(keyword))
        );
        if (match) form.setValue('asientoContableId', match.id);
      }

      // 2. Matcheo de Cuenta Bancaria (Bancos)
      if (aiData.bankKeyword) {
        const keyword = normalizeString(aiData.bankKeyword);
        const match = cuentas.find(c =>
          normalizeString(c.nombre).includes(keyword) ||
          (c.banco && normalizeString(c.banco).includes(keyword))
        );
        if (match) form.setValue('cuentaBancariaId', match.id);
      }

      // 3. Matcheo de Entidad
      if (aiData.entityKeyword) {
        const keyword = normalizeString(aiData.entityKeyword);
        const match = entidades.find(e => normalizeString(e.nombre).includes(keyword));
        if (match) form.setValue('entidadId', match.id);
      }

      toast.success('Datos procesados con IA', { id: 'voice-process' });

    } catch (e: any) {
      console.error('❌ Error en handleVoiceData:', e);
      toast.error(`Error IA: ${e.message}`, { id: 'voice-process' });
      // Fallback: Usar lo que vino del parser local si falla la API
      if (localData.description) form.setValue('descripcion', localData.description);
    }
  };

  const handleSuggestAsiento = async () => {
    const descripcion = form.getValues('descripcion');
    const entidadId = form.getValues('entidadId');
    if (!descripcion) {
      toast.error('Ingresa una descripción para obtener una sugerencia');
      return;
    }

    try {
      setSuggesting(true);
      const entidad = entidades.find(e => e.id === entidadId)?.nombre || '';

      const response = await fetch('/api/asientos/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaccion: { descripcion, tipo: form.getValues('tipo') },
          actividad: 'Actividad del usuario',
          entidad
        })
      });

      if (!response.ok) throw new Error('Error al obtener sugerencia');

      const { asientoId } = await response.json();
      if (asientoId) {
        form.setValue('asientoContableId', asientoId);
        toast.success('Asiento sugerido aplicado');
      }
    } catch (error) {
      console.error('Error sugiriendo asiento:', error);
      toast.error('No se pudo obtener una sugerencia');
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Transacción' : 'Nueva Transacción'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos de la transacción seleccionada.'
              : 'Registra una nueva transacción financiera.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between bg-secondary/20 p-3 rounded-lg mb-4">
          <span className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            🎙️ Carga rápida por voz
          </span>
          <VoiceInput onDataDetected={handleVoiceData} />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entidadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entidad *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger autoFocus>
                          <SelectValue placeholder="Selecciona entidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {entidades.map((entidad) => (
                          <SelectItem key={entidad.id} value={entidad.id}>
                            {entidad.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cuentaBancariaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuenta Bancaria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona cuenta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cuentas.map((cuenta) => (
                          <SelectItem key={cuenta.id} value={cuenta.id}>
                            {cuenta.nombre} - {cuenta.banco}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Venta de producto, Pago de servicios..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="moneda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona moneda" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                        <SelectItem value="USD">Dólares (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Transacción *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INGRESO">Ingreso</SelectItem>
                        <SelectItem value="EGRESO">Egreso</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="REAL">Real</SelectItem>
                        <SelectItem value="PLANIFICADA">Planificada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="asientoContableId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Asiento Contable *</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSuggestAsiento}
                      disabled={suggesting}
                      className="h-7 text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      {suggesting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Sugerencia IA
                    </Button>
                  </div>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona asiento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {asientos.map((asiento) => (
                        <SelectItem key={asiento.id} value={asiento.id}>
                          {asiento.codigo} - {asiento.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Fecha de Transacción *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                          const dateValue = e.target.value;
                          if (dateValue) {
                            const [y, m, d] = dateValue.split('-').map(Number);
                            const selectedDate = new Date(y, m - 1, d);
                            field.onChange(selectedDate);
                          } else {
                            field.onChange(null);
                          }
                        }}
                        max={format(new Date(), 'yyyy-MM-dd')}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {estado === 'PLANIFICADA' && (
                <FormField
                  control={form.control}
                  name="fechaPlanificada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Fecha Planificada
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const dateValue = e.target.value;
                            if (dateValue) {
                              const [y, m, d] = dateValue.split('-').map(Number);
                              const selectedDate = new Date(y, m - 1, d);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              if (selectedDate >= today) {
                                field.onChange(selectedDate);
                              }
                            } else {
                              field.onChange(null);
                            }
                          }}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="comentario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentario</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Información adicional sobre la transacción..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? (isEditing ? 'Actualizando...' : 'Creando...')
                  : (isEditing ? 'Actualizar' : 'Crear')
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
