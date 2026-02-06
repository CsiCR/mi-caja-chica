
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CalendarDays,
  CalendarClock,
  Edit,
  HelpCircle,
  Filter,
  Eye
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { EditarAntesFinalizarDialog } from '@/components/transacciones/editar-antes-finalizar-dialog';

interface TransaccionPlanificada {
  id: string;
  descripcion: string;
  monto: number;
  moneda: 'ARS' | 'USD';
  tipo: 'INGRESO' | 'EGRESO';
  fechaPlanificada: string;
  comentario?: string;
  entidad: { id: string; nombre: string; tipo: string };
  cuentaBancaria: { id: string; nombre: string; banco: string };
  asientoContable: { id: string; codigo: string; nombre: string };
}

interface GrupoPeriodo {
  key: string;
  periodo: string;
  fechaInicio: Date;
  fechaFin: Date;
  transacciones: TransaccionPlanificada[];
  totales: {
    ARS: { ingresos: number; egresos: number; neto: number };
    USD: { ingresos: number; egresos: number; neto: number };
  };
  vencido: boolean;
}

interface VencimientosData {
  grupos: GrupoPeriodo[];
  totalesGenerales: {
    ARS: { ingresos: number; egresos: number; neto: number };
    USD: { ingresos: number; egresos: number; neto: number };
    totalTransacciones: number;
  };
  metadata: {
    totalPeriodos: number;
    periodosVencidos: number;
    transaccionesPendientes: number;
  };
}

export function ReporteVencimientos() {
  const [data, setData] = useState<VencimientosData | null>(null);
  const [loading, setLoading] = useState(false);
  const [entidades, setEntidades] = useState<Array<{ id: string; nombre: string }>>([]);
  const [cuentas, setCuentas] = useState<Array<{ id: string; nombre: string; banco: string }>>([]);

  // Filtros
  const [agrupacion, setAgrupacion] = useState<'semana' | 'mes'>('semana');
  const [tipoFilter, setTipoFilter] = useState('');
  const [monedaFilter, setMonedaFilter] = useState('');
  const [entidadFilter, setEntidadFilter] = useState('');
  const [cuentaFilter, setCuentaFilter] = useState('');
  const [periodos, setPeriodos] = useState(12);
  const [soloVencidas, setSoloVencidas] = useState(false);

  // Estado para marcar como realizada
  const [transaccionAMarcar, setTransaccionAMarcar] = useState<TransaccionPlanificada | null>(null);
  const [fechaReal, setFechaReal] = useState('');
  const [marcandoRealizada, setMarcandoRealizada] = useState(false);
  const [transaccionAEditar, setTransaccionAEditar] = useState<TransaccionPlanificada | null>(null);

  const fetchOptions = async () => {
    try {
      const [entidadesRes, cuentasRes] = await Promise.all([
        fetch('/api/entidades?limit=1000&activa=true'),
        fetch('/api/cuentas?limit=1000&activa=true'),
      ]);

      const [entidadesData, cuentasData] = await Promise.all([
        entidadesRes.json(),
        cuentasRes.json(),
      ]);

      setEntidades(entidadesData.entidades || []);
      setCuentas(cuentasData.cuentas || []);
    } catch (error) {
      console.error('Error al cargar opciones:', error);
      toast.error('Error al cargar las opciones');
    }
  };

  const fetchVencimientos = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        agrupacion,
        periodos: periodos.toString(),
        soloVencidas: soloVencidas.toString(),
        ...(tipoFilter && { tipo: tipoFilter }),
        ...(monedaFilter && { moneda: monedaFilter }),
        ...(entidadFilter && { entidadId: entidadFilter }),
        ...(cuentaFilter && { cuentaBancariaId: cuentaFilter }),
      });

      const response = await fetch(`/api/reportes/vencimientos?${params}`);
      if (!response.ok) throw new Error('Error al cargar reporte');

      const reporteData = await response.json();
      setData(reporteData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar el reporte de vencimientos');
    } finally {
      setLoading(false);
    }
  };

  const marcarComoRealizada = async () => {
    if (!transaccionAMarcar || !fechaReal) return;

    try {
      setMarcandoRealizada(true);

      const response = await fetch(`/api/transacciones/${transaccionAMarcar.id}/marcar-realizada`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fechaReal,
        }),
      });

      if (!response.ok) throw new Error('Error al marcar como realizada');

      toast.success('Transacción marcada como realizada');
      setTransaccionAMarcar(null);
      setFechaReal('');
      fetchVencimientos(); // Actualizar datos

      // Refrescar dashboard
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshDashboard'));
      }, 1000);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al marcar como realizada');
    } finally {
      setMarcandoRealizada(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchVencimientos();
  }, [agrupacion, tipoFilter, monedaFilter, entidadFilter, cuentaFilter, periodos, soloVencidas]);

  const formatMonto = (monto: number, moneda: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 2,
    }).format(monto);
  };

  const getSaldoColor = (monto: number) => {
    if (monto > 0) return 'text-green-600';
    if (monto < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const clearFilters = () => {
    setTipoFilter('');
    setMonedaFilter('');
    setEntidadFilter('');
    setCuentaFilter('');
    setSoloVencidas(false);
  };

  const abrirDialogoMarcarRealizada = (transaccion: TransaccionPlanificada) => {
    setTransaccionAMarcar(transaccion);
    setFechaReal(format(new Date(), 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="space-y-4 -mt-4">
        {/* Barra de Filtros Zen */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 bg-slate-50 border rounded-lg sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
            <Select value={agrupacion} onValueChange={(value: 'semana' | 'mes') => setAgrupacion(value)}>
              <SelectTrigger className="h-8 w-[100px] text-xs bg-white capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semana">Semana</SelectItem>
                <SelectItem value="mes">Mes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tipoFilter || 'all'} onValueChange={(value) => setTipoFilter(value === 'all' ? '' : value)}>
              <SelectTrigger className="h-8 w-[100px] text-xs bg-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="INGRESO">Ingresos</SelectItem>
                <SelectItem value="EGRESO">Egresos</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1 bg-white">
                  <Filter className="h-3 w-3" />
                  <span className="hidden sm:inline">Más Filtros</span>
                  {(monedaFilter || entidadFilter || cuentaFilter || soloVencidas) && (
                    <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center rounded-full text-[10px]">
                      !
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 space-y-4" align="start">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Moneda</Label>
                    <Select value={monedaFilter || 'all'} onValueChange={(value) => setMonedaFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Períodos</Label>
                    <Select value={periodos.toString()} onValueChange={(value) => setPeriodos(parseInt(value))}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 {agrupacion}s</SelectItem>
                        <SelectItem value="8">8 {agrupacion}s</SelectItem>
                        <SelectItem value="12">12 {agrupacion}s</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Entidad</Label>
                    <Select value={entidadFilter || 'all'} onValueChange={(value) => setEntidadFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {entidades.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 pt-2 border-t">
                    <Switch id="solo-vencidas-zen" checked={soloVencidas} onCheckedChange={setSoloVencidas} />
                    <Label htmlFor="solo-vencidas-zen" className="text-xs">Solo vencidas</Label>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-xs h-8">Limpiar Filtros</Button>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {data && (
              <div className="hidden lg:flex items-center gap-3 mr-2 text-[10px] font-medium border-r pr-3">
                <div className="flex flex-col items-end leading-none">
                  <span className="text-[8px] text-gray-400 uppercase">Pendientes</span>
                  <span className="text-red-600 font-bold">{data.metadata.transaccionesPendientes}</span>
                </div>
              </div>
            )}

            <Button size="sm" onClick={fetchVencimientos} disabled={loading} className="h-8 text-xs">
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
                      Vencimientos Zen
                    </h4>
                    <p className="text-[11px] text-muted-foreground">Gestión de pagos y cobros previstos</p>
                  </div>
                  <div className="grid gap-3 text-xs">
                    <div className="flex gap-2">
                      <div className="w-4 h-4 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-2 w-2 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-red-700">Identificación de Vencidos</p>
                        <p className="text-muted-foreground text-[10px]">Los períodos en rojo contienen transacciones cuya fecha planificada ya pasó.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 bg-blue-50">
                        <Edit className="h-2 w-2 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Editar y Finalizar</p>
                        <p className="text-muted-foreground text-[10px]">Usa este botón para ajustar el monto final o la fecha antes de pasar a Real.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Resumen General */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Transacciones Pendientes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.metadata.transaccionesPendientes}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Períodos Vencidos</p>
                    <p className="text-2xl font-bold text-red-600">
                      {data.metadata.periodosVencidos}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ingresos Esperados (ARS)</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatMonto(data.totalesGenerales.ARS.ingresos, 'ARS')}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Egresos Esperados (ARS)</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatMonto(data.totalesGenerales.ARS.egresos, 'ARS')}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Timeline de Vencimientos */}
        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-500">Generando reporte de vencimientos...</p>
            </CardContent>
          </Card>
        ) : data && data.grupos.length > 0 ? (
          <div className="space-y-4">
            {data.grupos.map((grupo) => (
              <div key={grupo.key} className={`rounded-lg border overflow-hidden bg-white shadow-sm ${grupo.vencido ? 'border-red-200' : ''}`}>
                <div className={`px-3 py-2 flex items-center justify-between border-b ${grupo.vencido ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${grupo.vencido ? 'bg-red-200 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                      <CalendarClock className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-tight">{grupo.periodo}</span>
                    {grupo.vencido && <Badge variant="destructive" className="h-4 text-[8px] uppercase px-1">Vencido</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    {grupo.totales.ARS.neto !== 0 && (
                      <span className={`text-[10px] font-bold ${getSaldoColor(grupo.totales.ARS.neto)}`}>
                        ARS {formatMonto(grupo.totales.ARS.neto, 'ARS')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="divide-y">
                  {grupo.transacciones.map((transaccion) => (
                    <div key={transaccion.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate leading-tight">{transaccion.descripcion}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground">{format(new Date(transaccion.fechaPlanificada), 'dd MMM')}</span>
                          <span className="text-[10px] text-muted-foreground truncate opacity-70">• {transaccion.entidad.nombre}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-xs font-bold tabular-nums ${transaccion.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                          {formatMonto(transaccion.monto, transaccion.moneda)}
                        </div>
                        <div className="flex gap-1 mt-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setTransaccionAEditar(transaccion)}
                            className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50"
                            title="Editar y Finalizar"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => abrirDialogoMarcarRealizada(transaccion)}
                            className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                            title="Marcar Realizada"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : data ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CalendarClock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No hay vencimientos</h3>
              <p className="mt-2 text-gray-500">
                No se encontraron transacciones planificadas con los filtros aplicados.
              </p>
              <Button onClick={clearFilters} className="mt-4" variant="outline">
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Dialog para marcar como realizada */}
        <Dialog open={!!transaccionAMarcar} onOpenChange={(open) => !open && setTransaccionAMarcar(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marcar Transacción como Realizada</DialogTitle>
              <DialogDescription>
                Confirma la realización de esta transacción planificada
              </DialogDescription>
            </DialogHeader>

            {transaccionAMarcar && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gray-50">
                  <div className="font-medium">{transaccionAMarcar.descripcion}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {transaccionAMarcar.entidad.nombre} • {transaccionAMarcar.cuentaBancaria.nombre}
                  </div>
                  <div className={`font-bold mt-2 ${transaccionAMarcar.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaccionAMarcar.tipo === 'INGRESO' ? '+' : '-'}{formatMonto(transaccionAMarcar.monto, transaccionAMarcar.moneda)}
                  </div>
                </div>

                <div>
                  <Label htmlFor="fecha-real">Fecha real de la transacción</Label>
                  <Input
                    id="fecha-real"
                    type="date"
                    value={fechaReal}
                    onChange={(e) => setFechaReal(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setTransaccionAMarcar(null)}
                    disabled={marcandoRealizada}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={marcarComoRealizada}
                    disabled={!fechaReal || marcandoRealizada}
                  >
                    {marcandoRealizada ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Marcando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Marcar como Realizada
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <EditarAntesFinalizarDialog
          open={!!transaccionAEditar}
          onClose={() => setTransaccionAEditar(null)}
          onSuccess={() => {
            setTransaccionAEditar(null);
            fetchVencimientos(); // Actualizar datos
          }}
          transaccion={transaccionAEditar}
        />
      </div>
    </div>
  );
}
