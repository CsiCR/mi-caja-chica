
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles, Loader2, HelpCircle } from 'lucide-react';
import { AsientoContable } from './asientos-list';
import toast from 'react-hot-toast';

const formSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20, 'El código no puede exceder 20 caracteres'),
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede exceder 100 caracteres'),
  descripcion: z.string().optional(),
  activo: z.boolean(),
  entidadId: z.string().min(1, 'La entidad es requerida').refine(val => val !== 'none', {
    message: 'Debes seleccionar una entidad específica',
  }),
});

type FormData = z.infer<typeof formSchema>;

interface AsientoFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asiento?: AsientoContable;
}

export function AsientoForm({ open, onClose, onSuccess, asiento }: AsientoFormProps) {
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [proposito, setProposito] = useState('');
  const [entidades, setEntidades] = useState<{ id: string, nombre: string }[]>([]);
  const isEditing = !!asiento;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: asiento?.codigo || '',
      nombre: asiento?.nombre || '',
      descripcion: asiento?.descripcion || '',
      activo: asiento?.activo ?? true,
      entidadId: (asiento as any)?.entidadId || '',
    },
  });

  useState(() => {
    fetch('/api/entidades?limit=100')
      .then(res => res.json())
      .then(data => setEntidades(data.entidades || []))
      .catch(err => console.error('Error cargando entidades:', err));
  });

  const handleSuggest = async () => {
    if (!proposito) {
      toast.error('Por favor describe el propósito de la cuenta');
      return;
    }

    try {
      setSuggestLoading(true);
      const entidadId = form.getValues('entidadId');

      if (!entidadId || entidadId === 'none') {
        toast.error('Selecciona una entidad primero para recibir una sugerencia coherente');
        setSuggestLoading(false);
        return;
      }

      const entidad = entidades.find(e => e.id === entidadId)?.nombre || '';

      const response = await fetch('/api/asientos/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposito,
          entidad,
          isCreation: true // Indicar que es para crear un nuevo asiento
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al obtener sugerencia');
      }

      const data = await response.json();
      if (data) {
        if (data.codigo) form.setValue('codigo', data.codigo);
        if (data.nombre) form.setValue('nombre', data.nombre);
        if (data.descripcion) form.setValue('descripcion', data.descripcion);
        toast.success('¡Sugerencia de IA aplicada!');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('No se pudo obtener una sugerencia en este momento');
    } finally {
      setSuggestLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const url = isEditing ? `/api/asientos/${asiento.id}` : '/api/asientos';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        const detailMessage = error.details
          ? error.details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ')
          : '';
        throw new Error(error.error + (detailMessage ? ` (${detailMessage})` : ''));
      }

      onSuccess();
      form.reset();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar el asiento');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Asiento Contable' : 'Nuevo Asiento Contable'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del asiento contable seleccionado.'
              : 'Crea un nuevo asiento contable para categorizar tus transacciones.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="entidadId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entidad Relacionada</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger autoFocus>
                        <SelectValue placeholder="Selecciona una entidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {entidades.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <div className="bg-yellow-50/50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-yellow-700 font-medium text-sm">
                  <Sparkles className="h-4 w-4" />
                  Sugerencia Inteligente
                </div>
                <div className="space-y-2">
                  <FormLabel className="text-xs text-yellow-600 uppercase font-bold">
                    ¿Cuál es el propósito de esta cuenta?
                  </FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: Para registrar gastos de papelería y oficina..."
                      value={proposito}
                      onChange={(e) => setProposito(e.target.value)}
                      className="bg-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleSuggest}
                      disabled={suggestLoading || !proposito}
                      className="shrink-0 border-yellow-300 hover:bg-yellow-100"
                    >
                      {suggestLoading ? <Loader2 className="h-4 w-4 animate-spin text-yellow-600" /> : <Sparkles className="h-4 w-4 text-yellow-600" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-yellow-600/80 italic">
                    Gemini sugerirá el código y nombre ideal basado en tu propósito.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">

              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1">
                      <FormLabel>Código *</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[250px] text-xs">
                            <div className="space-y-1">
                              <p className="font-bold border-b pb-1 mb-1 text-blue-700">Estructura X-XX-XXX-XXXX</p>
                              <p><strong>X (Clase)</strong>: 1:Activo, 2:Pasivo, 3:PN, 4:Ingreso, 5:Egreso</p>
                              <p><strong>XX (Mayor)</strong>: Rubro principal (ej: 01, 02)</p>
                              <p><strong>XXX (Subcuenta)</strong>: Nivel intermedio (ej: 001)</p>
                              <p><strong>XXXX (Auxiliar)</strong>: Detalle final (ej: 0001)</p>
                              <p className="pt-1 mt-1 border-t text-[10px] text-blue-600 font-medium italic">
                                💡 La IA sugiere automáticamente el siguiente número correlativo disponible.
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Input
                        placeholder="Ej: 4-01-001-0001"
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Caja Chica" {...field} />
                    </FormControl>
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
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe el propósito de este asiento contable..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Asiento Activo</FormLabel>
                    <div className="text-sm text-gray-500">
                      Los asientos inactivos no aparecerán en los selectores de transacciones
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
