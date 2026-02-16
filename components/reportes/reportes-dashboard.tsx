
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReporteSaldos } from './reporte-saldos';
import { ReporteTransacciones } from './reporte-transacciones';
import { ReporteVencimientos } from './reporte-vencimientos';
import { BarChart3, FileSpreadsheet, PieChart, CalendarClock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

export function ReportesDashboard() {
  const [activeReport, setActiveReport] = useState<'saldos' | 'transacciones' | 'vencimientos'>('saldos');
  const searchParams = useSearchParams();

  // Escuchar parámetros de URL para cambiar de pestaña
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'vencimientos' || tab === 'saldos' || tab === 'transacciones') {
      setActiveReport(tab as 'saldos' | 'transacciones' | 'vencimientos');
    }
  }, [searchParams]);

  return (
    <div className="space-y-4">
      {/* Navegación de Reportes - Grid de 3 columnas */}
      <div className="grid grid-cols-3 gap-2 px-1">
        <Button
          variant={activeReport === 'saldos' ? 'default' : 'outline'}
          onClick={() => setActiveReport('saldos')}
          className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 h-14 sm:h-10 text-[10px] sm:text-xs px-1"
        >
          <BarChart3 className="h-4 w-4 shrink-0" />
          <span className="text-center leading-tight">Saldos</span>
        </Button>
        <Button
          variant={activeReport === 'transacciones' ? 'default' : 'outline'}
          onClick={() => setActiveReport('transacciones')}
          className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 h-14 sm:h-10 text-[10px] sm:text-xs px-1"
        >
          <FileSpreadsheet className="h-4 w-4 shrink-0" />
          <span className="text-center leading-tight">Detalles</span>
        </Button>
        <Button
          variant={activeReport === 'vencimientos' ? 'default' : 'outline'}
          onClick={() => setActiveReport('vencimientos')}
          className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 h-14 sm:h-10 text-[10px] sm:text-xs px-1 text-orange-600 border-orange-200"
        >
          <CalendarClock className="h-4 w-4 shrink-0" />
          <span className="text-center leading-tight">Vencimientos</span>
        </Button>
      </div>

      {/* Contenido del Reporte Activo */}
      {activeReport === 'saldos' && (
        <div className="space-y-4">
          <ReporteSaldos />
        </div>
      )}

      {activeReport === 'transacciones' && (
        <div className="space-y-4">
          <ReporteTransacciones />
        </div>
      )}

      {activeReport === 'vencimientos' && (
        <div className="space-y-4">
          <ReporteVencimientos />
        </div>
      )}
    </div>
  );
}
