
'use client';

import React, { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  HelpCircle,
  Eye,
  Filter
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  cuentaBancaria: { id: string; nombre: string; banco: string };
  asientoContable: { codigo: string; nombre: string };
}

interface TransaccionesReportResponse {
  transacciones: Transaccion[];
  saldosIniciales?: Record<string, number>;
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
  const [modo, setModo] = useState<'LISTA' | 'MAYOR'>('LISTA');

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
    sortOrder,
    modo
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
    <div className="space-y-4 -mt-4">
      {/* Barra de Filtros Compacta Zen */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 bg-slate-50 border rounded-lg sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
          <div className="relative w-full sm:w-[200px]">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-xs bg-white"
            />
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Select value={tipoFilter || 'all'} onValueChange={(value) => setTipoFilter(value === 'all' ? '' : value)}>
              <SelectTrigger className="h-8 w-[110px] text-xs bg-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="INGRESO">Ingresos</SelectItem>
                <SelectItem value="EGRESO">Egresos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={monedaFilter || 'all'} onValueChange={(value) => setMonedaFilter(value === 'all' ? '' : value)}>
              <SelectTrigger className="h-8 w-[90px] text-xs bg-white">
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
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1 bg-white">
                <Filter className="h-3 w-3" />
                <span className="hidden sm:inline">Más Filtros</span>
                {(entidadFilter || cuentaFilter || asientoFilter || estadoFilter || dateRange || montoDesde || montoHasta) && (
                  <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center rounded-full text-[10px]">
                    !
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-4" align="start">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Período</Label>
                  <DatePickerWithRange className="w-full mt-1" date={dateRange} onDateChange={setDateRange} />
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Estado</Label>
                  <Select value={estadoFilter || 'all'} onValueChange={(value) => setEstadoFilter(value === 'all' ? '' : value)}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="REAL">Reales</SelectItem>
                      <SelectItem value="PLANIFICADA">Planificadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Entidad</Label>
                  <Select value={entidadFilter || 'all'} onValueChange={(value) => setEntidadFilter(value === 'all' ? '' : value)}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Entidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {entidades.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cuenta</Label>
                  <Select value={cuentaFilter || 'all'} onValueChange={(value) => setCuentaFilter(value === 'all' ? '' : value)}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {cuentas.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Asiento</Label>
                  <Select value={asientoFilter || 'all'} onValueChange={(value) => setAsientoFilter(value === 'all' ? '' : value)}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Asiento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {asientos.map(a => <SelectItem key={a.id} value={a.id}>{a.codigo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Desde</Label>
                    <Input type="number" value={montoDesde} onChange={(e) => setMontoDesde(e.target.value)} className="h-8 text-xs mt-1" placeholder="Min" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Hasta</Label>
                    <Input type="number" value={montoHasta} onChange={(e) => setMontoHasta(e.target.value)} className="h-8 text-xs mt-1" placeholder="Max" />
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-xs h-8">Limpiar Filtros</Button>
            </PopoverContent>
          </Popover>
        </div>

      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <div className="flex items-center bg-white border rounded-lg p-0.5 mr-2">
          <Button
            variant={modo === 'LISTA' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => { setModo('LISTA'); setSortBy('fecha'); setSortOrder('desc'); }}
            className="h-7 text-[10px] px-2"
          >
            Lista
          </Button>
          <Button
            variant={modo === 'MAYOR' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => { setModo('MAYOR'); setSortBy('fecha'); setSortOrder('asc'); }}
            className="h-7 text-[10px] px-2"
          >
            Libro Mayor
          </Button>
        </div>

        {data && (
          <div className="hidden lg:flex items-center gap-3 mr-2 text-[10px] font-medium border-r pr-3">
            <div className="flex flex-col items-end leading-none">
              <span className="text-[8px] text-gray-400 uppercase">Ingresos</span>
              <span className="text-green-600">{formatMonto(data.resumen.detalle.find(d => d.tipo === 'INGRESO' && d.moneda === 'ARS')?._sum.monto || 0, 'ARS')}</span>
            </div>
            <div className="flex flex-col items-end leading-none">
              <span className="text-[8px] text-gray-400 uppercase">Egresos</span>
              <span className="text-red-600">{formatMonto(data.resumen.detalle.find(d => d.tipo === 'EGRESO' && d.moneda === 'ARS')?._sum.monto || 0, 'ARS')}</span>
            </div>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={exportToCsv} className="h-8 text-xs gap-1 bg-white">
          <Download className="h-3 w-3" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>

        <Button size="sm" onClick={fetchTransacciones} disabled={loading} className="h-8 text-xs">
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="font-semibold text-sm leading-none flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Detalle de Transacciones Zen
                </h4>
                <p className="text-[11px] text-muted-foreground">Guía rápida de funciones</p>
              </div>
              <div className="grid gap-3 text-xs">
                <div className="flex gap-2">
                  <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 bg-slate-50">
                    <Search className="h-2 w-2" />
                  </div>
                  <div>
                    <p className="font-medium">Búsqueda rápida</p>
                    <p className="text-muted-foreground text-[10px]">Busca por descripción, entidad, cuenta o código de asiento instantáneamente.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 bg-slate-50">
                    <Download className="h-2 w-2" />
                  </div>
                  <div>
                    <p className="font-medium">Exportación Directa</p>
                    <p className="text-muted-foreground text-[10px]">Usa el botón de exportar para bajar el CSV con los filtros aplicados.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 bg-slate-50">
                    <ArrowUpDown className="h-2 w-2" />
                  </div>
                  <div>
                    <p className="font-medium">Libro Mayor</p>
                    <p className="text-muted-foreground text-[10px]">Agrupa por cuenta, muestra saldos iniciales y el rastro del saldo progresivo.</p>
                  </div>
                </div>
              </div>
              <Button onClick={exportToCsv} size="sm" className="w-full text-[10px] h-7 gap-1">
                <Download className="h-3 w-3" />
                Descargar CSV Actual
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tabla de Transacciones */}
      {data && data.transacciones.length > 0 ? (
        <div className="relative border rounded-lg bg-white overflow-hidden shadow-sm">
          <div className="overflow-auto max-h-[calc(100vh-200px)] no-scrollbar">
            <Table className="border-separate border-spacing-0 text-[11px] sm:text-xs">
              <TableHeader className="sticky top-0 z-20 bg-white shadow-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-2 border-b">
                    <Button variant="ghost" onClick={() => handleSort('fecha')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase">
                      Fecha {getSortIcon('fecha')}
                    </Button>
                  </TableHead>
                  <TableHead className="border-b">
                    <Button variant="ghost" onClick={() => handleSort('descripcion')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase">
                      Descripción {getSortIcon('descripcion')}
                    </Button>
                  </TableHead>
                  <TableHead className="border-b hidden sm:table-cell">
                    <Button variant="ghost" onClick={() => handleSort('entidad')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase">
                      Entidad {getSortIcon('entidad')}
                    </Button>
                  </TableHead>
                  <TableHead className="border-b hidden md:table-cell">
                    <Button variant="ghost" onClick={() => handleSort('cuenta')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase">
                      Cuenta {getSortIcon('cuenta')}
                    </Button>
                  </TableHead>
                  <TableHead className="border-b hidden lg:table-cell">
                    <Button variant="ghost" onClick={() => handleSort('asiento')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase">
                      Asiento {getSortIcon('asiento')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right border-b">
                    <Button variant="ghost" onClick={() => handleSort('monto')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase">
                      Monto {getSortIcon('monto')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center border-b">
                    <Button variant="ghost" onClick={() => handleSort('estado')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase">
                      Estado {getSortIcon('estado')}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modo === 'MAYOR' ? (
                  // Renderizado Libro Mayor (Agrupado por Cuenta)
                  Object.entries(
                    data.transacciones.reduce((acc, t) => {
                      const key = t.cuentaBancaria.id;
                      if (!acc[key]) acc[key] = { info: t.cuentaBancaria, items: [] };
                      acc[key].items.push(t);
                      return acc;
                    }, {} as Record<string, { info: any, items: Transaccion[] }>)
                  ).map(([cuentaId, group]) => {
                    let runningBalance = data.saldosIniciales?.[cuentaId] || 0;
                    return (
                      <React.Fragment key={cuentaId}>
                        {/* Cabecera de Cuenta */}
                        <TableRow className="bg-slate-100/50 hover:bg-slate-100/50">
                          <TableCell colSpan={7} className="py-2 border-b font-bold">
                            <div className="flex items-center justify-between">
                              <span className="uppercase text-[10px] text-slate-500 mr-2">Cuenta:</span>
                              <span className="text-primary">{group.info.nombre} ({group.info.banco})</span>
                              <div className="flex-1"></div>
                              <span className="text-[10px] font-normal text-slate-500 uppercase mr-2">Saldo Inicial:</span>
                              <span className="font-mono">{formatMonto(data.saldosIniciales?.[cuentaId] || 0, group.items[0]?.moneda || 'ARS')}</span>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Transacciones del Grupo */}
                        {group.items.map((transaccion) => {
                          if (transaccion.estado === 'REAL') {
                            if (transaccion.tipo === 'INGRESO') runningBalance += Number(transaccion.monto);
                            else runningBalance -= Number(transaccion.monto);
                          }
                          return (
                            <TableRow key={transaccion.id} className="hover:bg-slate-50 transition-colors">
                              <TableCell className="py-2 border-b">
                                <div className="flex flex-col leading-tight">
                                  <span className="font-semibold">{format(new Date(transaccion.fecha), 'dd/MM/yy')}</span>
                                  <span className="text-[9px] text-muted-foreground uppercase">{transaccion.moneda}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 border-b">
                                <div className="flex flex-col leading-tight max-w-[120px] sm:max-w-xs">
                                  <span className="font-medium truncate">{transaccion.descripcion}</span>
                                  <span className="text-[9px] text-muted-foreground truncate sm:hidden">
                                    {transaccion.entidad.nombre}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 border-b hidden sm:table-cell">
                                <div className="flex flex-col leading-tight">
                                  <span className="font-medium">{transaccion.entidad.nombre}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 border-b hidden md:table-cell">
                                <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">{transaccion.asientoContable.codigo}</span>
                              </TableCell>
                              <TableCell className="text-right py-2 border-b font-mono font-bold tabular-nums">
                                <span className={transaccion.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}>
                                  {transaccion.tipo === 'INGRESO' ? '+' : '-'}{formatMonto(transaccion.monto, transaccion.moneda)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right py-2 border-b font-mono font-bold tabular-nums bg-slate-50/50">
                                <span className={runningBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}>
                                  {formatMonto(runningBalance, transaccion.moneda)}
                                </span>
                              </TableCell>
                              <TableCell className="text-center py-2 border-b">
                                <Badge variant="secondary" className={`text-[9px] h-4 px-1 leading-none shadow-none font-normal ${transaccion.estado === 'PLANIFICADA' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                  {transaccion.estado === 'PLANIFICADA' ? 'P' : 'R'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}

                        {/* Totales de la Cuenta */}
                        <TableRow className="bg-slate-50 hover:bg-slate-50 font-bold border-t-2">
                          <TableCell colSpan={4} className="py-2 text-right uppercase text-[9px] text-slate-500">Subtotales {group.info.nombre}:</TableCell>
                          <TableCell className="text-right py-2 font-mono">
                            <div className="flex flex-col items-end leading-none">
                              <span className="text-green-600 text-[10px]">+{formatMonto(group.items.filter(i => i.tipo === 'INGRESO').reduce((sum, i) => sum + Number(i.monto), 0), group.items[0]?.moneda || 'ARS')}</span>
                              <span className="text-red-600 text-[10px]">-{formatMonto(group.items.filter(i => i.tipo === 'EGRESO').reduce((sum, i) => sum + Number(i.monto), 0), group.items[0]?.moneda || 'ARS')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-2 font-mono text-primary underline underline-offset-2">
                            {formatMonto(runningBalance, group.items[0]?.moneda || 'ARS')}
                          </TableCell>
                          <TableCell className="border-b"></TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })
                ) : (
                  // Renderizado Lista Normal
                  data.transacciones.map((transaccion) => (
                    <TableRow key={transaccion.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="py-2 border-b">
                        <div className="flex flex-col leading-tight">
                          <span className="font-semibold">{format(new Date(transaccion.fecha), 'dd/MM/yy')}</span>
                          <span className="text-[9px] text-muted-foreground uppercase">{transaccion.moneda}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 border-b">
                        <div className="flex flex-col leading-tight max-w-[120px] sm:max-w-xs">
                          <span className="font-medium truncate">{transaccion.descripcion}</span>
                          <span className="text-[9px] text-muted-foreground truncate sm:hidden">
                            {transaccion.entidad.nombre}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 border-b hidden sm:table-cell">
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium">{transaccion.entidad.nombre}</span>
                          <span className="text-[9px] text-muted-foreground capitalize">{transaccion.entidad.tipo.toLowerCase().replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 border-b hidden md:table-cell">
                        <div className="flex flex-col leading-tight">
                          <span>{transaccion.cuentaBancaria.nombre}</span>
                          <span className="text-[9px] text-muted-foreground">{transaccion.cuentaBancaria.banco}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 border-b hidden lg:table-cell">
                        <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">{transaccion.asientoContable.codigo}</span>
                      </TableCell>
                      <TableCell className="text-right py-2 border-b font-mono font-bold tabular-nums">
                        <span className={transaccion.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}>
                          {formatMonto(transaccion.monto, transaccion.moneda)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2 border-b">
                        <Badge variant="secondary" className={`text-[9px] h-4 px-1 leading-none shadow-none font-normal ${transaccion.estado === 'PLANIFICADA' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                          {transaccion.estado === 'PLANIFICADA' ? 'Plan' : 'Real'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación Compacta */}
          <div className="flex items-center justify-between mt-4 bg-slate-50 p-2 rounded-lg border">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">
              Total: {data.pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="h-7 text-[10px] px-2">
                Anterior
              </Button>
              <span className="text-[10px] font-bold">
                {currentPage} / {data.pagination.pages}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(prev => Math.min(data.pagination.pages, prev + 1))} disabled={currentPage === data.pagination.pages} className="h-7 text-[10px] px-2">
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-slate-50/50">
          <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-200" />
          <p className="mt-2 text-xs text-muted-foreground">No se encontraron transacciones.</p>
          <Button onClick={clearFilters} className="mt-4 h-8 text-xs" variant="outline">Limpiar filtros</Button>
        </div>
      )}
    </div>
  );
}
