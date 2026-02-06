
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Receipt, Upload, Calendar, Download } from 'lucide-react';
import { TransaccionForm } from './transaccion-form';
import { TransaccionLoteForm } from './transaccion-lote-form';
import { TransaccionDeleteDialog } from './transaccion-delete-dialog';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

export interface Transaccion {
  id: string;
  descripcion: string;
  monto: number;
  moneda: 'ARS' | 'USD';
  tipo: 'INGRESO' | 'EGRESO';
  estado: 'REAL' | 'PLANIFICADA';
  fecha: string;
  fechaPlanificada?: string;
  comentario?: string;
  createdAt: string;
  updatedAt: string;
  entidad: {
    id: string;
    nombre: string;
    tipo: string;
  };
  cuentaBancaria: {
    id: string;
    nombre: string;
    banco: string;
    moneda: string;
  };
  asientoContable: {
    id: string;
    codigo: string;
    nombre: string;
  };
}

interface TransaccionesResponse {
  transacciones: Transaccion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function TransaccionesList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [monedaFilter, setMonedaFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [showLoteForm, setShowLoteForm] = useState(false);
  const [editingTransaccion, setEditingTransaccion] = useState<Transaccion | null>(null);
  const [deletingTransaccion, setDeletingTransaccion] = useState<Transaccion | null>(null);

  // Manejar parámetros de URL para accesos rápidos desde dashboard
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'nueva') {
      setShowForm(true);
      // Limpiar URL
      router.replace('/dashboard/transacciones', { scroll: false });
    } else if (action === 'lote') {
      setShowLoteForm(true);
      // Limpiar URL
      router.replace('/dashboard/transacciones', { scroll: false });
    }
  }, [searchParams, router]);

  const fetchTransacciones = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(tipoFilter && { tipo: tipoFilter }),
        ...(estadoFilter && { estado: estadoFilter }),
        ...(monedaFilter && { moneda: monedaFilter }),
        ...(dateRange?.from && { fechaDesde: format(dateRange.from, 'yyyy-MM-dd') }),
        ...(dateRange?.to && { fechaHasta: format(dateRange.to, 'yyyy-MM-dd') }),
      });

      const response = await fetch(`/api/transacciones?${params}`);
      if (!response.ok) throw new Error('Error al cargar transacciones');

      const data: TransaccionesResponse = await response.json();
      setTransacciones(data.transacciones);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar las transacciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransacciones();
  }, [currentPage, searchTerm, tipoFilter, estadoFilter, monedaFilter, dateRange]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filter: string, value: string) => {
    if (filter === 'tipo') {
      setTipoFilter(value === 'all' ? '' : value);
    } else if (filter === 'estado') {
      setEstadoFilter(value === 'all' ? '' : value);
    } else if (filter === 'moneda') {
      setMonedaFilter(value === 'all' ? '' : value);
    }
    setCurrentPage(1);
  };

  const handleCreateSuccess = () => {
    setShowForm(false);
    fetchTransacciones();
    toast.success('Transacción creada correctamente');
  };

  const handleLoteSuccess = () => {
    setShowLoteForm(false);
    fetchTransacciones();
    toast.success('Transacciones creadas por lote correctamente');
  };

  const handleUpdateSuccess = () => {
    setEditingTransaccion(null);
    fetchTransacciones();
    toast.success('Transacción actualizada correctamente');
  };

  const handleDeleteSuccess = () => {
    setDeletingTransaccion(null);
    fetchTransacciones();
    toast.success('Transacción eliminada correctamente');
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/transacciones/export-csv');
      if (!response.ok) throw new Error('Error al exportar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Obtener el nombre del archivo desde el header Content-Disposition
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
  };

  const formatMontoDisplay = (monto: number, moneda: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 2,
    }).format(monto);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Gestión de Transacciones
              </CardTitle>
              <CardDescription>
                Registra y gestiona todos tus ingresos y egresos, reales y planificados
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="outline" 
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowLoteForm(true)} 
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Carga por Lotes
              </Button>
              <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nueva Transacción
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por descripción o comentario..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <DatePickerWithRange
                className="w-full sm:w-[300px]"
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={tipoFilter || 'all'} onValueChange={(value) => handleFilterChange('tipo', value)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="INGRESO">Ingresos</SelectItem>
                  <SelectItem value="EGRESO">Egresos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={estadoFilter || 'all'} onValueChange={(value) => handleFilterChange('estado', value)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="REAL">Reales</SelectItem>
                  <SelectItem value="PLANIFICADA">Planificadas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={monedaFilter || 'all'} onValueChange={(value) => handleFilterChange('moneda', value)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabla */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-500">Cargando transacciones...</p>
            </div>
          ) : transacciones.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No hay transacciones</h3>
              <p className="mt-2 text-gray-500">
                Comienza registrando tu primera transacción financiera.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Primera transacción
                </Button>
                <Button variant="outline" onClick={() => setShowLoteForm(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Carga por lotes
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Asiento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacciones.map((transaccion) => (
                      <TableRow key={transaccion.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {format(new Date(transaccion.fecha), 'dd/MM/yyyy', { locale: es })}
                            </span>
                            {transaccion.fechaPlanificada && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(transaccion.fechaPlanificada), 'dd/MM/yyyy', { locale: es })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{transaccion.descripcion}</span>
                            {transaccion.comentario && (
                              <span className="text-xs text-gray-500 truncate max-w-xs">
                                {transaccion.comentario}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{transaccion.entidad.nombre}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{transaccion.cuentaBancaria.nombre}</span>
                            <span className="text-xs text-gray-500">{transaccion.cuentaBancaria.banco}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{transaccion.asientoContable.codigo}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaccion.tipo === 'INGRESO' ? 'default' : 'destructive'}>
                            {transaccion.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          <span className={transaccion.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}>
                            {transaccion.tipo === 'INGRESO' ? '+' : '-'}{formatMontoDisplay(transaccion.monto, transaccion.moneda)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaccion.estado === 'REAL' ? 'default' : 'secondary'}>
                            {transaccion.estado === 'REAL' ? 'Real' : 'Planificada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingTransaccion(transaccion)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingTransaccion(transaccion)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between px-2">
                  <div className="text-sm text-gray-500">
                    Mostrando {((currentPage - 1) * pagination.limit) + 1} a{' '}
                    {Math.min(currentPage * pagination.limit, pagination.total)} de {pagination.total} transacciones
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {currentPage} de {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                      disabled={currentPage === pagination.pages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Formulario de creación */}
      {showForm && (
        <TransaccionForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Formulario de carga por lotes */}
      {showLoteForm && (
        <TransaccionLoteForm
          open={showLoteForm}
          onClose={() => setShowLoteForm(false)}
          onSuccess={handleLoteSuccess}
        />
      )}

      {/* Formulario de edición */}
      {editingTransaccion && (
        <TransaccionForm
          open={!!editingTransaccion}
          onClose={() => setEditingTransaccion(null)}
          onSuccess={handleUpdateSuccess}
          transaccion={editingTransaccion}
        />
      )}

      {/* Diálogo de eliminación */}
      {deletingTransaccion && (
        <TransaccionDeleteDialog
          open={!!deletingTransaccion}
          onClose={() => setDeletingTransaccion(null)}
          onSuccess={handleDeleteSuccess}
          transaccion={deletingTransaccion}
        />
      )}
    </div>
  );
}
