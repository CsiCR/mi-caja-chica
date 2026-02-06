
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Search, 
  Download, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  FileSpreadsheet,
  Calendar,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Transaccion {
  id: string;
  descripcion: string;
  monto: number;
  moneda: 'ARS' | 'USD';
  tipo: 'INGRESO' | 'EGRESO';
  estado: 'REAL' | 'PLANIFICADA';
  fecha: string;
  fechaPlanificada?: string;
  comentario?: string;
  entidad: { nombre: string; tipo: string };
  cuentaBancaria: { nombre: string; banco: string };
  asientoContable: { codigo: string; nombre: string };
}

interface TransaccionesReportResponse {
  transacciones: Transaccion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  resumen: {
    totalTransacciones: number;
    montoTotal: number;
    detalle: Array<{
      tipo: string;
      moneda: string;
      _sum: { monto: number };
      _count: { _all: number };
    }>;
  };
}

type SortField = 'fecha' | 'descripcion' | 'monto' | 'entidad' | 'cuenta' | 'asiento' | 'tipo' | 'estado';
type SortOrder = 'asc' | 'desc';

export function ReporteTransacciones() {
  const [data, setData] = useState<TransaccionesReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [entidades, setEntidades] = useState<Array<{id: string; nombre: string}>>([]);
  const [cuentas, setCuentas] = useState<Array<{id: string; nombre: string; banco: string}>>([]);
  const [asientos, setAsientos] = useState<Array<{id: string; codigo: string; nombre: string}>>([]);
  
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
      toast.error('Error al cargar las opciones');
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

      const response = await fetch(`/api/reportes/transacciones?${params}`);
      if (!response.ok) throw new Error('Error al cargar reporte');

      const reporteData = await response.json();
      setData(reporteData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar el reporte de transacciones');
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = async () => {
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
      
      toast.success('Reporte exportado correctamente');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al exportar el reporte');
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
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
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

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Reporte Detallado de Transacciones
              </CardTitle>
              <CardDescription>
                Análisis completo de todas tus transacciones con filtros avanzados
              </CardDescription>
            </div>
            <Button onClick={exportToCsv} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Búsqueda y rango de fechas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar en descripción, comentario, entidad, cuenta o asiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <DatePickerWithRange
                className="w-full"
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>

            {/* Filtros de categoría */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <Select value={tipoFilter || 'all'} onValueChange={(value) => setTipoFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="INGRESO">Ingresos</SelectItem>
                  <SelectItem value="EGRESO">Egresos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={estadoFilter || 'all'} onValueChange={(value) => setEstadoFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="REAL">Reales</SelectItem>
                  <SelectItem value="PLANIFICADA">Planificadas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={monedaFilter || 'all'} onValueChange={(value) => setMonedaFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>

              <Select value={entidadFilter || 'all'} onValueChange={(value) => setEntidadFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Entidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {entidades.map((entidad) => (
                    <SelectItem key={entidad.id} value={entidad.id}>
                      {entidad.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={cuentaFilter || 'all'} onValueChange={(value) => setCuentaFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Cuenta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {cuentas.map((cuenta) => (
                    <SelectItem key={cuenta.id} value={cuenta.id}>
                      {cuenta.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={asientoFilter || 'all'} onValueChange={(value) => setAsientoFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Asiento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {asientos.map((asiento) => (
                    <SelectItem key={asiento.id} value={asiento.id}>
                      {asiento.codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters} className="w-full">
                Limpiar
              </Button>
            </div>

            {/* Filtros de monto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Monto desde</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={montoDesde}
                  onChange={(e) => setMontoDesde(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto hasta</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="999999.99"
                  value={montoHasta}
                  onChange={(e) => setMontoHasta(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Transacciones</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.resumen.totalTransacciones.toLocaleString('es-AR')}
                  </p>
                </div>
                <FileSpreadsheet className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          {data.resumen.detalle.map((item) => (
            <Card key={`${item.tipo}-${item.moneda}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {item.tipo === 'INGRESO' ? 'Ingresos' : 'Egresos'} ({item.moneda})
                    </p>
                    <p className={`text-2xl font-bold ${item.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatMonto(Number(item._sum.monto) || 0, item.moneda)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item._count._all} transacciones
                    </p>
                  </div>
                  {item.tipo === 'INGRESO' ? (
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabla de Transacciones */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Transacciones</CardTitle>
          {data && (
            <CardDescription>
              Mostrando {data.transacciones.length} de {data.pagination.total} transacciones
              {dateRange?.from && dateRange?.to && (
                <span className="block mt-1">
                  Período: {format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - {format(dateRange.to, 'dd/MM/yyyy', { locale: es })}
                </span>
              )}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-500">Cargando reporte...</p>
            </div>
          ) : data && data.transacciones.length > 0 ? (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('fecha')} className="h-auto p-0 hover:bg-transparent">
                          Fecha {getSortIcon('fecha')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('descripcion')} className="h-auto p-0 hover:bg-transparent">
                          Descripción {getSortIcon('descripcion')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('entidad')} className="h-auto p-0 hover:bg-transparent">
                          Entidad {getSortIcon('entidad')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('cuenta')} className="h-auto p-0 hover:bg-transparent">
                          Cuenta {getSortIcon('cuenta')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('asiento')} className="h-auto p-0 hover:bg-transparent">
                          Asiento {getSortIcon('asiento')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('tipo')} className="h-auto p-0 hover:bg-transparent">
                          Tipo {getSortIcon('tipo')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" onClick={() => handleSort('monto')} className="h-auto p-0 hover:bg-transparent">
                          Monto {getSortIcon('monto')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('estado')} className="h-auto p-0 hover:bg-transparent">
                          Estado {getSortIcon('estado')}
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.transacciones.map((transaccion) => (
                      <TableRow key={transaccion.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
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
                          <div className="flex flex-col max-w-xs">
                            <span className="font-medium truncate">{transaccion.descripcion}</span>
                            {transaccion.comentario && (
                              <span className="text-xs text-gray-500 truncate">
                                {transaccion.comentario}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{transaccion.entidad.nombre}</span>
                            <span className="text-xs text-gray-500 capitalize">
                              {transaccion.entidad.tipo.toLowerCase().replace('_', ' ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{transaccion.cuentaBancaria.nombre}</span>
                            <span className="text-xs text-gray-500">{transaccion.cuentaBancaria.banco}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-sm">{transaccion.asientoContable.codigo}</span>
                            <span className="text-xs text-gray-500">{transaccion.asientoContable.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaccion.tipo === 'INGRESO' ? 'default' : 'destructive'}>
                            {transaccion.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-mono font-bold ${transaccion.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaccion.tipo === 'INGRESO' ? '+' : '-'}{formatMonto(transaccion.monto, transaccion.moneda)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaccion.estado === 'REAL' ? 'default' : 'secondary'}>
                            {transaccion.estado === 'REAL' ? 'Real' : 'Planificada'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {data.pagination.pages > 1 && (
                <div className="flex items-center justify-between px-2 mt-4">
                  <div className="text-sm text-gray-500">
                    Mostrando {((data.pagination.page - 1) * data.pagination.limit) + 1} a{' '}
                    {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} de {data.pagination.total} transacciones
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
                      Página {currentPage} de {data.pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(data.pagination.pages, prev + 1))}
                      disabled={currentPage === data.pagination.pages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No hay transacciones</h3>
              <p className="mt-2 text-gray-500">
                No se encontraron transacciones con los filtros aplicados.
              </p>
              <Button onClick={clearFilters} className="mt-4" variant="outline">
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
