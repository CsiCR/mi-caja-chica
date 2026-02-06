
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, RefreshCw, Eye, Calendar, User, CreditCard, HelpCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import toast from 'react-hot-toast';

interface SaldosData {
  entidades: Array<{
    id: string;
    nombre: string;
    tipo: string;
  }>;
  cuentas: Array<{
    id: string;
    nombre: string;
    banco: string;
    moneda: string;
  }>;
  saldosMatrix: {
    [entidadId: string]: {
      [cuentaId: string]: {
        ARS: number;
        USD: number;
      };
    };
  };
  totalesPorEntidad: {
    [entidadId: string]: {
      ARS: number;
      USD: number;
    };
  };
  totalesPorCuenta: {
    [cuentaId: string]: {
      ARS: number;
      USD: number;
    };
  };
  totalGeneral: {
    ARS: number;
    USD: number;
  };
}

export function ReporteSaldos() {
  const [data, setData] = useState<SaldosData | null>(null);
  const [loading, setLoading] = useState(false);
  const [entidades, setEntidades] = useState<Array<{ id: string; nombre: string }>>([]);
  const [cuentas, setCuentas] = useState<Array<{ id: string; nombre: string; banco: string }>>([]);

  // Filtros
  const [entidadFilter, setEntidadFilter] = useState('');
  const [cuentaFilter, setCuentaFilter] = useState('');
  const [monedaFilter, setMonedaFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [incluirPlanificadas, setIncluirPlanificadas] = useState(false);

  // Drill-down state
  const [selectedCell, setSelectedCell] = useState<{
    entidadId: string;
    cuentaId: string;
    entidadNombre: string;
    cuentaNombre: string;
  } | null>(null);
  const [detailTransactions, setDetailTransactions] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  const fetchSaldos = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        ...(entidadFilter && { entidadId: entidadFilter }),
        ...(cuentaFilter && { cuentaBancariaId: cuentaFilter }),
        ...(monedaFilter && { moneda: monedaFilter }),
        ...(dateRange?.from && { fechaDesde: format(dateRange.from, 'yyyy-MM-dd') }),
        ...(dateRange?.to && { fechaHasta: format(dateRange.to, 'yyyy-MM-dd') }),
        incluirPlanificadas: incluirPlanificadas.toString(),
      });

      const response = await fetch(`/api/reportes/saldos?${params}`);
      if (!response.ok) throw new Error('Error al cargar reporte');

      const reporteData = await response.json();
      setData(reporteData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar el reporte de saldos');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (entidadId: string, cuentaId: string, entidadNombre: string, cuentaNombre: string) => {
    try {
      setLoadingDetail(true);
      setSelectedCell({ entidadId, cuentaId, entidadNombre, cuentaNombre });

      const params = new URLSearchParams({
        entidadId,
        cuentaBancariaId: cuentaId,
        incluirPlanificadas: incluirPlanificadas.toString(),
      });

      const response = await fetch(`/api/reportes/saldos/detalle?${params}`);
      if (!response.ok) throw new Error('Error al cargar detalle');

      const transactions = await response.json();
      setDetailTransactions(transactions);
    } catch (error) {
      console.error('Error:', error);
      toast.error('No se pudo cargar el detalle de transacciones');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchSaldos();
  }, [entidadFilter, cuentaFilter, monedaFilter, dateRange, incluirPlanificadas]);

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

  const getHeatmapStyle = (monto: number, moneda: string) => {
    if (!monto || monto === 0) return undefined;

    // Calcular intensidad simple basada en el monto
    const absMonto = Math.abs(monto);
    let intensity = 0;

    if (moneda === 'ARS') {
      intensity = Math.min(absMonto / 200000, 1); // Subo el umbral a 200k para mejor rango
    } else {
      intensity = Math.min(absMonto / 1000, 1); // Subo el umbral a 1k USD
    }

    const opacity = 0.05 + (intensity * 0.25); // Rango de 5% a 30% de opacidad
    const color = monto > 0 ? '34, 197, 94' : '239, 68, 68'; // Green-500 o Red-500

    return {
      backgroundColor: `rgba(${color}, ${opacity})`,
    } as React.CSSProperties;
  };

  const clearFilters = () => {
    setEntidadFilter('');
    setCuentaFilter('');
    setMonedaFilter('');
    setDateRange(undefined);
    setIncluirPlanificadas(false);
  };

  return (
    <div className="space-y-4 -mt-4">
      {/* Barra de Herramientas y Filtros Compacta */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 bg-slate-50 border rounded-lg sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
          <Select value={entidadFilter || 'all'} onValueChange={(value) => setEntidadFilter(value === 'all' ? '' : value)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Entidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {entidades.map((entidad) => (
                <SelectItem key={entidad.id} value={entidad.id}>{entidad.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cuentaFilter || 'all'} onValueChange={(value) => setCuentaFilter(value === 'all' ? '' : value)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Cuentas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {cuentas.map((cuenta) => (
                <SelectItem key={cuenta.id} value={cuenta.id}>{cuenta.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded border h-8">
            <Switch
              id="plan-compact"
              checked={incluirPlanificadas}
              onCheckedChange={setIncluirPlanificadas}
              className="scale-75"
            />
            <Label htmlFor="plan-compact" className="text-[10px] whitespace-nowrap">Planificadas</Label>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {data && (
            <div className="hidden lg:flex items-center gap-4 mr-4 text-xs font-medium border-r pr-4">
              <div className="flex flex-col items-end leading-none">
                <span className="text-[9px] text-gray-400 uppercase tracking-tighter">Total Pesos</span>
                <span className={getSaldoColor(data.totalGeneral.ARS)}>{formatMonto(data.totalGeneral.ARS, 'ARS')}</span>
              </div>
              <div className="flex flex-col items-end leading-none">
                <span className="text-[9px] text-gray-400 uppercase tracking-tighter">Total Dólares</span>
                <span className={getSaldoColor(data.totalGeneral.USD)}>{formatMonto(data.totalGeneral.USD, 'USD')}</span>
              </div>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs font-normal">Limpiar</Button>
          <Button size="sm" onClick={fetchSaldos} disabled={loading} className="h-8 text-xs">
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
                    Guía de Reporte Zen
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Funciones clave del reporte de saldos</p>
                </div>
                <div className="grid gap-3 text-xs">
                  <div className="flex gap-2">
                    <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Mapa de Calor</p>
                      <p className="text-muted-foreground text-[10px]">La intensidad del color verde (ingresos) o rojo (gastos) indica el peso relativo del saldo.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 bg-slate-50">
                      <Eye className="h-2 w-2" />
                    </div>
                    <div>
                      <p className="font-medium">Drill-down (Clic en celda)</p>
                      <p className="text-muted-foreground text-[10px]">Toca cualquier monto para ver el listado detallado de movimientos que lo componen.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 bg-slate-50">
                      <TrendingUp className="h-2 w-2" />
                    </div>
                    <div>
                      <p className="font-medium">Navegación Móvil</p>
                      <p className="text-muted-foreground text-[10px]">El nombre de la entidad está "bloqueado" a la izquierda para que nunca pierdas el contexto al deslizar.</p>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary opacity-20 mb-2" />
          <p className="text-sm">Actualizando...</p>
        </div>
      ) : data ? (
        <div className="relative border rounded-lg bg-white overflow-hidden shadow-sm">
          <div className="overflow-auto max-h-[calc(100vh-160px)] no-scrollbar">
            <Table className="border-separate border-spacing-0 text-[11px] sm:text-xs">
              <TableHeader className="sticky top-0 z-20 bg-white shadow-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky left-0 z-30 bg-white font-bold border-r border-b min-w-[100px] sm:min-w-[120px] shadow-[1px_0_3px_rgba(0,0,0,0.1)] py-2">Entidad</TableHead>
                  {data.cuentas.map((cuenta) => (
                    <TableHead key={cuenta.id} className="text-center min-w-[100px] sm:min-w-[110px] p-2 border-b">
                      <div className="flex flex-col leading-tight">
                        <span className="font-semibold truncate max-w-[80px] sm:max-w-[100px] mx-auto">{cuenta.nombre}</span>
                        <span className="text-[9px] text-gray-400 uppercase">{cuenta.moneda}</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold bg-slate-50 sticky right-0 z-20 border-l border-b min-w-[90px] sm:min-w-[100px] shadow-[-1px_0_3px_rgba(0,0,0,0.1)]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entidades.map((entidad) => (
                  <TableRow key={entidad.id} className="group">
                    <TableCell className="sticky left-0 z-10 bg-white font-medium border-r border-b py-2 group-hover:bg-slate-50 shadow-[1px_0_3px_rgba(0,0,0,0.1)]">
                      <div className="flex flex-col leading-tight">
                        <span className="truncate max-w-[90px] sm:max-w-[110px]">{entidad.nombre}</span>
                        <span className="text-[9px] text-gray-400 capitalize">{entidad.tipo.toLowerCase().replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    {data.cuentas.map((cuenta) => {
                      const saldo = data.saldosMatrix[entidad.id]?.[cuenta.id];
                      const monedaCuenta = cuenta.moneda as 'ARS' | 'USD';
                      const montoSaldo = saldo?.[monedaCuenta] || 0;

                      return (
                        <TableCell
                          key={cuenta.id}
                          className="text-center p-2 border-b cursor-pointer hover:bg-slate-100 transition-colors"
                          style={getHeatmapStyle(montoSaldo, monedaCuenta)}
                          onClick={() => fetchDetail(entidad.id, cuenta.id, entidad.nombre, cuenta.nombre)}
                        >
                          <span className={`${getSaldoColor(montoSaldo)} font-mono tabular-nums`}>
                            {montoSaldo !== 0 ? formatMonto(montoSaldo, monedaCuenta) : '-'}
                          </span>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-bold bg-slate-50 sticky right-0 z-10 border-l border-b p-2 shadow-[-1px_0_3px_rgba(0,0,0,0.1)]">
                      <div className="flex flex-col gap-0.5 leading-none">
                        {data.totalesPorEntidad[entidad.id]?.ARS !== 0 && (
                          <span className={`font-mono tabular-nums text-[10px] ${getSaldoColor(data.totalesPorEntidad[entidad.id]?.ARS || 0)}`}>
                            {formatMonto(data.totalesPorEntidad[entidad.id]?.ARS || 0, 'ARS')}
                          </span>
                        )}
                        {data.totalesPorEntidad[entidad.id]?.USD !== 0 && (
                          <span className={`font-mono tabular-nums text-[10px] ${getSaldoColor(data.totalesPorEntidad[entidad.id]?.USD || 0)}`}>
                            {formatMonto(data.totalesPorEntidad[entidad.id]?.USD || 0, 'USD')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Fila de totales finales */}
                <TableRow className="bg-slate-100 font-bold sticky bottom-0 z-20 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
                  <TableCell className="sticky left-0 z-20 bg-slate-100 border-r py-3 shadow-[1px_0_3px_rgba(0,0,0,0.1)]">TOTALES</TableCell>
                  {data.cuentas.map((cuenta) => {
                    const monedaCuenta = cuenta.moneda as 'ARS' | 'USD';
                    const totalCuenta = data.totalesPorCuenta[cuenta.id]?.[monedaCuenta] || 0;
                    return (
                      <TableCell key={cuenta.id} className="text-center p-2">
                        <span className={`font-mono tabular-nums ${getSaldoColor(totalCuenta)}`}>
                          {totalCuenta !== 0 ? formatMonto(totalCuenta, monedaCuenta) : '-'}
                        </span>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-bold bg-slate-200 sticky right-0 z-20 border-l p-2 shadow-[-1px_0_3px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col gap-0.5 leading-none">
                      <span className={`font-mono tabular-nums ${getSaldoColor(data.totalGeneral.ARS)}`}>{formatMonto(data.totalGeneral.ARS, 'ARS')}</span>
                      <span className={`font-mono tabular-nums ${getSaldoColor(data.totalGeneral.USD)}`}>{formatMonto(data.totalGeneral.USD, 'USD')}</span>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {/* Panel Lateral de Detalle (Drill-down) */}
      <Sheet open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <SheetContent className="sm:max-w-[450px] w-full overflow-y-auto p-4">
          <SheetHeader className="pb-4 border-b space-y-1">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-4 w-4 text-primary" />
              Detalle de Movimientos
            </SheetTitle>
            <SheetDescription className="text-xs">
              <strong>{selectedCell?.entidadNombre}</strong> <span className="text-muted-foreground mx-1">•</span> <strong>{selectedCell?.cuentaNombre}</strong>
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-3">
            {loadingDetail ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-primary animate-spin mb-2 opacity-20" />
                <p className="text-xs text-gray-500 font-medium">Buscando...</p>
              </div>
            ) : detailTransactions.length > 0 ? (
              <div className="space-y-3">
                {detailTransactions.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg border bg-card hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <p className="font-semibold text-xs leading-tight truncate">{t.descripcion}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={t.tipo === 'INGRESO' ? 'outline' : 'destructive'} className={`text-[9px] h-4 px-1 leading-none shadow-none ${t.tipo === 'INGRESO' ? 'border-green-200 text-green-700 bg-green-50' : ''}`}>
                            {t.tipo === 'INGRESO' ? 'Cobro' : 'Pago'}
                          </Badge>
                          <Badge variant="secondary" className={`text-[9px] h-4 px-1 leading-none shadow-none font-normal ${t.estado === 'PLANIFICADA' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                            {t.estado === 'PLANIFICADA' ? 'Planificado' : 'Real'}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(t.fecha), 'dd MMM yy')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-bold text-xs tabular-nums ${getSaldoColor(t.tipo === 'INGRESO' ? Number(t.monto) : -Number(t.monto))}`}>
                          {formatMonto(Number(t.monto), t.moneda)}
                        </p>
                      </div>
                    </div>
                    {t.comentario && (
                      <p className="text-[10px] text-gray-500 mt-2 italic bg-slate-50/50 p-1.5 rounded border border-dashed">
                        {t.comentario}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-10" />
                <p className="text-xs">No hay movimientos.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
