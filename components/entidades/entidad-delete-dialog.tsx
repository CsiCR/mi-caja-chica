
'use client';

import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Entidad } from './entidades-list';
import toast from 'react-hot-toast';

interface EntidadDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entidad: Entidad;
}

export function EntidadDeleteDialog({ open, onClose, onSuccess, entidad }: EntidadDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/entidades/${entidad.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar la entidad');
      }

      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar la entidad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar entidad?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente la entidad <strong>"{entidad.nombre}"</strong>.
            <br /><br />
            Solo se puede eliminar si no tiene transacciones asociadas. Si tiene transacciones,
            considere desactivarla en su lugar.
            <br /><br />
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
