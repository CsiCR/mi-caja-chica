
'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface GraficosResumenProps {
  saldosData?: {
    entidades: Array<{
      id: string;
      nombre: string;
      tipo: string;
    }>;
    totalesPorEntidad: {
      [entidadId: string]: {
        ARS: number;
        USD: number;
      };
    };
    totalGeneral: {
      ARS: number;
      USD: number;
    };
  };
  transaccionesResumen?: {
    detalle: Array<{
      tipo: string;
      moneda: string;
      _sum: { monto: number };
      _count: { _all: number };
    }>;
  };
}

export function GraficosResumen({ saldosData, transaccionesResumen }: GraficosResumenProps) {
  const formatMonto = (monto: number, moneda: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(monto);
  };

  // Datos para gráfico de barras - Saldos por Entidad
  const saldosBarData = saldosData ? {
    labels: saldosData.entidades.map(e => e.nombre),
    datasets: [
      {
        label: 'ARS',
        data: saldosData.entidades.map(e => saldosData.totalesPorEntidad[e.id]?.ARS || 0),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
      {
        label: 'USD',
        data: saldosData.entidades.map(e => saldosData.totalesPorEntidad[e.id]?.USD || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  } : null;

  // Datos para gráfico circular - Ingresos vs Egresos
  const ingresosEgresos = transaccionesResumen?.detalle.reduce((acc, item) => {
    const key = item.tipo;
    if (!acc[key]) acc[key] = { ARS: 0, USD: 0, count: 0 };
    acc[key][item.moneda as 'ARS' | 'USD'] += Number(item._sum.monto) || 0;
    acc[key].count += item._count._all;
    return acc;
  }, {} as { [key: string]: { ARS: number; USD: number; count: number } });

  const pieData = ingresosEgresos ? {
    labels: ['Ingresos', 'Egresos'],
    datasets: [
      {
        data: [
          ingresosEgresos.INGRESO?.ARS || 0 + ingresosEgresos.INGRESO?.USD || 0,
          ingresosEgresos.EGRESO?.ARS || 0 + ingresosEgresos.EGRESO?.USD || 0,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed;
            return `${context.dataset.label}: ${formatMonto(value, context.dataset.label)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatMonto(Number(value), 'ARS').replace('ARS', '');
          },
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed;
            const label = context.label;
            return `${label}: ${formatMonto(value, 'ARS')}`;
          },
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Gráfico de Saldos por Entidad */}
      {saldosBarData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saldos por Entidad</CardTitle>
            <CardDescription>
              Distribución de saldos en ARS y USD por cada entidad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar data={saldosBarData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Ingresos vs Egresos */}
      {pieData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ingresos vs Egresos</CardTitle>
            <CardDescription>
              Proporción total de ingresos y egresos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <Doughnut data={pieData} options={pieOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tarjetas de Resumen */}
      {saldosData && (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Patrimonio Total (ARS)</p>
                  <p className={`text-2xl font-bold ${saldosData.totalGeneral.ARS >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatMonto(saldosData.totalGeneral.ARS, 'ARS')}
                  </p>
                </div>
                {saldosData.totalGeneral.ARS >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Patrimonio Total (USD)</p>
                  <p className={`text-2xl font-bold ${saldosData.totalGeneral.USD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatMonto(saldosData.totalGeneral.USD, 'USD')}
                  </p>
                </div>
                {saldosData.totalGeneral.USD >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
