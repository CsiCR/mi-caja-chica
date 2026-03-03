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
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  MoreVertical,
  Loader2,
  Filter,
  Edit2,
  Trash2
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TransaccionForm } from '../transacciones/transaccion-form';
import { TransaccionDeleteDialog } from '../transacciones/transaccion-delete-dialog';
import { Transaccion } from '../transacciones/transacciones-list';
import toast from 'react-hot-toast';


interface TransaccionesReportResponse {
  transacciones: Transaccion[];
  saldosIniciales?: Record<string, Record<string, number>>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  resumen: {
    totalTransacciones: number;
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
  const [agruparMayorPor, setAgruparMayorPor] = useState<'CUENTA' | 'ASIENTO'>('ASIENTO');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Estados para edición y eliminación
  const [selectedTransaccion, setSelectedTransaccion] = useState<Transaccion | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchTransacciones = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
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
        sortBy,
        sortOrder,
        page: currentPage.toString(),
        limit: '25',
        modo,
        agruparPor: agruparMayorPor
      });

      const response = await fetch(`/api/reportes/transacciones?${params}`);
      if (!response.ok) throw new Error('Error al cargar transacciones');

      const reporteData = await response.json();
      setData(reporteData);
    } catch (error) {
      console.error('Error al cargar transacciones:', error);
      toast.error('Error al cargar transacciones');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const toggleAllGroups = (expand: boolean) => {
    if (!data) return;
    const groups = data.transacciones.reduce((acc: string[], t: Transaccion) => {
      const groupKey = agruparMayorPor === 'ASIENTO' ? t.asientoContable.codigo : t.cuentaBancaria.id;
      if (!acc.includes(groupKey)) acc.push(groupKey);
      return acc;
    }, []);
    const next: Record<string, boolean> = {};
    groups.forEach((g: string) => next[g] = expand);
    setExpandedGroups(next);
  };

  useEffect(() => {
    fetchTransacciones();
  }, [searchTerm, tipoFilter, estadoFilter, monedaFilter, entidadFilter, cuentaFilter, asientoFilter, dateRange, montoDesde, montoHasta, sortBy, sortOrder, currentPage, modo, agruparMayorPor]);

  const handleEdit = (t: Transaccion) => {
    setSelectedTransaccion(t);
    setIsEditOpen(true);
  };

  const handleDelete = (t: Transaccion) => {
    setSelectedTransaccion(t);
    setIsDeleteOpen(true);
  };

  const handleSuccess = () => {
    setIsEditOpen(false);
    setIsDeleteOpen(false);
    setSelectedTransaccion(null);
    fetchTransacciones();
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
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const formatMonto = (monto: number, moneda: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda,
    }).format(monto);
  };

  const getMontoColor = (monto: number) => {
    if (monto > 0) return 'text-green-600';
    if (monto < 0) return 'text-red-600'; // Rojo un poco más fuerte para que se vea bien
    return 'text-slate-400';
  };

  const exportToCsv = () => {
    const params = new URLSearchParams({
      search: searchTerm,
      ...(tipoFilter && { tipo: tipoFilter }),
      ...(estadoFilter && { estado: estadoFilter }),
      ...(monedaFilter && { moneda: monedaFilter }),
      ...(entidadFilter && { entidadId: entidadFilter }),
      ...(cuentaFilter && { cuentaBancariaId: cuentaFilter }),
      ...(asientoFilter && { asientoContableId: asientoFilter }),
      ...(dateRange?.from && { fechaDesde: format(dateRange.from, 'yyyy-MM-dd') }),
      ...(dateRange?.to && { fechaHasta: format(dateRange.to, 'yyyy-MM-dd') }),
      export: 'csv'
    });
    window.open(`/api/reportes/transacciones?${params}`, '_blank');
  };

  return (
    <div className="space-y-4 relative">
      {/* Overlay de Carga */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-xl transition-all duration-300">
          <div className="flex flex-col items-center p-6 bg-white shadow-2xl rounded-2xl border border-slate-200 animate-in fade-in zoom-in duration-300">
            <div className="relative">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
            <span className="mt-4 text-sm font-bold text-slate-700 tracking-tight uppercase">Actualizando Reporte</span>
            <p className="mt-1 text-[10px] text-slate-500 font-medium">Por favor, espera un momento...</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por descripción..."
              className="pl-9 h-9 text-xs bg-white border-slate-200 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>


          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-2 bg-white border-slate-200 shadow-sm">
                <Filter className="h-3.5 w-3.5" />
                Más Filtros {(entidadFilter || cuentaFilter || asientoFilter || dateRange || montoDesde || montoHasta) && <Badge className="h-4 w-4 p-0 flex items-center justify-center bg-primary text-white">!</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-4" align="start">
              <div className="grid gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold leading-none text-xs uppercase tracking-wider text-slate-500">Filtros Avanzados</h4>
                  <p className="text-[10px] text-muted-foreground font-medium">Personaliza los resultados del reporte.</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="col-span-2 space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Período de Fecha</Label>
                    <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Tipo Transacción</Label>
                    <Select value={tipoFilter || 'all'} onValueChange={(value) => setTipoFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger className="h-8 text-xs bg-white shadow-sm">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="INGRESO">Ingresos</SelectItem>
                        <SelectItem value="EGRESO">Egresos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Estado Pago</Label>
                    <Select value={estadoFilter || 'all'} onValueChange={(value) => setEstadoFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger className="h-8 text-xs bg-white shadow-sm">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="REAL">Reales</SelectItem>
                        <SelectItem value="PLANIFICADA">Planificadas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Moneda</Label>
                    <Select value={monedaFilter || 'all'} onValueChange={(value) => setMonedaFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Asiento</Label>
                    <Select value={asientoFilter || 'all'} onValueChange={(value) => setAsientoFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Asiento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {asientos.map(a => <SelectItem key={a.id} value={a.id}>{a.codigo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Entidad</Label>
                    <Select value={entidadFilter || 'all'} onValueChange={(value) => setEntidadFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Entidad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {entidades.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Cuenta</Label>
                    <Select value={cuentaFilter || 'all'} onValueChange={(value) => setCuentaFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Cuenta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {cuentas.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Monto (Desde - Hasta)</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" value={montoDesde} onChange={(e) => setMontoDesde(e.target.value)} className="h-8 py-0 px-2 text-[11px]" placeholder="Min" />
                      <span className="text-slate-300">-</span>
                      <Input type="number" value={montoHasta} onChange={(e) => setMontoHasta(e.target.value)} className="h-8 py-0 px-2 text-[11px]" placeholder="Max" />
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-xs h-9 hover:bg-slate-100 mt-2 font-bold text-slate-700">Limpiar Filtros</Button>
              </div>
            </PopoverContent>
          </Popover>
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

          {modo === 'MAYOR' && (
            <div className="flex items-center bg-blue-50 border border-blue-100 rounded-lg p-0.5 mr-2">
              <Button
                variant={agruparMayorPor === 'ASIENTO' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setAgruparMayorPor('ASIENTO')}
                className={`h-7 text-[10px] px-2 ${agruparMayorPor === 'ASIENTO' ? 'bg-white shadow-sm' : 'text-blue-600'}`}
              >
                Por Asiento
              </Button>
              <Button
                variant={agruparMayorPor === 'CUENTA' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setAgruparMayorPor('CUENTA')}
                className={`h-7 text-[10px] px-2 ${agruparMayorPor === 'CUENTA' ? 'bg-white shadow-sm' : 'text-blue-600'}`}
              >
                Por Cuenta
              </Button>
            </div>
          )}

          {modo === 'MAYOR' && (
            <div className="flex items-center gap-1.5 mr-2 ml-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAllGroups(true)}
                className="h-8 w-8 p-0 bg-white border-slate-200 text-slate-500 hover:text-blue-600"
                title="Expandir todo"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAllGroups(false)}
                className="h-8 w-8 p-0 bg-white border-slate-200 text-slate-500 hover:text-orange-600"
                title="Colapsar todo"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {data && data.resumen && data.resumen.detalle && (
            <div className="hidden xl:flex items-center gap-4 mr-3 text-[10px] font-medium border-x px-4">
              {['ARS', 'USD'].map(mon => {
                const ing = data.resumen.detalle.find((d: any) => d.tipo === 'INGRESO' && d.moneda === mon)?._sum.monto || 0;
                const egr = data.resumen.detalle.find((d: any) => d.tipo === 'EGRESO' && d.moneda === mon)?._sum.monto || 0;
                if (Number(ing) === 0 && Number(egr) === 0) return null;
                return (
                  <div key={mon} className="flex flex-col items-center">
                    <span className="text-[7px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1 opacity-60">{mon}</span>
                    <div className="flex items-center gap-2 leading-none">
                      <span className="text-green-600 font-mono font-bold">{formatMonto(Number(ing), mon)}</span>
                      <span className="text-slate-300 font-light">/</span>
                      <span className="text-red-500 font-mono font-bold">{formatMonto(Number(egr), mon)}</span>
                    </div>
                  </div>
                );
              })}
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
        </div>
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
                  {modo === 'LISTA' && (
                    <TableHead className="text-center border-b">
                      <Button variant="ghost" onClick={() => handleSort('estado')} className="h-auto p-0 hover:bg-transparent font-bold text-[10px] uppercase">
                        Estado {getSortIcon('estado')}
                      </Button>
                    </TableHead>
                  )}
                  <TableHead className="border-b w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modo === 'MAYOR' ? (
                  Object.entries(
                    data.transacciones.reduce((acc, t) => {
                      const groupKey = agruparMayorPor === 'ASIENTO' ? t.asientoContable.codigo : t.cuentaBancaria.id;
                      if (!acc[groupKey]) acc[groupKey] = {
                        info: agruparMayorPor === 'ASIENTO' ? t.asientoContable : t.cuentaBancaria,
                        items: []
                      };
                      acc[groupKey].items.push(t);
                      return acc;
                    }, {} as Record<string, { info: any, items: Transaccion[] }>)
                  ).map(([groupKey, group]) => {
                    const inicialesGroup = data.saldosIniciales?.[agruparMayorPor === 'ASIENTO' ? group.info.id : groupKey] || {};
                    const runningBalances: Record<string, number> = {
                      ARS: Number(inicialesGroup.ARS || 0),
                      USD: Number(inicialesGroup.USD || 0)
                    };
                    const isExpanded = expandedGroups[groupKey] !== false;
                    const totalIngresos: Record<string, number> = {};
                    const totalEgresos: Record<string, number> = {};

                    group.items.forEach(t => {
                      if (t.tipo === 'INGRESO') totalIngresos[t.moneda] = (totalIngresos[t.moneda] || 0) + Number(t.monto);
                      else totalEgresos[t.moneda] = (totalEgresos[t.moneda] || 0) + Number(t.monto);
                    });

                    return (
                      <React.Fragment key={groupKey}>
                        <TableRow className="bg-slate-50 hover:bg-slate-100/80 cursor-pointer" onClick={() => toggleGroup(groupKey)}>
                          <TableCell colSpan={8} className="py-2 border-b border-t font-bold">
                            <div className="flex items-center gap-3">
                              {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}

                              <div className="flex flex-col">
                                <span className="uppercase text-[9px] text-slate-400 leading-none mb-0.5">
                                  {agruparMayorPor === 'ASIENTO' ? 'Asiento' : 'Cuenta'}
                                </span>
                                <span className="text-primary text-sm truncate max-w-[200px] sm:max-w-none">
                                  {agruparMayorPor === 'ASIENTO'
                                    ? `${group.info.codigo} - ${group.info.nombre}`
                                    : `${group.info.nombre} (${group.info.banco})`}
                                </span>
                              </div>

                              <div className="hidden sm:flex items-center gap-6 ml-auto mr-4">
                                <div className="flex flex-col items-end">
                                  <span className="text-[8px] text-slate-400 uppercase leading-none">Saldo Inicial</span>
                                  <div className="flex gap-2">
                                    {Object.entries(inicialesGroup).map(([mon, saldo]) => (
                                      <span key={mon} className={`font-mono text-[10px] font-bold ${getMontoColor(Number(saldo))}`}>
                                        {formatMonto(Number(saldo), mon)}
                                      </span>
                                    ))}
                                    {Object.keys(inicialesGroup).length === 0 && <span className="font-mono text-[10px] text-slate-400">$ 0,00</span>}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end border-l pl-4">
                                  <span className="text-[8px] text-slate-400 uppercase leading-none">Movimientos</span>
                                  <div className="flex gap-2">
                                    {['ARS', 'USD'].map(mon => {
                                      const ing = totalIngresos[mon] || 0;
                                      const egr = totalEgresos[mon] || 0;
                                      if (ing === 0 && egr === 0) return null;
                                      return (
                                        <div key={mon} className="flex gap-1.5 font-mono text-[10px]">
                                          <span className="text-green-600">+{formatMonto(ing, mon)}</span>
                                          <span className="text-red-600">-{formatMonto(egr, mon)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end border-l pl-4">
                                  <span className="text-[8px] text-slate-400 uppercase leading-none">Saldo Final</span>
                                  <div className="flex gap-2">
                                    {['ARS', 'USD'].map(mon => {
                                      const ing = totalIngresos[mon] || 0;
                                      const egr = totalEgresos[mon] || 0;
                                      const ini = Number(inicialesGroup[mon] || 0);
                                      const fin = ini + ing - egr;
                                      if (ing === 0 && egr === 0 && ini === 0) return null;
                                      return (
                                        <span key={mon} className={`font-mono text-[11px] font-bold underline decoration-current/30 ${getMontoColor(fin)}`}>
                                          {formatMonto(fin, mon)}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>

                        {isExpanded && group.items.map((transaccion) => {
                          const mon = transaccion.moneda;
                          const afectaSaldo = transaccion.estado === 'REAL' || estadoFilter === 'PLANIFICADA' || !estadoFilter;
                          if (afectaSaldo) {
                            if (transaccion.tipo === 'INGRESO') runningBalances[mon] += Number(transaccion.monto);
                            else runningBalances[mon] -= Number(transaccion.monto);
                          }
                          const currentBalance = runningBalances[mon];
                          return (
                            <TableRow key={transaccion.id} className="hover:bg-blue-50/30 transition-colors">
                              <TableCell className="py-2 border-b">
                                <div className="flex flex-col leading-tight">
                                  <span className="font-semibold">{format(new Date(transaccion.fecha), 'dd/MM/yy')}</span>
                                  <span className="text-[9px] text-muted-foreground uppercase">{transaccion.moneda}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 border-b">
                                <span className="font-medium truncate block max-w-[120px] sm:max-w-xs">{transaccion.descripcion}</span>
                              </TableCell>
                              <TableCell className="py-2 border-b hidden sm:table-cell">
                                <span className="text-slate-600">{transaccion.entidad.nombre}</span>
                              </TableCell>
                              {agruparMayorPor === 'CUENTA' ? (
                                <TableCell className="py-2 border-b hidden md:table-cell">
                                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{transaccion.asientoContable.codigo}</span>
                                </TableCell>
                              ) : (
                                <TableCell className="py-2 border-b hidden md:table-cell">
                                  <span className="text-slate-600">{transaccion.cuentaBancaria.nombre}</span>
                                </TableCell>
                              )}
                              <TableCell className="hidden lg:table-cell border-b"></TableCell>
                              <TableCell className="text-right py-2 border-b font-mono font-bold">
                                <span className={transaccion.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}>
                                  {transaccion.tipo === 'INGRESO' ? '+' : '-'}{formatMonto(transaccion.monto, transaccion.moneda)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right py-2 border-b font-mono font-bold bg-slate-50/30">
                                <span className={currentBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}>
                                  {formatMonto(currentBalance, transaccion.moneda)}
                                </span>
                              </TableCell>
                              <TableCell className="py-2 border-b text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-200">
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="text-xs">
                                    <DropdownMenuItem onClick={() => handleEdit(transaccion)} className="cursor-pointer gap-2">
                                      <Edit2 className="h-3 w-3" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(transaccion)} className="cursor-pointer gap-2 text-red-600">
                                      <Trash2 className="h-3 w-3" /> Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                ) : (
                  data.transacciones.map((transaccion) => (
                    <TableRow key={transaccion.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="py-2 border-b">
                        <div className="flex flex-col leading-tight">
                          <span className="font-semibold">{format(new Date(transaccion.fecha), 'dd/MM/yy')}</span>
                          <span className="text-[9px] text-muted-foreground uppercase">{transaccion.moneda}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 border-b">
                        <span className="font-medium truncate">{transaccion.descripcion}</span>
                      </TableCell>
                      <TableCell className="py-2 border-b hidden sm:table-cell">
                        <span className="font-medium">{transaccion.entidad.nombre}</span>
                      </TableCell>
                      <TableCell className="py-2 border-b hidden md:table-cell">
                        <span>{transaccion.cuentaBancaria.nombre}</span>
                      </TableCell>
                      <TableCell className="py-2 border-b hidden lg:table-cell">
                        <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">{transaccion.asientoContable.codigo}</span>
                      </TableCell>
                      <TableCell className="text-right py-2 border-b font-mono font-bold">
                        <span className={transaccion.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}>
                          {formatMonto(transaccion.monto, transaccion.moneda)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2 border-b">
                        <Badge variant="secondary" className="text-[9px]">
                          {transaccion.estado === 'PLANIFICADA' ? 'Plan' : 'Real'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 border-b text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-200">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(transaccion)} className="cursor-pointer gap-2">
                              <Edit2 className="h-3 w-3" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(transaccion)} className="cursor-pointer gap-2 text-red-600">
                              <Trash2 className="h-3 w-3" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 bg-slate-50 p-2 rounded-lg border">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Total: {data.pagination.total}</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-7 text-[10px]">Anterior</Button>
              <span className="text-[10px] font-bold">{currentPage} / {data.pagination.pages}</span>
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(data.pagination.pages, p + 1))} disabled={currentPage === data.pagination.pages} className="h-7 text-[10px]">Siguiente</Button>
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

      {selectedTransaccion && (
        <>
          <TransaccionForm
            open={isEditOpen}
            onClose={() => { setIsEditOpen(false); setSelectedTransaccion(null); }}
            onSuccess={handleSuccess}
            transaccion={selectedTransaccion}
          />
          <TransaccionDeleteDialog
            open={isDeleteOpen}
            onClose={() => { setIsDeleteOpen(false); setSelectedTransaccion(null); }}
            onSuccess={handleSuccess}
            transaccion={selectedTransaccion}
          />
        </>
      )}
    </div>
  );
}
