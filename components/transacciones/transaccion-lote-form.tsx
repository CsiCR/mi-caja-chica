
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Copy, Sparkles, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { VoiceInput } from '@/components/ui/voice-input';

const transaccionSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es requerida'),
  monto: z.string().min(1, 'El monto es requerido').refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'El monto debe ser mayor a 0'),
  moneda: z.enum(['ARS', 'USD']),
  tipo: z.enum(['INGRESO', 'EGRESO']),
  fecha: z.date({ required_error: 'La fecha de transacción es requerida' }),
  fechaPlanificada: z.date({ required_error: 'La fecha planificada es requerida' }),
  comentario: z.string().optional(),
  entidadId: z.string().min(1, 'La entidad es requerida'),
  cuentaBancariaId: z.string().min(1, 'La cuenta bancaria es requerida'),
  asientoContableId: z.string().min(1, 'El asiento contable es requerido'),
});

const formSchema = z.object({
  transacciones: z.array(transaccionSchema).min(1, 'Debe agregar al menos una transacción'),
});

type FormData = z.infer<typeof formSchema>;

interface TransaccionLoteFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SelectOption {
  id: string;
  nombre: string;
  activa?: boolean;
  activo?: boolean;
  banco?: string;
  codigo?: string;
}

export function TransaccionLoteForm({ open, onClose, onSuccess }: TransaccionLoteFormProps) {
  const [loading, setLoading] = useState(false);
  const [entidades, setEntidades] = useState<SelectOption[]>([]);
  const [cuentas, setCuentas] = useState<SelectOption[]>([]);
  const [asientos, setAsientos] = useState<SelectOption[]>([]);
  const [intervaloDias, setIntervaloDias] = useState(30);
  const [suggestingIndex, setSuggestingIndex] = useState<number | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transacciones: [
        {
          descripcion: '',
          monto: '',
          moneda: 'ARS',
          tipo: 'INGRESO',
          fecha: new Date(), // Fecha actual para transacción
          fechaPlanificada: new Date(),
          comentario: '',
          entidadId: '',
          cuentaBancariaId: '',
          asientoContableId: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'transacciones',
  });

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
      console.log('Enviando datos:', data); // Debug

      // Validar que todas las transacciones tengan los campos requeridos
      const transaccionesInvalidas = data.transacciones.filter(t =>
        !t.descripcion || !t.monto || !t.entidadId || !t.cuentaBancariaId || !t.asientoContableId || !t.fecha || !t.fechaPlanificada
      );

      if (transaccionesInvalidas.length > 0) {
        throw new Error('Todas las transacciones deben tener los campos obligatorios completos');
      }

      const submitData = {
        transacciones: data.transacciones.map(t => ({
          descripcion: t.descripcion,
          monto: parseFloat(t.monto),
          moneda: t.moneda,
          tipo: t.tipo,
          estado: 'PLANIFICADA',
          fecha: new Date(new Date(t.fecha).setHours(12, 0, 0, 0)).toISOString(),
          fechaPlanificada: new Date(new Date(t.fechaPlanificada).setHours(12, 0, 0, 0)).toISOString(),
          comentario: t.comentario || '',
          entidadId: t.entidadId,
          cuentaBancariaId: t.cuentaBancariaId,
          asientoContableId: t.asientoContableId,
        })),
      };

      console.log('Datos a enviar:', submitData); // Debug

      const response = await fetch('/api/transacciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const responseData = await response.json();
      console.log('Respuesta del servidor:', responseData); // Debug

      if (!response.ok) {
        throw new Error(responseData.error || `Error del servidor: ${response.status}`);
      }

      toast.success(`✅ Se crearon ${data.transacciones.length} transacciones planificadas correctamente`);

      // Cerrar modal y notificar éxito
      handleClose();
      onSuccess();

    } catch (error) {
      console.error('Error al guardar transacciones:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar las transacciones');
    } finally {
      setLoading(false);
    }
  };

  const addTransaccion = () => {
    const currentTransactions = form.getValues('transacciones');
    const lastTransaction = currentTransactions[currentTransactions.length - 1];

    // Crear nueva transacción basada en la anterior pero con fecha incrementada
    const newDate = new Date(lastTransaction.fechaPlanificada);
    newDate.setDate(newDate.getDate() + intervaloDias); // Usar intervalo personalizable

    const newTransaccion = {
      descripcion: lastTransaction.descripcion, // Autocompletar descripción
      monto: lastTransaction.monto, // Autocompletar monto
      moneda: lastTransaction.moneda, // Autocompletar moneda
      tipo: lastTransaction.tipo, // Autocompletar tipo
      fecha: new Date(), // Fecha actual por defecto
      fechaPlanificada: newDate, // Incrementar fecha
      comentario: lastTransaction.comentario, // Autocompletar comentario
      entidadId: lastTransaction.entidadId, // Autocompletar entidad
      cuentaBancariaId: lastTransaction.cuentaBancariaId, // Autocompletar cuenta
      asientoContableId: lastTransaction.asientoContableId, // Autocompletar asiento
    };

    append(newTransaccion);
    toast.success(`Nueva transacción agregada (+${intervaloDias} días)`);
  };

  const duplicateTransaction = (index: number) => {
    const currentTransactions = form.getValues('transacciones');
    const transactionToDuplicate = currentTransactions[index];

    // Crear nueva transacción idéntica pero con fecha incrementada
    const newDate = new Date(transactionToDuplicate.fechaPlanificada);
    newDate.setDate(newDate.getDate() + intervaloDias); // Usar intervalo personalizable

    const duplicatedTransaction = {
      ...transactionToDuplicate,
      fechaPlanificada: newDate,
    };

    append(duplicatedTransaction);
    toast.success(`Transacción duplicada (+${intervaloDias} días)`);
  };

  const handleSuggestAsiento = async (index: number) => {
    const descripcion = form.getValues(`transacciones.${index}.descripcion`);
    const tipo = form.getValues(`transacciones.${index}.tipo`);

    if (!descripcion) {
      toast.error('Ingresa una descripción para obtener una sugerencia');
      return;
    }

    try {
      setSuggestingIndex(index);
      const entidadId = form.getValues(`transacciones.${index}.entidadId`);
      const entidad = entidades.find(e => e.id === entidadId)?.nombre || '';

      const response = await fetch('/api/asientos/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaccion: { descripcion, tipo },
          actividad: 'Actividad del usuario',
          entidad
        })
      });

      if (!response.ok) throw new Error('Error al obtener sugerencia');

      const { asientoId } = await response.json();
      if (asientoId) {
        form.setValue(`transacciones.${index}.asientoContableId`, asientoId);
        toast.success('Asiento sugerido aplicado');
      }
    } catch (error) {
      console.error('Error sugiriendo asiento:', error);
      toast.error('No se pudo obtener una sugerencia');
    } finally {
      setSuggestingIndex(null);
    }
  };

  const handleVoiceData = async (localData: { description: string }) => {
    try {
      const textToProcess = localData.description || '';
      if (!textToProcess) return;

      toast.loading('Procesando entrada de voz...', { id: 'batch-voice-process' });

      const response = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToProcess })
      });

      if (!response.ok) throw new Error('Error al procesar voz');

      const aiData = await response.json();

      // Función para parsear fecha evitando desfase UTC
      const parseLocalDate = (dateStr: string | null) => {
        if (!dateStr) return new Date();
        const [y, m, d] = dateStr.split('-').map(Number);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date();
        return new Date(y, m - 1, d);
      };

      const voiceData = {
        descripcion: aiData.description || textToProcess,
        monto: aiData.amount?.toString() || '',
        moneda: aiData.currency || 'ARS',
        tipo: aiData.type || 'EGRESO',
        fecha: new Date(),
        fechaPlanificada: parseLocalDate(aiData.date),
        comentario: '',
        entidadId: '',
        cuentaBancariaId: '',
        asientoContableId: '',
      };

      // Intentar matchear entidades, cuentas y asientos (lógica similar a transaccion-form)
      const normalizeString = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      if (aiData.entityKeyword) {
        const keyword = normalizeString(aiData.entityKeyword);
        const match = entidades.find(e => {
          const n = normalizeString(e.nombre);
          return keyword === n || n.includes(keyword) || keyword.includes(n);
        });
        if (match) voiceData.entidadId = match.id;
      }

      if (aiData.bankKeyword) {
        const keyword = normalizeString(aiData.bankKeyword);
        const match = cuentas.find(c => {
          const n = normalizeString(c.nombre);
          const b = c.banco ? normalizeString(c.banco) : "";
          const full = normalizeString(`${c.nombre} (${c.banco})`);
          return keyword === n || keyword === b || keyword === full ||
            n.includes(keyword) || (b && b.includes(keyword)) ||
            keyword.includes(n) || (b && keyword.includes(b));
        });
        if (match) voiceData.cuentaBancariaId = match.id;
      }

      if (aiData.categoryKeyword) {
        const keyword = normalizeString(aiData.categoryKeyword);
        const match = asientos.find(a => {
          const n = normalizeString(a.nombre);
          const cod = a.codigo ? normalizeString(a.codigo) : "";
          return keyword === n || keyword === cod ||
            n.includes(keyword) || (cod && cod.includes(keyword)) ||
            keyword.includes(n) || (cod && keyword.includes(cod));
        });
        if (match) voiceData.asientoContableId = match.id;
      }

      // Lógica para no dejar la primera transacción vacía y manejo de recurrencia
      const currentTransactions = form.getValues('transacciones');
      const firstIsEmpty = currentTransactions.length === 1 && !currentTransactions[0].descripcion && !currentTransactions[0].entidadId;

      if (aiData.recurrence?.isRecurring) {
        const { startMonth, endMonth, day } = aiData.recurrence;
        const currentYear = new Date().getFullYear();
        const transactionsToAdd = [];

        for (let m = startMonth; m <= endMonth; m++) {
          const date = new Date(new Date(currentYear, m - 1, day || 1).setHours(12, 0, 0, 0));
          transactionsToAdd.push({
            ...voiceData,
            fechaPlanificada: date
          });
        }

        if (firstIsEmpty) {
          form.setValue('transacciones.0', transactionsToAdd[0]);
          transactionsToAdd.slice(1).forEach(t => append(t));
        } else {
          transactionsToAdd.forEach(t => append(t));
        }
      } else {
        if (firstIsEmpty) {
          form.setValue('transacciones.0', voiceData);
        } else {
          append(voiceData);
        }
      }

      toast.success(aiData.recurrence?.isRecurring ? `${aiData.recurrence.endMonth - aiData.recurrence.startMonth + 1} transacciones generadas` : 'Transacción agregada por voz', { id: 'batch-voice-process' });

    } catch (e: any) {
      console.error('Error en handleVoiceData Lote:', e);
      toast.error('Error al procesar voz', { id: 'batch-voice-process' });
    }
  };

  const handleClose = () => {
    if (!loading) {
      form.reset({
        transacciones: [
          {
            descripcion: '',
            monto: '',
            moneda: 'ARS',
            tipo: 'INGRESO',
            fecha: new Date(),
            fechaPlanificada: new Date(),
            comentario: '',
            entidadId: '',
            cuentaBancariaId: '',
            asientoContableId: '',
          },
        ],
      });
      setIntervaloDias(30);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl sm:text-2xl">Carga por Lotes</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm space-y-1">
            <div className="hidden sm:block">Crea múltiples transacciones planificadas de una vez. Ideal para pagos recurrentes.</div>
            <div className="text-blue-600 font-medium">
              ✅ Fechas editables • ✅ Autocompletado inteligente
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between bg-blue-50 p-2 sm:p-3 rounded-lg mb-4">
          <span className="text-xs sm:text-sm text-blue-800 font-medium flex items-center gap-1 sm:gap-2">
            🎙️ Agregar por voz
          </span>
          <VoiceInput onDataDetected={handleVoiceData} />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            {/* Configuración de Intervalo */}
            <Card className="shadow-none border-secondary/20">
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="space-y-1">
                    <Label htmlFor="intervalo-select" className="text-[10px] sm:text-xs">Intervalo</Label>
                    <Select value={intervaloDias.toString()} onValueChange={(value) => setIntervaloDias(parseInt(value))}>
                      <SelectTrigger className="h-8 sm:h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 día</SelectItem>
                        <SelectItem value="7">7 d</SelectItem>
                        <SelectItem value="15">15 d</SelectItem>
                        <SelectItem value="30">30 d</SelectItem>
                        <SelectItem value="60">60 d</SelectItem>
                        <SelectItem value="365">1 año</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="intervalo-custom" className="text-[10px] sm:text-xs">Días personalizados</Label>
                    <Input
                      id="intervalo-custom"
                      type="number"
                      className="h-8 sm:h-10 text-xs"
                      value={intervaloDias}
                      onChange={(e) => setIntervaloDias(parseInt(e.target.value) || 30)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3 sm:space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border-2 border-secondary/10 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4 bg-card/50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm sm:text-lg font-semibold flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold">
                        {index + 1}
                      </span>
                      Transacción
                    </h3>
                    <div className="flex gap-1 sm:gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8"
                        onClick={() => duplicateTransaction(index)}
                        title="Duplicar"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => remove(index)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                    <FormField
                      control={form.control}
                      name={`transacciones.${index}.entidadId`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[10px] sm:text-xs">Entidad *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 sm:h-10 text-xs">
                                <SelectValue placeholder="Entidad" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {entidades.map((entidad) => (
                                <SelectItem key={entidad.id} value={entidad.id} className="text-xs">
                                  {entidad.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`transacciones.${index}.cuentaBancariaId`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[10px] sm:text-xs">Cuenta *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 sm:h-10 text-xs">
                                <SelectValue placeholder="Cuenta" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cuentas.map((cuenta) => (
                                <SelectItem key={cuenta.id} value={cuenta.id} className="text-xs">
                                  {cuenta.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`transacciones.${index}.descripcion`}
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] sm:text-xs">Descripción *</FormLabel>
                        <FormControl>
                          <Input placeholder="Descripción" className="h-8 sm:h-10 text-xs" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                    <FormField
                      control={form.control}
                      name={`transacciones.${index}.monto`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[10px] sm:text-xs">Monto *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="h-8 sm:h-10 text-xs"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name={`transacciones.${index}.moneda`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[10px] sm:text-xs">Moneda *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 sm:h-10 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ARS" className="text-xs">ARS</SelectItem>
                                <SelectItem value="USD" className="text-xs">USD</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`transacciones.${index}.tipo`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[10px] sm:text-xs">Tipo *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 sm:h-10 text-xs font-medium">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="INGRESO" className="text-xs font-medium text-green-600">Ingreso</SelectItem>
                                <SelectItem value="EGRESO" className="text-xs font-medium text-red-600">Egreso</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                    <FormField
                      control={form.control}
                      name={`transacciones.${index}.asientoContableId`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-[10px] sm:text-xs">Asiento *</FormLabel>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSuggestAsiento(index)}
                              disabled={suggestingIndex === index}
                              className="h-5 text-[9px] sm:text-[10px] text-blue-600 px-1"
                            >
                              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                              IA
                            </Button>
                          </div>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 sm:h-10 text-xs">
                                <SelectValue placeholder="Asiento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {asientos.map((asiento) => (
                                <SelectItem key={asiento.id} value={asiento.id} className="text-[10px] sm:text-xs">
                                  {asiento.codigo} - {asiento.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name={`transacciones.${index}.fecha`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[10px] sm:text-xs">Fecha</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                className="h-8 sm:h-10 text-xs px-1 sm:px-2"
                                value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const [y, m, d] = e.target.value.split('-').map(Number);
                                    field.onChange(new Date(y, m - 1, d));
                                  }
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`transacciones.${index}.fechaPlanificada`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[10px] sm:text-xs">Planif.</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                className="h-8 sm:h-10 text-xs px-1 sm:px-2"
                                value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const [y, m, d] = e.target.value.split('-').map(Number);
                                    field.onChange(new Date(y, m - 1, d));
                                  }
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={addTransaccion}
                className="h-10 sm:h-12 border-dashed border-2 flex items-center justify-center gap-2 text-primary hover:bg-primary/5"
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs sm:text-sm font-semibold">Agregar Manualmente</span>
                <span className="text-[10px] opacity-70 hidden sm:inline">(con autocompletado)</span>
              </Button>
            </div>

            <DialogFooter className="sticky bottom-0 bg-background pt-2 flex flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading} className="w-full sm:w-auto h-10">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-[220px] h-10 font-bold">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </div>
                ) : (
                  `Crear ${fields.length} Transacción${fields.length > 1 ? 'es' : ''}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
