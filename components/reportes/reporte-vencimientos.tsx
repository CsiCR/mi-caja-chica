
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
  Edit
} from 'lucide-react';
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
  const [entidades, setEntidades] = useState<Array<{id: string; nombre: string}>>([]);
  const [cuentas, setCuentas] = useState<Array<{id: string; nombre: string; banco: string}>>([]);
  
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Reporte de Vencimientos Planificados
          </CardTitle>
          <CardDescription>
            Visualiza tus transacciones planificadas organizadas por {agrupacion}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="agrupacion">Agrupar por</Label>
                <Select value={agrupacion} onValueChange={(value: 'semana' | 'mes') => setAgrupacion(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semana">Semana</SelectItem>
                    <SelectItem value="mes">Mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tipo-filter">Tipo</Label>
                <Select value={tipoFilter || 'all'} onValueChange={(value) => setTipoFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="INGRESO">Ingresos</SelectItem>
                    <SelectItem value="EGRESO">Egresos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="moneda-filter">Moneda</Label>
                <Select value={monedaFilter || 'all'} onValueChange={(value) => setMonedaFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
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
                <Label htmlFor="entidad-filter">Entidad</Label>
                <Select value={entidadFilter || 'all'} onValueChange={(value) => setEntidadFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
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
              </div>

              <div>
                <Label htmlFor="cuenta-filter">Cuenta</Label>
                <Select value={cuentaFilter || 'all'} onValueChange={(value) => setCuentaFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
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
              </div>

              <div>
                <Label htmlFor="periodos">Períodos a mostrar</Label>
                <Select value={periodos.toString()} onValueChange={(value) => setPeriodos(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 {agrupacion}s</SelectItem>
                    <SelectItem value="8">8 {agrupacion}s</SelectItem>
                    <SelectItem value="12">12 {agrupacion}s</SelectItem>
                    <SelectItem value="24">24 {agrupacion}s</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex items-center space-x-2">
                <Switch
                  id="solo-vencidas"
                  checked={soloVencidas}
                  onCheckedChange={setSoloVencidas}
                />
                <Label htmlFor="solo-vencidas" className="text-sm">
                  Solo transacciones vencidas
                </Label>
              </div>
              
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar Filtros
                </Button>
                <Button onClick={fetchVencimientos} disabled={loading}>
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
            <Card key={grupo.key} className={grupo.vencido ? 'border-red-200 bg-red-50/50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${grupo.vencido ? 'bg-red-100' : 'bg-blue-100'}`}>
                      {agrupacion === 'semana' ? (
                        <CalendarDays className={`h-5 w-5 ${grupo.vencido ? 'text-red-600' : 'text-blue-600'}`} />
                      ) : (
                        <Calendar className={`h-5 w-5 ${grupo.vencido ? 'text-red-600' : 'text-blue-600'}`} />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{grupo.periodo}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {grupo.transacciones.length} transacciones planificadas
                        {grupo.vencido && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Vencido
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>

                  {/* Totales del período */}
                  <div className="text-right">
                    <div className="space-y-1">
                      {grupo.totales.ARS.neto !== 0 && (
                        <div className={`font-bold text-sm ${getSaldoColor(grupo.totales.ARS.neto)}`}>
                          Neto ARS: {formatMonto(grupo.totales.ARS.neto, 'ARS')}
                        </div>
                      )}
                      {grupo.totales.USD.neto !== 0 && (
                        <div className={`font-bold text-sm ${getSaldoColor(grupo.totales.USD.neto)}`}>
                          Neto USD: {formatMonto(grupo.totales.USD.neto, 'USD')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {grupo.transacciones.map((transaccion) => (
                    <div
                      key={transaccion.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                    >
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="font-medium">{transaccion.descripcion}</div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(transaccion.fechaPlanificada), 'dd/MM/yyyy', { locale: es })}
                          </div>
                          {transaccion.comentario && (
                            <div className="text-xs text-gray-400 mt-1">
                              {transaccion.comentario}
                            </div>
                          )}
                        </div>

                        <div className="text-sm">
                          <div className="font-medium">{transaccion.entidad.nombre}</div>
                          <div className="text-gray-500">{transaccion.cuentaBancaria.nombre}</div>
                          <div className="text-gray-400">{transaccion.asientoContable.codigo}</div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Badge variant={transaccion.tipo === 'INGRESO' ? 'default' : 'destructive'}>
                              {transaccion.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                            </Badge>
                            <div className={`font-bold mt-1 ${transaccion.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                              {transaccion.tipo === 'INGRESO' ? '+' : '-'}{formatMonto(transaccion.monto, transaccion.moneda)}
                            </div>
                          </div>
                          
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setTransaccionAEditar(transaccion)}
                              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar y Finalizar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirDialogoMarcarRealizada(transaccion)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Solo Marcar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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

      {/* Diálogo para editar y finalizar */}
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
  );
}
