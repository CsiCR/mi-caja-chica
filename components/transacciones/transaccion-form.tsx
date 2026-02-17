
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
        fecha: new Date(new Date(data.fecha).setHours(12, 0, 0, 0)).toISOString(),
        fechaPlanificada: data.fechaPlanificada ? new Date(new Date(data.fechaPlanificada).setHours(12, 0, 0, 0)).toISOString() : undefined,
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
    // Si viene del parser local (fallback), lo usamos por ahora como display
    // Pero aquí interceptamos para llamar a la API de Gemini
    try {
      const textToProcess = localData.description || '';
      if (!textToProcess) {
        console.warn('⚠️ Texto vacío recibido del micrófono');
        return;
      }

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
        const match = asientos.find(a => {
          const n = normalizeString(a.nombre);
          const cod = a.codigo ? normalizeString(a.codigo) : "";
          return keyword === n || keyword === cod ||
            n.includes(keyword) || (cod && cod.includes(keyword)) ||
            keyword.includes(n) || (cod && keyword.includes(cod));
        });
        if (match) form.setValue('asientoContableId', match.id);
      }

      // 2. Matcheo de Cuenta Bancaria (Bancos)
      if (aiData.bankKeyword) {
        const keyword = normalizeString(aiData.bankKeyword);
        const match = cuentas.find(c => {
          const n = normalizeString(c.nombre);
          const b = c.banco ? normalizeString(c.banco) : "";
          const full = normalizeString(`${c.nombre} (${c.banco})`);
          return keyword === n || keyword === b || keyword === full ||
            n.includes(keyword) || b.includes(keyword) ||
            keyword.includes(n) || (b && keyword.includes(b));
        });
        if (match) form.setValue('cuentaBancariaId', match.id);
      }

      // 3. Matcheo de Entidad
      if (aiData.entityKeyword) {
        const keyword = normalizeString(aiData.entityKeyword);
        const match = entidades.find(e => {
          const n = normalizeString(e.nombre);
          return keyword === n || n.includes(keyword) || keyword.includes(n);
        });
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
      <DialogContent className="sm:max-w-[550px] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="mb-2 sm:mb-4">
          <DialogTitle className="text-xl sm:text-2xl">
            {isEditing ? 'Editar Transacción' : 'Nueva Transacción'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isEditing
              ? 'Modifica los datos de la transacción seleccionada.'
              : 'Registra una nueva transacción financiera.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between bg-secondary/20 p-2 sm:p-3 rounded-lg mb-3 sm:mb-4">
          <span className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-1 sm:gap-2">
            🎙️ Carga rápida por voz
          </span>
          <VoiceInput onDataDetected={handleVoiceData} />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="entidadId"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs sm:text-sm">Entidad *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger autoFocus className="h-9 sm:h-10 text-xs sm:text-sm">
                          <SelectValue placeholder="Selecciona entidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {entidades.map((entidad) => (
                          <SelectItem key={entidad.id} value={entidad.id} className="text-xs sm:text-sm">
                            {entidad.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] sm:text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cuentaBancariaId"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs sm:text-sm">Cuenta Bancaria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                          <SelectValue placeholder="Selecciona cuenta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cuentas.map((cuenta) => (
                          <SelectItem key={cuenta.id} value={cuenta.id} className="text-xs sm:text-sm">
                            {cuenta.nombre} - {cuenta.banco}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] sm:text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs sm:text-sm">Descripción *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Venta de producto, Pago de servicios..."
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] sm:text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs sm:text-sm">Monto *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] sm:text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="moneda"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs sm:text-sm">Moneda *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                          <SelectValue placeholder="Moneda" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ARS" className="text-xs sm:text-sm">ARS</SelectItem>
                        <SelectItem value="USD" className="text-xs sm:text-sm">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] sm:text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs sm:text-sm">Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INGRESO" className="text-xs sm:text-sm">Ingreso</SelectItem>
                        <SelectItem value="EGRESO" className="text-xs sm:text-sm">Egreso</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] sm:text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs sm:text-sm">Estado *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="REAL" className="text-xs sm:text-sm">Real</SelectItem>
                        <SelectItem value="PLANIFICADA" className="text-xs sm:text-sm">Planif.</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] sm:text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="asientoContableId"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs sm:text-sm">Asiento Contable *</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSuggestAsiento}
                      disabled={suggesting}
                      className="h-6 sm:h-7 text-[10px] sm:text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-1 sm:px-2"
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
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Selecciona asiento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {asientos.map((asiento) => (
                        <SelectItem key={asiento.id} value={asiento.id} className="text-xs sm:text-sm">
                          {asiento.codigo} - {asiento.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[10px] sm:text-xs" />
                </FormItem>
              )}
            />

            <div className={`grid grid-cols-1 ${estado === 'PLANIFICADA' ? 'sm:grid-cols-2' : ''} gap-3 sm:gap-4`}>
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs sm:text-sm flex items-center gap-2">
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
                        className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] sm:text-xs" />
                  </FormItem>
                )}
              />

              {estado === 'PLANIFICADA' && (
                <FormField
                  control={form.control}
                  name="fechaPlanificada"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs sm:text-sm flex items-center gap-2">
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
                          className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] sm:text-xs" />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="comentario"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs sm:text-sm">Comentario</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Información adicional sobre la transacción..."
                      className="resize-none text-xs sm:text-sm"
                      rows={1}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] sm:text-xs" />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-4 sm:mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleClose} className="h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto">
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
