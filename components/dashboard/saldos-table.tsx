
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

interface SaldoData {
  entidadNombre: string;
  cuentaNombre: string;
  saldo: number;
  moneda: 'ARS' | 'USD';
}

interface SaldoTableData {
  entidades: string[];
  cuentas: string[];
  saldos: Record<string, Record<string, { ARS: number; USD: number }>>;
}

export function SaldosTable() {
  const { data: session } = useSession();
  const [data, setData] = useState<SaldoTableData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSaldos = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/dashboard/saldos');
        if (response.ok) {
          const saldosData = await response.json();
          setData(saldosData);
        }
      } catch (error) {
        console.error('Error fetching saldos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSaldos();
  }, [session?.user?.id]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!data || data.entidades.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No hay datos disponibles</p>
          <p className="text-sm text-muted-foreground mt-1">
            Agrega entidades y cuentas bancarias para ver los saldos
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number, currency: 'ARS' | 'USD') => {
    if (amount === 0) return '-';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCellColor = (arsAmount: number, usdAmount: number) => {
    const total = arsAmount + usdAmount;
    if (total > 0) return 'text-green-700 bg-green-50';
    if (total < 0) return 'text-red-700 bg-red-50';
    return 'text-gray-500';
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Entidad / Cuenta</TableHead>
            {data.cuentas.map((cuenta) => (
              <TableHead key={cuenta} className="text-center font-semibold min-w-[120px]">
                {cuenta}
              </TableHead>
            ))}
            <TableHead className="text-center font-semibold bg-gray-50">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.entidades.map((entidad) => (
            <TableRow key={entidad} className="hover:bg-gray-50">
              <TableCell className="font-medium">{entidad}</TableCell>
              {data.cuentas.map((cuenta) => {
                const saldo = data.saldos[entidad]?.[cuenta] || { ARS: 0, USD: 0 };
                const hasData = saldo.ARS !== 0 || saldo.USD !== 0;
                
                return (
                  <TableCell 
                    key={`${entidad}-${cuenta}`} 
                    className={`text-center ${hasData ? getCellColor(saldo.ARS, saldo.USD) : ''}`}
                  >
                    {hasData ? (
                      <div className="space-y-1">
                        {saldo.ARS !== 0 && (
                          <div className="text-sm font-medium">
                            {formatCurrency(saldo.ARS, 'ARS')}
                          </div>
                        )}
                        {saldo.USD !== 0 && (
                          <div className="text-sm font-medium">
                            {formatCurrency(saldo.USD, 'USD')}
                          </div>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                );
              })}
              {/* Columna de total */}
              <TableCell className="text-center font-semibold bg-gray-50">
                {(() => {
                  let totalARS = 0;
                  let totalUSD = 0;
                  
                  data.cuentas.forEach((cuenta) => {
                    const saldo = data.saldos[entidad]?.[cuenta] || { ARS: 0, USD: 0 };
                    totalARS += saldo.ARS;
                    totalUSD += saldo.USD;
                  });

                  const hasTotal = totalARS !== 0 || totalUSD !== 0;
                  
                  return hasTotal ? (
                    <div className={`space-y-1 ${getCellColor(totalARS, totalUSD)}`}>
                      {totalARS !== 0 && (
                        <div className="text-sm font-semibold">
                          {formatCurrency(totalARS, 'ARS')}
                        </div>
                      )}
                      {totalUSD !== 0 && (
                        <div className="text-sm font-semibold">
                          {formatCurrency(totalUSD, 'USD')}
                        </div>
                      )}
                    </div>
                  ) : '-';
                })()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
