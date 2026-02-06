

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
import toast from 'react-hot-toast';

const formSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es requerida').max(255, 'La descripción no puede exceder 255 caracteres'),
  monto: z.string().min(1, 'El monto es requerido').refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'El monto debe ser mayor a 0'),
  moneda: z.enum(['ARS', 'USD']),
  tipo: z.enum(['INGRESO', 'EGRESO']),
  fechaReal: z.date({ required_error: 'La fecha real es requerida' }),
  comentario: z.string().optional(),
  entidadId: z.string().min(1, 'La entidad es requerida'),
  cuentaBancariaId: z.string().min(1, 'La cuenta bancaria es requerida'),
  asientoContableId: z.string().min(1, 'El asiento contable es requerido'),
});

type FormData = z.infer<typeof formSchema>;

interface TransaccionPlanificada {
  id: string;
  descripcion: string;
  monto: number;
  moneda: 'ARS' | 'USD';
  tipo: 'INGRESO' | 'EGRESO';
  fechaPlanificada: string;
  comentario?: string;
  entidad: {
    id: string;
    nombre: string;
  };
  cuentaBancaria: {
    id: string;
    nombre: string;
  };
  asientoContable: {
    id: string;
    codigo: string;
    nombre: string;
  };
}

interface EditarAntesFinalizarDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaccion: TransaccionPlanificada | null;
}

interface SelectOption {
  id: string;
  nombre: string;
  activa?: boolean;
  activo?: boolean;
}

export function EditarAntesFinalizarDialog({ open, onClose, onSuccess, transaccion }: EditarAntesFinalizarDialogProps) {
  const [loading, setLoading] = useState(false);
  const [entidades, setEntidades] = useState<SelectOption[]>([]);
  const [cuentas, setCuentas] = useState<SelectOption[]>([]);
  const [asientos, setAsientos] = useState<SelectOption[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descripcion: '',
      monto: '',
      moneda: 'ARS',
      tipo: 'INGRESO',
      fechaReal: new Date(),
      comentario: '',
      entidadId: '',
      cuentaBancariaId: '',
      asientoContableId: '',
    },
  });

  // Cargar datos cuando se abre el diálogo
  useEffect(() => {
    if (open && transaccion) {
      form.reset({
        descripcion: transaccion.descripcion,
        monto: transaccion.monto.toString(),
        moneda: transaccion.moneda,
        tipo: transaccion.tipo,
        fechaReal: new Date(), // Fecha actual por defecto
        comentario: transaccion.comentario || '',
        entidadId: transaccion.entidad.id,
        cuentaBancariaId: transaccion.cuentaBancaria.id,
        asientoContableId: transaccion.asientoContable.id,
      });
    }
  }, [open, transaccion, form]);

  // Cargar opciones para selects
  useEffect(() => {
    if (open) {
      const fetchOptions = async () => {
        try {
          const [entidadesRes, cuentasRes, asientosRes] = await Promise.all([
            fetch('/api/entidades'),
            fetch('/api/cuentas'),
            fetch('/api/asientos'),
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
        }
      };

      fetchOptions();
    }
  }, [open]);

  const onSubmit = async (data: FormData) => {
    if (!transaccion) return;
    
    try {
      setLoading(true);

      const submitData = {
        descripcion: data.descripcion,
        monto: parseFloat(data.monto),
        moneda: data.moneda,
        tipo: data.tipo,
        estado: 'REAL',
        fecha: data.fechaReal.toISOString(),
        fechaPlanificada: transaccion.fechaPlanificada, // Mantener fecha planificada original
        comentario: data.comentario,
        entidadId: data.entidadId,
        cuentaBancariaId: data.cuentaBancariaId,
        asientoContableId: data.asientoContableId,
      };

      const response = await fetch(`/api/transacciones/${transaccion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) throw new Error('Error al finalizar transacción');

      toast.success('Transacción finalizada y actualizada correctamente');
      onClose();
      onSuccess();
      
      // Refrescar dashboard después de un momento
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshDashboard'));
      }, 1000);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al finalizar la transacción');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      form.reset();
      onClose();
    }
  };

  if (!transaccion) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ✏️ Editar y Finalizar Transacción
          </DialogTitle>
          <DialogDescription>
            Edita los datos si es necesario y marca la transacción como realizada.
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Fecha planificada original:</strong> {format(new Date(transaccion.fechaPlanificada), 'dd/MM/yyyy')}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Descripción *</FormLabel>
                    <FormControl>
                      <Input placeholder="Descripción de la transacción" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                          <SelectValue placeholder="Moneda" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                        <SelectItem value="USD">USD (Dólares)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo"
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
                        <SelectItem value="INGRESO">💰 Ingreso</SelectItem>
                        <SelectItem value="EGRESO">💸 Egreso</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fechaReal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Fecha Real *
                      <span className="text-xs text-green-600 font-normal">
                        (Fecha de realización)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                          const dateValue = e.target.value;
                          if (dateValue) {
                            const selectedDate = new Date(dateValue + 'T12:00:00');
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
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="entidadId"
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
                name="cuentaBancariaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuenta Bancaria *</FormLabel>
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

              <FormField
                control={form.control}
                name="asientoContableId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asiento Contable *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Asiento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {asientos.map((asiento) => (
                          <SelectItem key={asiento.id} value={asiento.id}>
                            {asiento.nombre}
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
              name="comentario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentario (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Comentario adicional..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="min-w-[180px] bg-green-600 hover:bg-green-700">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Finalizando...
                  </div>
                ) : (
                  '✅ Finalizar Transacción'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

