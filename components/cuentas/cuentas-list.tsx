
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, CreditCard, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CuentaForm } from './cuenta-form';
import { CuentaDeleteDialog } from './cuenta-delete-dialog';
import toast from 'react-hot-toast';

export interface CuentaBancaria {
  id: string;
  nombre: string;
  banco: string;
  numeroCuenta?: string;
  tipoCuenta?: string;
  moneda: 'ARS' | 'USD';
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CuentasResponse {
  cuentas: CuentaBancaria[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const monedaLabels = {
  ARS: 'Pesos Argentinos',
  USD: 'Dólares Estadounidenses',
};

export function CuentasList() {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [monedaFilter, setMonedaFilter] = useState('');
  const [activaFilter, setActivaFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<CuentaBancaria | null>(null);
  const [deletingCuenta, setDeletingCuenta] = useState<CuentaBancaria | null>(null);

  const fetchCuentas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(monedaFilter && { moneda: monedaFilter }),
        ...(activaFilter && { activa: activaFilter }),
      });

      const response = await fetch(`/api/cuentas?${params}`);
      if (!response.ok) throw new Error('Error al cargar cuentas');

      const data: CuentasResponse = await response.json();
      setCuentas(data.cuentas);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar las cuentas bancarias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCuentas();
  }, [currentPage, searchTerm, monedaFilter, activaFilter]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filter: string, value: string) => {
    if (filter === 'moneda') {
      setMonedaFilter(value === 'all' ? '' : value);
    } else if (filter === 'activa') {
      setActivaFilter(value === 'all' ? '' : value);
    }
    setCurrentPage(1);
  };

  const handleCreateSuccess = () => {
    setShowForm(false);
    fetchCuentas();
    toast.success('Cuenta bancaria creada correctamente');
  };

  const handleUpdateSuccess = () => {
    setEditingCuenta(null);
    fetchCuentas();
    toast.success('Cuenta bancaria actualizada correctamente');
  };

  const handleDeleteSuccess = () => {
    setDeletingCuenta(null);
    fetchCuentas();
    toast.success('Cuenta bancaria eliminada correctamente');
  };

  const handleEdit = (cuenta: CuentaBancaria) => {
    setEditingCuenta(cuenta);
  };

  const handleDelete = (cuenta: CuentaBancaria) => {
    setDeletingCuenta(cuenta);
  };

  return (
    <div className="space-y-3">
      {/* Cabecera y Controles en una sola fila */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border shadow-sm space-y-3">
        <div className="flex items-center justify-between sm:justify-start gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <CreditCard className="h-4 w-4 text-slate-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Cuentas</h2>
          </div>
          <p className="text-[10px] text-slate-400 hidden md:block">Bancos y billeteras virtuales</p>
        </div>

        <div className="flex items-center gap-2">
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

          {/* Filtro */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-slate-200 shrink-0 relative">
                <Filter className="h-4 w-4" />
                {(monedaFilter || activaFilter) && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-4 space-y-4" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Moneda</Label>
                  <Select value={monedaFilter || 'all'} onValueChange={(value) => handleFilterChange('moneda', value)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las monedas</SelectItem>
                      <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                      <SelectItem value="USD">Dólares (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Estado</Label>
                  <Select value={activaFilter || 'all'} onValueChange={(value) => handleFilterChange('activa', value)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="true">Activas</SelectItem>
                      <SelectItem value="false">Inactivas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(monedaFilter || activaFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMonedaFilter('');
                      setActivaFilter('');
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

          {/* Botón Nueva Cuenta */}
          <Button onClick={() => setShowForm(true)} size="sm" className="h-9 gap-1.5 px-3 shrink-0 shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva</span>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
        {/* Tabla */}
        <div className="relative">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-slate-500">Cargando cuentas...</p>
            </div>
          ) : cuentas.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No hay cuentas</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
                {searchTerm || monedaFilter || activaFilter
                  ? "No se encontraron cuentas con los filtros aplicados."
                  : "Registra tu primera cuenta bancaria para empezar a gestionar tus movimientos."}
              </p>
              {!searchTerm && !monedaFilter && !activaFilter && (
                <Button onClick={() => setShowForm(true)} className="mt-6" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar primera cuenta
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[45%] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre / Banco</TableHead>
                    <TableHead className="hidden md:table-cell w-[25%] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detalles</TableHead>
                    <TableHead className="w-[10%] text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Moneda</TableHead>
                    <TableHead className="w-[10%] text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Estado</TableHead>
                    <TableHead className="w-[10%] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuentas.map((cuenta) => (
                    <TableRow key={cuenta.id} className="hover:bg-slate-50/50 transition-colors group border-slate-100">
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate max-w-[150px] sm:max-w-none">
                            {cuenta.nombre}
                          </span>
                          <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-medium">
                            {cuenta.banco}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-3">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs text-slate-600 font-mono">{cuenta.numeroCuenta || '-'}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{cuenta.tipoCuenta || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <Badge variant={cuenta.moneda === 'ARS' ? 'default' : 'outline'} className="text-[10px] px-1.5 h-5 bg-slate-900 text-white border-none">
                          {cuenta.moneda}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full mx-auto ring-4 ring-offset-0",
                            cuenta.activa
                              ? "bg-green-500 ring-green-50"
                              : "bg-slate-300 ring-slate-50"
                          )}
                          title={cuenta.activa ? 'Activa' : 'Inactiva'}
                        />
                      </TableCell>
                      <TableCell className="text-right py-3 pr-4">
                        <div className="flex items-center justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleEdit(cuenta)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(cuenta)}
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
        {!loading && cuentas.length > 0 && (
          <div className="px-4 py-3 border-t bg-slate-50/30 flex items-center justify-between">
            <div className="text-[10px] sm:text-xs text-slate-500 font-medium">
              <span className="hidden sm:inline">Mostrando </span>
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
        <CuentaForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editingCuenta && (
        <CuentaForm
          open={!!editingCuenta}
          onClose={() => setEditingCuenta(null)}
          onSuccess={handleUpdateSuccess}
          cuenta={editingCuenta}
        />
      )}

      {deletingCuenta && (
        <CuentaDeleteDialog
          open={!!deletingCuenta}
          onClose={() => setDeletingCuenta(null)}
          onSuccess={handleDeleteSuccess}
          cuenta={deletingCuenta}
        />
      )}
    </div>
  );
}
