
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
import { BarChart3, TrendingUp, TrendingDown, DollarSign, RefreshCw, Eye, Calendar, User, CreditCard } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reporte de Saldos por Entidad y Cuenta
          </CardTitle>
          <CardDescription>
            Visualiza los saldos actuales de cada entidad distribuidos por cuenta bancaria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="entidad-filter">Filtrar por Entidad</Label>
                <Select value={entidadFilter || 'all'} onValueChange={(value) => setEntidadFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las entidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las entidades</SelectItem>
                    {entidades.map((entidad) => (
                      <SelectItem key={entidad.id} value={entidad.id}>
                        {entidad.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cuenta-filter">Filtrar por Cuenta</Label>
                <Select value={cuentaFilter || 'all'} onValueChange={(value) => setCuentaFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las cuentas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las cuentas</SelectItem>
                    {cuentas.map((cuenta) => (
                      <SelectItem key={cuenta.id} value={cuenta.id}>
                        {cuenta.nombre} - {cuenta.banco}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="moneda-filter">Filtrar por Moneda</Label>
                <Select value={monedaFilter || 'all'} onValueChange={(value) => setMonedaFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las monedas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las monedas</SelectItem>
                    <SelectItem value="ARS">Solo ARS</SelectItem>
                    <SelectItem value="USD">Solo USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="planificadas-switch">Incluir Planificadas</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Switch
                    id="planificadas-switch"
                    checked={incluirPlanificadas}
                    onCheckedChange={setIncluirPlanificadas}
                  />
                  <Label htmlFor="planificadas-switch" className="text-sm text-gray-600">
                    {incluirPlanificadas ? 'Incluidas' : 'Solo reales'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label>Rango de Fechas</Label>
                <DatePickerWithRange
                  className="w-full"
                  date={dateRange}
                  onDateChange={setDateRange}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar Filtros
                </Button>
                <Button onClick={fetchSaldos} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen General */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total en Pesos</p>
                  <p className={`text-2xl font-bold ${getSaldoColor(data.totalGeneral.ARS)}`}>
                    {formatMonto(data.totalGeneral.ARS, 'ARS')}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total en Dólares</p>
                  <p className={`text-2xl font-bold ${getSaldoColor(data.totalGeneral.USD)}`}>
                    {formatMonto(data.totalGeneral.USD, 'USD')}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Entidades Activas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.entidades.length}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla Cruzada de Saldos */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-500">Generando reporte...</p>
          </CardContent>
        </Card>
      ) : data ? (
        <Card>
          <CardHeader>
            <CardTitle>Tabla Cruzada de Saldos</CardTitle>
            <CardDescription>
              Saldos por entidad distribuidos por cuenta bancaria
              {dateRange?.from && dateRange?.to && (
                <span className="block mt-1 text-xs">
                  Período: {format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - {format(dateRange.to, 'dd/MM/yyyy', { locale: es })}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Entidad</TableHead>
                    {data.cuentas.map((cuenta) => (
                      <TableHead key={cuenta.id} className="text-center min-w-[120px]">
                        <div className="flex flex-col">
                          <span className="font-medium">{cuenta.nombre}</span>
                          <span className="text-xs text-gray-500">{cuenta.banco}</span>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {cuenta.moneda}
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-bold bg-gray-50">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entidades.map((entidad) => (
                    <TableRow key={entidad.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{entidad.nombre}</span>
                          <span className="text-xs text-gray-500 capitalize">
                            {entidad.tipo.toLowerCase().replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      {data.cuentas.map((cuenta) => {
                        const saldo = data.saldosMatrix[entidad.id]?.[cuenta.id];
                        const monedaCuenta = cuenta.moneda as 'ARS' | 'USD';
                        const montoSaldo = saldo?.[monedaCuenta] || 0;

                        return (
                          <TableCell
                            key={cuenta.id}
                            className="text-center cursor-pointer hover:bg-slate-50 transition-colors"
                            style={getHeatmapStyle(montoSaldo, monedaCuenta)}
                            onClick={() => fetchDetail(entidad.id, cuenta.id, entidad.nombre, cuenta.nombre)}
                          >
                            <span className={`font-mono text-sm ${getSaldoColor(montoSaldo)}`}>
                              {montoSaldo !== 0 ? formatMonto(montoSaldo, monedaCuenta) : '-'}
                            </span>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-bold bg-gray-50">
                        <div className="flex flex-col gap-1">
                          {data.totalesPorEntidad[entidad.id]?.ARS !== 0 && (
                            <span className={`font-mono text-sm ${getSaldoColor(data.totalesPorEntidad[entidad.id]?.ARS || 0)}`}>
                              {formatMonto(data.totalesPorEntidad[entidad.id]?.ARS || 0, 'ARS')}
                            </span>
                          )}
                          {data.totalesPorEntidad[entidad.id]?.USD !== 0 && (
                            <span className={`font-mono text-sm ${getSaldoColor(data.totalesPorEntidad[entidad.id]?.USD || 0)}`}>
                              {formatMonto(data.totalesPorEntidad[entidad.id]?.USD || 0, 'USD')}
                            </span>
                          )}
                          {data.totalesPorEntidad[entidad.id]?.ARS === 0 && data.totalesPorEntidad[entidad.id]?.USD === 0 && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Fila de totales */}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell className="font-bold">TOTALES</TableCell>
                    {data.cuentas.map((cuenta) => {
                      const monedaCuenta = cuenta.moneda as 'ARS' | 'USD';
                      const totalCuenta = data.totalesPorCuenta[cuenta.id]?.[monedaCuenta] || 0;

                      return (
                        <TableCell key={cuenta.id} className="text-center">
                          <span className={`font-mono text-sm ${getSaldoColor(totalCuenta)}`}>
                            {totalCuenta !== 0 ? formatMonto(totalCuenta, monedaCuenta) : '-'}
                          </span>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-bold bg-gray-100">
                      <div className="flex flex-col gap-1">
                        <span className={`font-mono text-sm ${getSaldoColor(data.totalGeneral.ARS)}`}>
                          {formatMonto(data.totalGeneral.ARS, 'ARS')}
                        </span>
                        <span className={`font-mono text-sm ${getSaldoColor(data.totalGeneral.USD)}`}>
                          {formatMonto(data.totalGeneral.USD, 'USD')}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Panel Lateral de Detalle (Drill-down) */}
      <Sheet open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <SheetContent className="sm:max-w-[500px] w-full overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Detalle de Transacciones
            </SheetTitle>
            <SheetDescription>
              Viendo movimientos de <strong>{selectedCell?.entidadNombre}</strong> en la cuenta <strong>{selectedCell?.cuentaNombre}</strong>
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-4">
            {loadingDetail ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-primary animate-spin mb-2" />
                <p className="text-sm text-gray-500">Buscando movimientos...</p>
              </div>
            ) : detailTransactions.length > 0 ? (
              <div className="space-y-4">
                {detailTransactions.map((t) => (
                  <div key={t.id} className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{t.descripcion}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={t.tipo === 'INGRESO' ? 'default' : 'destructive'} className="text-[10px] h-4 px-1">
                            {t.tipo}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(t.fecha), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </div>
                      <span className={`font-mono font-bold ${getSaldoColor(t.tipo === 'INGRESO' ? Number(t.monto) : -Number(t.monto))}`}>
                        {formatMonto(Number(t.monto), t.moneda)}
                      </span>
                    </div>
                    {t.comentario && (
                      <p className="text-xs text-gray-500 mt-2 italic bg-gray-50 p-2 rounded">
                        "{t.comentario}"
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t text-[10px] text-gray-400">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {t.entidad?.nombre}
                      </div>
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {t.cuentaBancaria?.nombre}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No se encontraron transacciones para estos filtros.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
