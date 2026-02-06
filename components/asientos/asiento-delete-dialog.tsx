
'use client';

import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AsientoContable } from './asientos-list';
import toast from 'react-hot-toast';

interface AsientoDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asiento: AsientoContable;
}

export function AsientoDeleteDialog({ open, onClose, onSuccess, asiento }: AsientoDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/asientos/${asiento.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar el asiento');
      }

      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar el asiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar asiento contable?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente el asiento contable <strong>"{asiento.codigo} - {asiento.nombre}"</strong>.
            <br /><br />
            Solo se puede eliminar si no tiene transacciones asociadas. Si tiene transacciones,
            considere desactivarlo en su lugar.
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
