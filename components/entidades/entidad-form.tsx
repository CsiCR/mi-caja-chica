
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Entidad } from './entidades-list';
import toast from 'react-hot-toast';

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede exceder 100 caracteres'),
  descripcion: z.string().optional(),
  tipo: z.enum(['FREELANCE', 'COMERCIO', 'SERVICIOS', 'CONSTRUCCION', 'TECNOLOGIA', 'PERSONAL']),
  activa: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface EntidadFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entidad?: Entidad;
}

const tipoOptions = [
  { value: 'FREELANCE', label: 'Freelance / Profesional Independiente' },
  { value: 'COMERCIO', label: 'Comercio Minorista / Negocio' },
  { value: 'SERVICIOS', label: 'Empresa de Servicios' },
  { value: 'CONSTRUCCION', label: 'Construcción y Refacciones' },
  { value: 'TECNOLOGIA', label: 'Software y Tecnología' },
  { value: 'PERSONAL', label: 'Finanzas Personales e Inversiones' },
];

export function EntidadForm({ open, onClose, onSuccess, entidad }: EntidadFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!entidad;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: entidad?.nombre || '',
      descripcion: entidad?.descripcion || '',
      tipo: entidad?.tipo || 'FREELANCE',
      activa: entidad?.activa ?? true,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const url = isEditing ? `/api/entidades/${entidad.id}` : '/api/entidades';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar la entidad');
      }

      onSuccess();
      form.reset();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar la entidad');
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
            {isEditing ? 'Editar Entidad' : 'Nueva Entidad'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos de la entidad seleccionada.'
              : 'Crea una nueva entidad para organizar tus finanzas.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Mi Emprendimiento SRL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Entidad *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tipoOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe brevemente esta entidad..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activa"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Entidad Activa</FormLabel>
                    <div className="text-sm text-gray-500">
                      Las entidades inactivas no aparecerán en los selectores de transacciones
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
