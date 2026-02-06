
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReporteSaldos } from './reporte-saldos';
import { ReporteTransacciones } from './reporte-transacciones';
import { ReporteVencimientos } from './reporte-vencimientos';
import { BarChart3, FileSpreadsheet, PieChart, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';

export function ReportesDashboard() {
  const [activeReport, setActiveReport] = useState<'saldos' | 'transacciones' | 'vencimientos'>('saldos');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-6 w-6" />
            Centro de Reportes Financieros
          </CardTitle>
          <CardDescription>
            Análisis completo de tus finanzas con reportes interactivos y exportables
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Navegación de Reportes */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              variant={activeReport === 'saldos' ? 'default' : 'outline'}
              onClick={() => setActiveReport('saldos')}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Saldos por Entidad
            </Button>
            <Button
              variant={activeReport === 'transacciones' ? 'default' : 'outline'}
              onClick={() => setActiveReport('transacciones')}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Detalle de Transacciones
            </Button>
            <Button
              variant={activeReport === 'vencimientos' ? 'default' : 'outline'}
              onClick={() => setActiveReport('vencimientos')}
              className="flex items-center gap-2"
            >
              <CalendarClock className="h-4 w-4" />
              Vencimientos Planificados
            </Button>
          </div>
        </CardContent>
      </Card>

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
