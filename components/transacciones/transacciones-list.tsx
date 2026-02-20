
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Receipt, Upload, Calendar, Download, Filter, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, HelpCircle } from 'lucide-react';
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

type SortField = 'fecha' | 'descripcion' | 'monto' | 'entidad' | 'cuenta' | 'asiento' | 'tipo' | 'estado';
type SortOrder = 'asc' | 'desc';

export function TransaccionesList() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [loading, setLoading] = useState(true);

  // Opciones para filtros
  const [entidades, setEntidades] = useState<Array<{ id: string; nombre: string }>>([]);
  const [cuentas, setCuentas] = useState<Array<{ id: string; nombre: string; banco: string }>>([]);
  const [asientos, setAsientos] = useState<Array<{ id: string; codigo: string; nombre: string }>>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [monedaFilter, setMonedaFilter] = useState('');
  const [entidadFilter, setEntidadFilter] = useState('');
  const [cuentaFilter, setCuentaFilter] = useState('');
  const [asientoFilter, setAsientoFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [montoDesde, setMontoDesde] = useState('');
  const [montoHasta, setMontoHasta] = useState('');

  // Ordenamiento y paginación
  const [sortBy, setSortBy] = useState<SortField>('fecha');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0,
  });

  // Modales
  const [showForm, setShowForm] = useState(false);
  const [showLoteForm, setShowLoteForm] = useState(false);
  const [editingTransaccion, setEditingTransaccion] = useState<Transaccion | null>(null);
  const [deletingTransaccion, setDeletingTransaccion] = useState<Transaccion | null>(null);

  // Manejar parámetros de URL para accesos rápidos desde dashboard
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'nueva') {
      setShowForm(true);
      router.replace('/dashboard/transacciones', { scroll: false });
    } else if (action === 'lote') {
      setShowLoteForm(true);
      router.replace('/dashboard/transacciones', { scroll: false });
    }
  }, [searchParams, router]);

  const fetchOptions = async () => {
    try {
      const [entidadesRes, cuentasRes, asientosRes] = await Promise.all([
        fetch('/api/entidades?limit=1000&activa=true'),
        fetch('/api/cuentas?limit=1000&activa=true'),
        fetch('/api/asientos?limit=1000&activo=true'),
      ]);

      const [entidadesData, cuentasData, asientosData] = await Promise.all([
        entidadesRes.json(),
        cuentasRes.json(),
        asientosRes.json(),
      ]);

      setEntidades(entidadesData.entidades || []);
      setCuentas(cuentasData.cuentas || []);
      setAsientos(asientosData.asientos || []);
    } catch (error) {
      console.error('Error al cargar opciones:', error);
    }
  };

  const fetchTransacciones = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '25',
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(tipoFilter && { tipo: tipoFilter }),
        ...(estadoFilter && { estado: estadoFilter }),
        ...(monedaFilter && { moneda: monedaFilter }),
        ...(entidadFilter && { entidadId: entidadFilter }),
        ...(cuentaFilter && { cuentaBancariaId: cuentaFilter }),
        ...(asientoFilter && { asientoContableId: asientoFilter }),
        ...(dateRange?.from && { fechaDesde: format(dateRange.from, 'yyyy-MM-dd') }),
        ...(dateRange?.to && { fechaHasta: format(dateRange.to, 'yyyy-MM-dd') }),
        ...(montoDesde && { montoDesde }),
        ...(montoHasta && { montoHasta }),
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
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchTransacciones();
  }, [
    currentPage,
    searchTerm,
    tipoFilter,
    estadoFilter,
    monedaFilter,
    entidadFilter,
    cuentaFilter,
    asientoFilter,
    dateRange,
    montoDesde,
    montoHasta,
    sortBy,
    sortOrder
  ]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  const formatMonto = (monto: number, moneda: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 2,
    }).format(monto);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTipoFilter('');
    setEstadoFilter('');
    setMonedaFilter('');
    setEntidadFilter('');
    setCuentaFilter('');
    setAsientoFilter('');
    setDateRange(undefined);
    setMontoDesde('');
    setMontoHasta('');
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
      const params = new URLSearchParams({
        export: 'csv',
        ...(searchTerm && { search: searchTerm }),
        ...(tipoFilter && { tipo: tipoFilter }),
        ...(estadoFilter && { estado: estadoFilter }),
        ...(monedaFilter && { moneda: monedaFilter }),
        ...(entidadFilter && { entidadId: entidadFilter }),
        ...(cuentaFilter && { cuentaBancariaId: cuentaFilter }),
        ...(asientoFilter && { asientoContableId: asientoFilter }),
        ...(dateRange?.from && { fechaDesde: format(dateRange.from, 'yyyy-MM-dd') }),
        ...(dateRange?.to && { fechaHasta: format(dateRange.to, 'yyyy-MM-dd') }),
        ...(montoDesde && { montoDesde }),
        ...(montoHasta && { montoHasta }),
      });

      const response = await fetch(`/api/reportes/transacciones?${params}`);
      if (!response.ok) throw new Error('Error al exportar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transacciones_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Archivo CSV descargado correctamente');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al exportar transacciones');
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabecera y Controles */}
      <div className="bg-white p-3 rounded-xl border shadow-sm space-y-3">
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
              <span className="hidden sm:inline">Exportar</span>
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
              placeholder="Buscar por descripción, entidad, cuenta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 border-slate-200 bg-slate-50/50 focus:bg-white transition-colors text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Select value={tipoFilter || 'all'} onValueChange={(value) => setTipoFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="h-9 w-[110px] text-xs bg-white">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="INGRESO">Ingresos</SelectItem>
                  <SelectItem value="EGRESO">Egresos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={monedaFilter || 'all'} onValueChange={(value) => setMonedaFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="h-9 w-[90px] text-xs bg-white">
                  <SelectValue placeholder="Moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 bg-white border-slate-200 relative">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Más Filtros</span>
                  {(entidadFilter || cuentaFilter || asientoFilter || estadoFilter || dateRange || montoDesde || montoHasta) && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 space-y-4" align="end">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Período</Label>
                    <DatePickerWithRange className="w-full" date={dateRange} onDateChange={setDateRange} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Estado</Label>
                    <Select value={estadoFilter || 'all'} onValueChange={(value) => setEstadoFilter(value === 'all' ? '' : value)}>
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
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Entidad</Label>
                    <Select value={entidadFilter || 'all'} onValueChange={(value) => setEntidadFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Entidad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {entidades.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Cuenta</Label>
                    <Select value={cuentaFilter || 'all'} onValueChange={(value) => setCuentaFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Cuenta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {cuentas.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Asiento</Label>
                    <Select value={asientoFilter || 'all'} onValueChange={(value) => setAsientoFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Asiento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {asientos.map(a => <SelectItem key={a.id} value={a.id}>{a.codigo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-slate-500">Monto Desde</Label>
                      <Input type="number" value={montoDesde} onChange={(e) => setMontoDesde(e.target.value)} className="h-8 text-xs" placeholder="Min" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-slate-500">Monto Hasta</Label>
                      <Input type="number" value={montoHasta} onChange={(e) => setMontoHasta(e.target.value)} className="h-8 text-xs" placeholder="Max" />
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-xs h-8 text-slate-500 hover:text-red-600">Limpiar Filtros</Button>
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm" onClick={fetchTransacciones} disabled={loading} className="h-9 w-9 p-0 border-slate-200 bg-white group">
              <RefreshCw className={cn("h-4 w-4 text-slate-500", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
        {/* Tabla */}
        <div className="relative">
          {loading && transacciones.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-slate-500">Cargando transacciones...</p>
            </div>
          ) : transacciones.length === 0 ? (
            <div className="text-center py-16">
              <Receipt className="mx-auto h-12 w-12 text-slate-200" />
              <h3 className="mt-4 text-sm font-semibold text-slate-900">Sin transacciones</h3>
              <p className="mt-2 text-xs text-slate-500 max-w-xs mx-auto">
                No hay transacciones para mostrar con los filtros aplicados.
              </p>
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button onClick={clearFilters} variant="outline" size="sm">Limpiar filtros</Button>
                <Button onClick={() => setShowForm(true)} size="sm">Nueva transacción</Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <Table className="text-[11px] sm:text-xs">
                <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-sm border-b">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="py-2.5">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('fecha')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                        Fecha {getSortIcon('fecha')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('descripcion')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                        Descripción {getSortIcon('descripcion')}
                      </Button>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('entidad')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                        Entidad {getSortIcon('entidad')}
                      </Button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('cuenta')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                        Cuenta {getSortIcon('cuenta')}
                      </Button>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('asiento')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                        Asiento {getSortIcon('asiento')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('monto')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                        Monto {getSortIcon('monto')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('estado')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                        Estado {getSortIcon('estado')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacciones.map((t) => (
                    <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell className="py-2.5">
                        <div className="flex flex-col leading-tight">
                          <span className="font-bold text-slate-900">{format(new Date(t.fecha), 'dd/MM/yy')}</span>
                          <span className="text-[9px] text-slate-400 uppercase font-medium">{t.moneda}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex flex-col leading-tight max-w-[150px] sm:max-w-xs">
                          <span className="font-medium text-slate-700 truncate">{t.descripcion}</span>
                          <span className="text-[9px] text-slate-400 truncate sm:hidden">
                            {t.entidad.nombre}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 hidden sm:table-cell">
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-slate-700">{t.entidad.nombre}</span>
                          <span className="text-[9px] text-slate-400 capitalize">{t.entidad.tipo.toLowerCase().replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 hidden md:table-cell">
                        <div className="flex flex-col leading-tight">
                          <span className="text-slate-700">{t.cuentaBancaria.nombre}</span>
                          <span className="text-[9px] text-slate-400">{t.cuentaBancaria.banco}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 hidden lg:table-cell">
                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                          {t.asientoContable.codigo}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-right font-mono font-bold tabular-nums">
                        <span className={t.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}>
                          {formatMonto(t.monto, t.moneda)}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[9px] h-4 px-1.5 leading-none shadow-none font-normal border",
                            t.estado === 'PLANIFICADA'
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : "bg-blue-50 text-blue-700 border-blue-100"
                          )}
                        >
                          {t.estado === 'PLANIFICADA' ? 'Plan' : 'Real'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right pr-4">
                        <div className="flex items-center justify-end gap-0.5 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => setEditingTransaccion(t)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeletingTransaccion(t)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

        {/* Paginación */}
        {!loading && transacciones.length > 0 && (
          <div className="px-4 py-3 border-t bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[10px] sm:text-xs text-slate-500 font-medium">
              Viendo <span className="text-slate-900 font-bold">{((currentPage - 1) * pagination.limit) + 1}-{Math.min(currentPage * pagination.limit, pagination.total)}</span> de <span className="text-slate-900 font-bold">{pagination.total}</span> transacciones
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-white border-slate-200"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 h-8 px-3 flex items-center rounded-md shadow-sm">
                {currentPage} / {pagination.pages}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-white border-slate-200"
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
