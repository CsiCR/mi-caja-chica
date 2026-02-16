
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Receipt, Upload, Calendar, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { TransaccionForm } from './transaccion-form';
import { TransaccionLoteForm } from './transaccion-lote-form';
import { TransaccionDeleteDialog } from './transaccion-delete-dialog';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

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
    <div className="space-y-3">
      {/* Cabecera y Controles en una sola fila */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4 text-slate-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Transacciones</h2>
          </div>

          <div className="flex gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 sm:h-9 px-2 sm:px-3 border-green-200 bg-green-50/50 hover:bg-green-50 text-green-700 gap-1.5"
              title="Exportar CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLoteForm(true)}
              className="h-8 sm:h-9 px-2 sm:px-3 gap-1.5"
              title="Carga por Lotes"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lotes</span>
            </Button>
            <Button onClick={() => setShowForm(true)} size="sm" className="h-8 sm:h-9 px-2 sm:px-3 gap-1.5 shadow-sm">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs font-bold">Nueva</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-9 border-slate-200 bg-slate-50/50 focus:bg-white transition-colors text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Rango de Fechas */}
            <DatePickerWithRange
              className="flex-1 sm:w-[240px]"
              date={dateRange}
              onDateChange={setDateRange}
            />

            {/* Filtro Avanzado */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-slate-200 shrink-0 relative bg-white">
                  <Filter className="h-4 w-4" />
                  {(tipoFilter || estadoFilter || monedaFilter) && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-4 space-y-4" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Tipo</Label>
                    <Select value={tipoFilter || 'all'} onValueChange={(value) => handleFilterChange('tipo', value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="INGRESO">Ingresos</SelectItem>
                        <SelectItem value="EGRESO">Egresos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Estado</Label>
                    <Select value={estadoFilter || 'all'} onValueChange={(value) => handleFilterChange('estado', value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="REAL">Reales</SelectItem>
                        <SelectItem value="PLANIFICADA">Planificadas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Moneda</Label>
                    <Select value={monedaFilter || 'all'} onValueChange={(value) => handleFilterChange('moneda', value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(tipoFilter || estadoFilter || monedaFilter) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTipoFilter('');
                        setEstadoFilter('');
                        setMonedaFilter('');
                        setCurrentPage(1);
                      }}
                      className="w-full text-[10px] text-slate-500 hover:text-red-600 h-7"
                    >
                      Limpiar Filtros
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
        {/* Tabla */}
        <div className="relative">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-slate-500">Cargando...</p>
            </div>
          ) : transacciones.length === 0 ? (
            <div className="text-center py-16">
              <Receipt className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Sin transacciones</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
                No hay transacciones para mostrar en este período.
              </p>
              {!searchTerm && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button onClick={() => setShowForm(true)} variant="outline">Nueva transacción</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[85px] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fechas</TableHead>
                    <TableHead className="w-[45%] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detalles / Monto</TableHead>
                    <TableHead className="hidden md:table-cell w-[25%] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entidad / Cuenta</TableHead>
                    <TableHead className="w-[50px] text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center" title="Estado de la transacción">Est.</TableHead>
                    <TableHead className="w-[80px] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacciones.map((t) => (
                    <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors group border-slate-50">
                      <TableCell className="py-2 pr-0">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-col">
                            <span className="text-[8px] uppercase font-bold text-slate-400 leading-none mb-0.5">Real</span>
                            <span className="text-xs font-bold text-slate-700 leading-none">
                              {format(new Date(t.fecha), 'dd/MM/yy', { locale: es })}
                            </span>
                          </div>
                          {t.fechaPlanificada && (
                            <div className="flex flex-col border-t border-slate-100 pt-1">
                              <span className="text-[8px] uppercase font-bold text-slate-400 leading-none mb-0.5">Plan</span>
                              <span className="text-[10px] text-slate-500 font-medium leading-none">
                                {format(new Date(t.fechaPlanificada), 'dd/MM/yy', { locale: es })}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm truncate max-w-[120px] sm:max-w-none leading-tight">
                              {t.descripcion}
                            </span>
                            <span className={cn(
                              "text-xs font-bold whitespace-nowrap ml-2",
                              t.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'
                            )}>
                              {t.tipo === 'INGRESO' ? '+' : '-'}{formatMontoDisplay(t.monto, t.moneda)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant={t.tipo === 'INGRESO' ? 'outline' : 'outline'} className={cn(
                              "text-[9px] px-1 h-3.5 border-none",
                              t.tipo === 'INGRESO' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            )}>
                              {t.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                            </Badge>
                            {t.asientoContable && (
                              <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1 rounded">
                                {t.asientoContable.codigo}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">
                            {t.entidad.nombre}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                            {t.cuentaBancaria.nombre}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full mx-auto ring-4 ring-offset-0",
                            t.estado === 'REAL'
                              ? "bg-blue-500 ring-blue-50"
                              : "bg-amber-400 ring-amber-50"
                          )}
                          title={t.estado === 'REAL' ? 'Realizada' : 'Planificada'}
                        />
                      </TableCell>
                      <TableCell className="text-right py-3 pr-4">
                        <div className="flex items-center justify-end gap-0.5 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => setEditingTransaccion(t)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeletingTransaccion(t)}
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
          )}
        </div>

        {/* Paginación Compacta */}
        {!loading && transacciones.length > 0 && (
          <div className="px-4 py-3 border-t bg-slate-50/30 flex items-center justify-between">
            <div className="text-[10px] sm:text-xs text-slate-500 font-medium">
              <span className="hidden sm:inline">Viendo </span>
              <span className="text-slate-900">{((currentPage - 1) * pagination.limit) + 1}-{Math.min(currentPage * pagination.limit, pagination.total)}</span> de <span className="text-slate-900">{pagination.total}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white border-transparent hover:border-slate-200 border"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 h-8 px-3 flex items-center rounded-md shadow-sm">
                {currentPage} / {pagination.pages}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white border-transparent hover:border-slate-200 border"
                onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                disabled={currentPage === pagination.pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Overlays */}
      {showForm && (
        <TransaccionForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showLoteForm && (
        <TransaccionLoteForm
          open={showLoteForm}
          onClose={() => setShowLoteForm(false)}
          onSuccess={handleLoteSuccess}
        />
      )}

      {editingTransaccion && (
        <TransaccionForm
          open={!!editingTransaccion}
          onClose={() => setEditingTransaccion(null)}
          onSuccess={handleUpdateSuccess}
          transaccion={editingTransaccion}
        />
      )}

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
