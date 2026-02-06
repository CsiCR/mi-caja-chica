
'use client';

import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CuentaBancaria } from './cuentas-list';
import toast from 'react-hot-toast';

interface CuentaDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cuenta: CuentaBancaria;
}

export function CuentaDeleteDialog({ open, onClose, onSuccess, cuenta }: CuentaDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/cuentas/${cuenta.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar la cuenta');
      }

      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar cuenta bancaria?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente la cuenta <strong>"{cuenta.nombre}"</strong> del banco <strong>{cuenta.banco}</strong>.
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
