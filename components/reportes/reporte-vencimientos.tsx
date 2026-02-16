
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Calendar as CalendarIcon,
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
  Eye,
  Globe,
  Bell,
  ExternalLink
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSearchParams } from 'next/navigation';
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
  googleEventId?: string;
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

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  htmlLink?: string;
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
  const { data: session } = useSession();
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
  const [verGoogleCalendar, setVerGoogleCalendar] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const searchParams = useSearchParams();

  // Efecto para capturar filtros desde la URL
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'vencidas') {
      setSoloVencidas(true);
    }
  }, [searchParams]);

  // Función para parsear fechas de forma segura (sin desfase de zona horaria)
  const parseDateNoShift = (dateStr: string | undefined | null) => {
    if (!dateStr) return new Date();
    // Extraer solo la parte de la fecha YYYY-MM-DD para evitar conversiones a UTC
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [y, m, d] = datePart.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

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
        fechaBase: currentMonth.toISOString(),
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

  const fetchCalendarEvents = async () => {
    if (!verGoogleCalendar) return;

    try {
      setLoadingCalendar(true);

      const timeMin = startOfMonth(currentMonth).toISOString();
      const timeMax = endOfMonth(currentMonth).toISOString();

      // Calcular rango basado en los grupos actuales o por defecto 3 meses
      const response = await fetch(`/api/calendar/events?timeMin=${timeMin}&timeMax=${timeMax}`);
      if (!response.ok) {
        if (response.status === 401) {
          setVerGoogleCalendar(false);
          toast.error('Debes conectar tu cuenta de Google para ver el calendario');
          return;
        }
        throw new Error('Error al cargar calendario');
      }

      const calendarData = await response.json();
      const numEvents = calendarData.events?.length || 0;
      console.log('Eventos recibidos de Google:', numEvents);
      toast.success(`Google Calendar: ${numEvents} eventos cargados`);
      setCalendarEvents(calendarData.events || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar eventos de Google Calendar');
    } finally {
      setLoadingCalendar(false);
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
    if (verGoogleCalendar) {
      fetchCalendarEvents();
    }
  }, [currentMonth, tipoFilter, monedaFilter, entidadFilter, cuentaFilter, periodos, soloVencidas, verGoogleCalendar]);

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
        {/* Barra de Filtros Compacta */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 bg-slate-50 border rounded-lg sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => fetchVencimientos()} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>

            <Select value={tipoFilter || 'all'} onValueChange={(value) => setTipoFilter(value === 'all' ? '' : value)}>
              <SelectTrigger className="h-8 min-w-[90px] text-xs bg-white">
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
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1 bg-white shrink-0">
                  <Filter className="h-3 w-3" />
                  <span>Filtros</span>
                  {(monedaFilter || entidadFilter || cuentaFilter || soloVencidas) && (
                    <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center rounded-full text-[10px] bg-green-100 text-green-700">
                      !
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4 space-y-4" align="start">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Moneda</Label>
                      <Select value={monedaFilter || 'all'} onValueChange={(value) => setMonedaFilter(value === 'all' ? '' : value)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="ARS">ARS</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Vista</Label>
                      <Select value={agrupacion} onValueChange={(v: any) => setAgrupacion(v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="semana">Semana</SelectItem>
                          <SelectItem value="mes">Mes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Entidad</Label>
                    <Select value={entidadFilter || 'all'} onValueChange={(value) => setEntidadFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger className="h-8 text-xs text-left">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {entidades.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    <Label htmlFor="solo-vencidas-pop" className="text-xs">Solo vencidas</Label>
                    <Switch id="solo-vencidas-pop" checked={soloVencidas} onCheckedChange={setSoloVencidas} />
                  </div>

                  <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-xs h-8">Limpiar Filtros</Button>
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-1.5 border-l pl-2 border-slate-200">
              <Switch
                id="ver-google-calendar"
                className="scale-75"
                checked={verGoogleCalendar}
                onCheckedChange={setVerGoogleCalendar}
                disabled={loadingCalendar}
              />
              <a
                href={`https://www.google.com/calendar/render?authuser=${session?.user?.email ? encodeURIComponent(session.user.email) : '0'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] sm:text-xs font-medium flex items-center gap-1 hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                Google Calendar
                <ExternalLink className="h-2 w-2 opacity-50" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end shrink-0">
            {data && (
              <div className="hidden md:flex items-center gap-1.5 pr-2 border-r border-slate-200 text-[10px] font-bold">
                <span className="text-gray-400">PENDIENTES:</span>
                <span className="text-red-600">{data.metadata.transaccionesPendientes}</span>
              </div>
            )}
            <Button size="sm" onClick={fetchVencimientos} disabled={loading} className="h-8 text-[11px] px-3">
              Actualizar
            </Button>
          </div>
        </div>

        {/* Ayuda y Resumen Compacto */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resumen Rápido</span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hover:bg-slate-200">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-4 shadow-xl border-slate-200">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm leading-none flex items-center gap-2 text-primary">
                      <HelpCircle className="h-4 w-4" />
                      Guía de Vencimientos
                    </h4>
                    <p className="text-[11px] text-muted-foreground">Gestión de flujo de caja previsto</p>
                  </div>
                  <div className="grid gap-3 text-xs">
                    <div className="flex gap-2">
                      <div className="w-4 h-4 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-2.5 w-2.5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-bold text-red-700">Vencidos</p>
                        <p className="text-muted-foreground text-[10px]">Transacciones con fecha anterior a hoy aún no realizadas.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {data && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="flex items-center gap-2 p-2 px-3 bg-white border rounded-lg shadow-sm">
                <div className="p-1.5 bg-orange-50 rounded text-orange-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium leading-none">Pendientes</p>
                  <p className="text-sm font-bold">{data.metadata.transaccionesPendientes}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 px-3 bg-white border rounded-lg shadow-sm">
                <div className="p-1.5 bg-red-50 rounded text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium leading-none">Vencidos</p>
                  <p className="text-sm font-bold text-red-600">{data.metadata.periodosVencidos}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 px-3 bg-white border rounded-lg shadow-sm">
                <div className="p-1.5 bg-green-50 rounded text-green-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium leading-none">Ingresos (ARS)</p>
                  <p className="text-sm font-bold text-green-600 truncate">
                    {formatMonto(data.totalesGenerales.ARS.ingresos, 'ARS').replace('$', '')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 px-3 bg-white border rounded-lg shadow-sm">
                <div className="p-1.5 bg-red-50 rounded text-red-600">
                  <TrendingDown className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium leading-none">Egresos (ARS)</p>
                  <p className="text-sm font-bold text-red-600 truncate">
                    {formatMonto(data.totalesGenerales.ARS.egresos, 'ARS').replace('$', '')}
                  </p>
                </div>
              </div>
            </div>
          )
          }

          {/* Vista de Calendario (Cuadrícula Mensual) */}
          {
            verGoogleCalendar && (
              <Card className="mb-4 overflow-hidden border-none shadow-md">
                <CardContent className="p-0 sm:p-4 bg-white">
                  <TooltipProvider>
                    <Calendar
                      mode="single"
                      selected={selectedCalendarDate}
                      onSelect={setSelectedCalendarDate}
                      onMonthChange={setCurrentMonth}
                      month={currentMonth}
                      className="w-full flex justify-center"
                      modifiers={{
                        hasIngreso: (date: Date) => {
                          return data?.grupos.some(g =>
                            g.transacciones.some(t =>
                              t.tipo === 'INGRESO' &&
                              parseDateNoShift(t.fechaPlanificada).toDateString() === date.toDateString()
                            )
                          ) || false;
                        },
                        hasEgreso: (date: Date) => {
                          return data?.grupos.some(g =>
                            g.transacciones.some(t =>
                              t.tipo === 'EGRESO' &&
                              parseDateNoShift(t.fechaPlanificada).toDateString() === date.toDateString()
                            )
                          ) || false;
                        },
                      }}
                      modifiersStyles={{
                        hasIngreso: { fontWeight: 'bold' },
                        hasEgreso: { fontWeight: 'bold' }
                      }}
                      components={{
                        Day: ({ date, displayMonth }: { date: Date, displayMonth: Date }) => {
                          const isOutside = date.getMonth() !== displayMonth.getMonth();

                          const transaccionesHoy = data?.grupos.flatMap(g =>
                            g.transacciones.filter(t => parseDateNoShift(t.fechaPlanificada).toDateString() === date.toDateString())
                          ) || [];

                          const ingresosHoy = transaccionesHoy.filter(t => t.tipo === 'INGRESO');
                          const egresosHoy = transaccionesHoy.filter(t => t.tipo === 'EGRESO');

                          const gEvents = calendarEvents.filter(e => {
                            const d = e.start.dateTime || e.start.date;
                            if (!d) return false;

                            // Deduplicación robusta (ID + Nombre/Fecha con margen)
                            const yaSincronizadoPorId = transaccionesHoy.some((t: TransaccionPlanificada) => t.googleEventId === e.id);
                            if (yaSincronizadoPorId) return false;

                            const eventDate = parseDateNoShift(d);
                            const dStr = eventDate.toDateString();
                            const cleanSummary = (e.summary || '').replace(/^(💰 Cobro|💸 Pago): /, '').toLowerCase();

                            const yaSincronizadoPorNombre = transaccionesHoy.some((t: TransaccionPlanificada) => {
                              const td = parseDateNoShift(t.fechaPlanificada);
                              const matchesName = t.descripcion.toLowerCase() === cleanSummary;
                              if (!matchesName) return false;

                              // Margen de +/- 1 día
                              const tdMinus = new Date(td); tdMinus.setDate(td.getDate() - 1);
                              const tdPlus = new Date(td); tdPlus.setDate(td.getDate() + 1);

                              return td.toDateString() === dStr || tdMinus.toDateString() === dStr || tdPlus.toDateString() === dStr;
                            });

                            return !yaSincronizadoPorNombre && dStr === date.toDateString();
                          });

                          const hasActivity = transaccionesHoy.length > 0 || gEvents.length > 0;

                          const dayContent = (
                            <div className={cn(
                              "relative h-12 w-12 sm:h-14 sm:w-14 flex flex-col items-center justify-start pt-1 border-[0.5px] border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors",
                              isOutside && "opacity-20 bg-slate-50/50",
                              selectedCalendarDate?.toDateString() === date.toDateString() && "bg-primary/5 border-primary/20 shadow-inner"
                            )}>
                              <span className={cn(
                                "text-[10px] sm:text-xs font-semibold px-1.5 rounded-full z-10",
                                date.toDateString() === new Date().toDateString() ? "bg-primary text-white" : "text-slate-600"
                              )}>
                                {date.getDate()}
                              </span>

                              {/* Indicadores Visuales Mejorados (Multi-punto) */}
                              <div className="mb-1 flex flex-wrap justify-center gap-0.5 px-0.5 max-w-full">
                                {ingresosHoy.map((t, i) => i < 3 && <div key={t.id} className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm" />)}
                                {ingresosHoy.length > 3 && <span className="text-[6px] text-green-600 font-bold leading-none">+</span>}

                                {egresosHoy.map((t, i) => i < 3 && <div key={t.id} className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm" />)}
                                {egresosHoy.length > 3 && <span className="text-[6px] text-red-600 font-bold leading-none">+</span>}
                              </div>
                            </div>
                          );

                          if (!hasActivity || isOutside) return dayContent;

                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>{dayContent}</TooltipTrigger>
                              <TooltipContent className="p-2 min-w-[150px] shadow-xl border-slate-200">
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase border-b pb-1 mb-1">
                                    {format(date, "d 'de' MMMM", { locale: es })}
                                  </p>
                                  {transaccionesHoy.map(t => (
                                    <div key={t.id} className="flex items-center justify-between gap-3 text-xs">
                                      <span className="truncate max-w-[100px]">{t.descripcion}</span>
                                      <span className={cn("font-bold", t.tipo === 'INGRESO' ? "text-green-600" : "text-red-600")}>
                                        {formatMonto(t.monto, t.moneda)}
                                      </span>
                                    </div>
                                  ))}
                                  {gEvents.map(e => (
                                    <div key={e.id} className="flex items-center gap-2 text-[10px] text-blue-600 italic">
                                      <div className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                                      <span className="truncate">{e.summary}</span>
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        }
                      }}
                    />
                  </TooltipProvider>
                  <div className="flex justify-center gap-4 py-3 bg-slate-50/50 border-t text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" /> Ingresos App
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500" /> Egresos App
                    </div>
                  </div>

                  {/* Detalle del Día Seleccionado (Premium) */}
                  {selectedCalendarDate && (
                    <div className="border-t bg-slate-50/30 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          {format(selectedCalendarDate, "eeee, d 'de' MMMM", { locale: es })}
                        </h4>
                        <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full font-bold text-slate-600 uppercase">
                          Detalle
                        </span>
                      </div>

                      <div className="space-y-2">
                        {/* Transacciones Zen para este día */}
                        {(() => {
                          const transaccionesHoy = data?.grupos.flatMap(g =>
                            g.transacciones.filter(t => parseDateNoShift(t.fechaPlanificada).toDateString() === selectedCalendarDate.toDateString())
                          ) || [];

                          const eventosGoogleHoy = calendarEvents.filter(e => {
                            const d = e.start.dateTime || e.start.date;
                            if (!d) return false;

                            // Deduplicación robusta
                            const yaSincronizadoPorId = transaccionesHoy.some((t: TransaccionPlanificada) => t.googleEventId === e.id);
                            if (yaSincronizadoPorId) return false;

                            const eventDate = parseDateNoShift(d);
                            const dStr = eventDate.toDateString();
                            const cleanSummary = (e.summary || '').replace(/^(💰 Cobro|💸 Pago): /, '').toLowerCase();

                            const yaSincronizadoPorNombre = transaccionesHoy.some((t: TransaccionPlanificada) => {
                              const td = parseDateNoShift(t.fechaPlanificada);
                              const matchesName = t.descripcion.toLowerCase() === cleanSummary;
                              if (!matchesName) return false;

                              const tdMinus = new Date(td); tdMinus.setDate(td.getDate() - 1);
                              const tdPlus = new Date(td); tdPlus.setDate(td.getDate() + 1);
                              return td.toDateString() === dStr || tdMinus.toDateString() === dStr || tdPlus.toDateString() === dStr;
                            });

                            return !yaSincronizadoPorNombre && dStr === selectedCalendarDate.toDateString();
                          });

                          if (transaccionesHoy.length === 0 && eventosGoogleHoy.length === 0) {
                            return <p className="text-xs text-slate-400 italic text-center py-2">Sin actividad para este día</p>
                          }

                          return (
                            <>
                              {transaccionesHoy.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm hover:border-primary/30 transition-all">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={cn("w-1 h-10 rounded-full", t.tipo === 'INGRESO' ? "bg-green-500" : "bg-red-500")} />
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold truncate leading-none mb-1">{t.descripcion}</p>
                                      <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                        <span className="font-semibold text-slate-700">{t.entidad.nombre}</span>
                                        <span>•</span>
                                        <span>{t.cuentaBancaria.nombre}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                                    <div className="text-right">
                                      <p className={cn("text-sm font-bold tabular-nums", t.tipo === 'INGRESO' ? "text-green-600" : "text-red-600")}>
                                        {formatMonto(t.monto, t.moneda)}
                                      </p>
                                    </div>
                                    <div className="flex gap-1 border-l pl-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                        onClick={() => setTransaccionAEditar(t)}
                                        title="Editar"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                                        onClick={() => abrirDialogoMarcarRealizada(t)}
                                        title="Marcar como cumplido"
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {eventosGoogleHoy.map(e => (
                                <div key={e.id} className="flex items-center justify-between p-2 bg-blue-50/50 border border-blue-100 rounded-md shadow-sm">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-1 h-8 rounded-full bg-blue-500" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold truncate leading-tight">{e.summary}</p>
                                      <p className="text-[9px] text-blue-600 font-medium truncate leading-tight">Google Calendar</p>
                                    </div>
                                  </div>
                                  <Button size="sm" variant="ghost" asChild className="h-7 w-7 p-0 text-blue-500">
                                    <a
                                      href={`${e.htmlLink}${session?.user?.email ? `&authuser=${encodeURIComponent(session.user.email)}` : ''}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </a>
                                  </Button>
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          }

          {/* Timeline de Vencimientos */}
          {
            loading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-gray-500">Generando reporte de vencimientos...</p>
                </CardContent>
              </Card>
            ) : data && data.grupos.length > 0 ? (
              <div className="space-y-4 mt-6">
                {!verGoogleCalendar && <h3 className="text-sm font-bold text-slate-500 uppercase px-1">Línea de Tiempo</h3>}
                {verGoogleCalendar && (
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-slate-500 uppercase">Resumen del Mes</h3>
                  </div>
                )}
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
                              <span className="text-[10px] text-muted-foreground">{format(Date.parse(transaccion.fechaPlanificada) ? new Date(transaccion.fechaPlanificada) : new Date(), 'dd MMM')}</span>
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

                      {(() => {
                        // Recolectar todos los IDs de Google vinculados a transacciones de la App para deduplicar
                        const linkedGoogleIds = new Set<string>();
                        data?.grupos.forEach(g => {
                          g.transacciones.forEach((t: TransaccionPlanificada) => {
                            if (t.googleEventId) linkedGoogleIds.add(t.googleEventId);
                          });
                        });

                        // También deduplicar por nombre y fecha si el ID no está (para casos previos o desfases)
                        const appTransNamesDates = new Set<string>();
                        grupo.transacciones.forEach((t: TransaccionPlanificada) => {
                          const d = parseDateNoShift(t.fechaPlanificada);
                          appTransNamesDates.add(`${t.descripcion.toLowerCase()}|${d.toDateString()}`);

                          // Margen de +/- 1 día para capturar registros con desfase de zona horaria antiguo
                          const dMinus = new Date(d); dMinus.setDate(d.getDate() - 1);
                          appTransNamesDates.add(`${t.descripcion.toLowerCase()}|${dMinus.toDateString()}`);
                          const dPlus = new Date(d); dPlus.setDate(d.getDate() + 1);
                          appTransNamesDates.add(`${t.descripcion.toLowerCase()}|${dPlus.toDateString()}`);
                        });

                        const eventosAMostrar = calendarEvents.filter(event => {
                          // 1. Filtrar por ID vinculado exacto
                          if (linkedGoogleIds.has(event.id)) return false;

                          const eventDateStr = event.start.dateTime || event.start.date;
                          if (!eventDateStr) return false;

                          const eventDate = parseDateNoShift(eventDateStr);
                          const dStr = eventDate.toDateString();

                          // 2. Filtrar por nombre similar y ventana de fecha (limpia registros duplicados visibles)
                          const cleanSummary = (event.summary || '').replace(/^(💰 Cobro|💸 Pago): /, '').toLowerCase();
                          if (appTransNamesDates.has(`${cleanSummary}|${dStr}`)) return false;

                          // 3. Normalizar rango de grupo para visualización
                          const start = new Date(grupo.fechaInicio);
                          start.setHours(0, 0, 0, 0);

                          const end = new Date(grupo.fechaFin);
                          end.setHours(23, 59, 59, 999);

                          return eventDate >= start && eventDate <= end;
                        });

                        return eventosAMostrar.map((event) => (
                          <div key={event.id} className="p-3 flex items-center justify-between hover:bg-blue-50/30 transition-colors gap-4 bg-blue-50/10 border-l-2 border-l-blue-400">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold truncate leading-tight flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                {event.summary}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-blue-600 font-medium">
                                  {event.start.dateTime
                                    ? format(new Date(event.start.dateTime), 'dd MMM HH:mm')
                                    : format(new Date(event.start.date!), 'dd MMM')}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate opacity-70">• Google Calendar</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                                className="h-6 w-6 p-0 text-blue-500 hover:bg-blue-100"
                              >
                                <a
                                  href={`${event.htmlLink}${session?.user?.email ? `&authuser=${encodeURIComponent(session.user.email)}` : ''}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Ver en Google Calendar"
                                >
                                  <Eye className="h-3 w-3" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
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
            )
          }

          {/* Dialog para marcar como realizada */}
          <Dialog open={!!transaccionAMarcar} onOpenChange={(open) => !open && setTransaccionAMarcar(null)}>
            <DialogContent aria-describedby="dialog-description">
              <DialogHeader>
                <DialogTitle>Marcar Transacción como Realizada</DialogTitle>
                <div id="dialog-description" className="text-sm text-muted-foreground">
                  Confirma la realización de esta transacción planificada
                </div>
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
    </div>
  );
}
