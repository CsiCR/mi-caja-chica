
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownRight, Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface Transaction {
  id: string;
  descripcion: string;
  monto: number;
  moneda: 'ARS' | 'USD';
  tipo: 'INGRESO' | 'EGRESO';
  estado: 'REAL' | 'PLANIFICADA';
  fecha: string;
  fechaPlanificada?: string;
  entidad: {
    nombre: string;
  };
  cuentaBancaria: {
    nombre: string;
  };
  asientoContable: {
    nombre: string;
  };
}

export function RecentTransactions() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/dashboard/transactions?limit=10');
        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [session?.user?.id]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay transacciones recientes</p>
        <p className="text-sm text-muted-foreground mt-1">
          Registra tu primera transacción para comenzar
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/transacciones">
            Registrar Transacción
          </Link>
        </Button>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: 'ARS' | 'USD') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-full ${
              transaction.tipo === 'INGRESO' 
                ? 'bg-green-100 text-green-600' 
                : 'bg-red-100 text-red-600'
            }`}>
              {transaction.tipo === 'INGRESO' ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">
                  {transaction.descripcion}
                </p>
                {transaction.estado === 'PLANIFICADA' && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    Planificada
                  </Badge>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>{transaction.entidad.nombre} • {transaction.cuentaBancaria.nombre}</p>
                <p>{transaction.asientoContable.nombre}</p>
                <p>
                  {transaction.estado === 'PLANIFICADA' && transaction.fechaPlanificada
                    ? `Planificado para: ${formatDate(transaction.fechaPlanificada)}`
                    : formatDate(transaction.fecha)
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`text-right font-semibold ${
              transaction.tipo === 'INGRESO' 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              <div className="text-sm">
                {transaction.tipo === 'INGRESO' ? '+' : '-'}
                {formatCurrency(transaction.monto, transaction.moneda)}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="pt-4 border-t">
        <Button variant="outline" className="w-full" asChild>
          <Link href="/dashboard/transacciones">
            <Eye className="h-4 w-4 mr-2" />
            Ver Todas las Transacciones
          </Link>
        </Button>
      </div>
    </div>
  );
}
