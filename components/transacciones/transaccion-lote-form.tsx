
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
          fecha: t.fecha.toISOString(),
          fechaPlanificada: t.fechaPlanificada.toISOString(),
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

  const handleClose = () => {
    if (!loading) {
      form.reset({
        transacciones: [
          {
            descripcion: '',
            monto: '',
            moneda: 'ARS',
            tipo: 'INGRESO',
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carga por Lotes de Transacciones Planificadas</DialogTitle>
          <DialogDescription className="space-y-1">
            <div>Crea múltiples transacciones planificadas de una vez. Ideal para pagos recurrentes como servicios.</div>
            <div className="text-blue-600 font-medium">
              ✅ Fechas completamente editables • ✅ Autocompletado inteligente • ✅ Intervalos personalizables
            </div>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Configuración de Intervalo */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <Label htmlFor="intervalo-select">Intervalo común</Label>
                    <Select value={intervaloDias.toString()} onValueChange={(value) => setIntervaloDias(parseInt(value))}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 día</SelectItem>
                        <SelectItem value="7">7 días (semanal)</SelectItem>
                        <SelectItem value="15">15 días (quincenal)</SelectItem>
                        <SelectItem value="30">30 días (mensual)</SelectItem>
                        <SelectItem value="60">60 días (bimensual)</SelectItem>
                        <SelectItem value="90">90 días (trimestral)</SelectItem>
                        <SelectItem value="180">180 días (semestral)</SelectItem>
                        <SelectItem value="365">365 días (anual)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="intervalo-custom">O días personalizados</Label>
                    <Input
                      id="intervalo-custom"
                      type="number"
                      min="1"
                      max="999"
                      value={intervaloDias}
                      onChange={(e) => setIntervaloDias(parseInt(e.target.value) || 30)}
                      placeholder="Días"
                    />
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium">💡 Funcionalidad mejorada:</div>
                    <div>• Al "Agregar otra transacción": +{intervaloDias} días con datos autocompletados</div>
                    <div>• Todas las fechas son editables independientemente</div>
                    <div>• Perfecto para servicios, alquileres, sueldos, etc.</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      Transacción {index + 1}
                      {index > 0 && (
                        <span className="text-sm text-green-600 ml-2 font-normal">
                          (Datos autocompletados)
                        </span>
                      )}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateTransaction(index)}
                        title="Duplicar esta transacción"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                          title="Eliminar esta transacción"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`transacciones.${index}.entidadId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entidad *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Entidad" />
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
                      name={`transacciones.${index}.cuentaBancariaId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cuenta *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Cuenta" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cuentas.map((cuenta) => (
                                <SelectItem key={cuenta.id} value={cuenta.id}>
                                  {cuenta.nombre}
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
                    name={`transacciones.${index}.descripcion`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción *</FormLabel>
                        <FormControl>
                          <Input placeholder="Descripción de la transacción" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`transacciones.${index}.monto`}
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`transacciones.${index}.moneda`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Moneda *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Moneda" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ARS">ARS</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`transacciones.${index}.tipo`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Tipo" />
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
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`transacciones.${index}.asientoContableId`}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Asiento Contable *</FormLabel>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSuggestAsiento(index)}
                              disabled={suggestingIndex === index}
                              className="h-7 text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              {suggestingIndex === index ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3" />
                              )}
                              Sugerir
                            </Button>
                          </div>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Asiento" />
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
                        name={`transacciones.${index}.fecha`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Fecha *
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

                      <FormField
                        control={form.control}
                        name={`transacciones.${index}.fechaPlanificada`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Planificada *
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
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name={`transacciones.${index}.comentario`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comentario</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Información adicional..."
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={addTransaccion}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar otra transacción
                {fields.length > 0 && (
                  <span className="text-xs text-green-600">(con datos autocompletados)</span>
                )}
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="min-w-[180px]">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </div>
                ) : (
                  `Crear ${fields.length} transacción${fields.length > 1 ? 'es' : ''} planificada${fields.length > 1 ? 's' : ''}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
