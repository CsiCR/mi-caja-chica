
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Tabla Cruzada</h3>
                    <p className="text-sm text-gray-600">Saldos por entidad y cuenta</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <PieChart className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Filtros Avanzados</h3>
                    <p className="text-sm text-gray-600">Por entidad, cuenta y período</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileSpreadsheet className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Tiempo Real</h3>
                    <p className="text-sm text-gray-600">Datos actualizados al instante</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <ReporteSaldos />
        </div>
      )}

      {activeReport === 'transacciones' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FileSpreadsheet className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Búsqueda Global</h3>
                    <p className="text-sm text-gray-600">En todos los campos de transacciones</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Ordenamiento</h3>
                    <p className="text-sm text-gray-600">Por cualquier columna</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={async () => {
                try {
                  const response = await fetch('/api/transacciones/export-csv');
                  if (!response.ok) throw new Error('Error al exportar');

                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  
                  const contentDisposition = response.headers.get('Content-Disposition');
                  const fileName = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || 'transacciones.csv';
                  
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);

                  toast.success('Archivo CSV descargado correctamente');
                } catch (error) {
                  console.error('Error:', error);
                  toast.error('Error al exportar transacciones');
                }
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Exportar CSV</h3>
                    <p className="text-sm text-gray-600">Descarga completa de datos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <ReporteTransacciones />
        </div>
      )}

      {activeReport === 'vencimientos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CalendarClock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Timeline de Vencimientos</h3>
                    <p className="text-sm text-gray-600">Organizados por semana o mes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <CalendarClock className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Gestión de Vencidos</h3>
                    <p className="text-sm text-gray-600">Identifica y gestiona pendientes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CalendarClock className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Marcar Realizadas</h3>
                    <p className="text-sm text-gray-600">Actualiza estado directamente</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <ReporteVencimientos />
        </div>
      )}
    </div>
  );
}
