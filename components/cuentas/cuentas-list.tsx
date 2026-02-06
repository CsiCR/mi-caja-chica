
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, CreditCard } from 'lucide-react';
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Cuentas Bancarias
              </CardTitle>
              <CardDescription>
                Administra todas tus cuentas bancarias, cajas de ahorro y billeteras virtuales
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nueva Cuenta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nombre, banco o número de cuenta..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={monedaFilter || 'all'} onValueChange={(value) => handleFilterChange('moneda', value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las monedas</SelectItem>
                <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                <SelectItem value="USD">Dólares (USD)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activaFilter || 'all'} onValueChange={(value) => handleFilterChange('activa', value)}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="true">Activas</SelectItem>
                <SelectItem value="false">Inactivas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-500">Cargando cuentas...</p>
            </div>
          ) : cuentas.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No hay cuentas bancarias</h3>
              <p className="mt-2 text-gray-500">
                Registra tu primera cuenta bancaria para comenzar a gestionar tus finanzas.
              </p>
              <Button onClick={() => setShowForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Registrar primera cuenta
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Número de Cuenta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Moneda</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuentas.map((cuenta) => (
                      <TableRow key={cuenta.id}>
                        <TableCell className="font-medium">{cuenta.nombre}</TableCell>
                        <TableCell>{cuenta.banco}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {cuenta.numeroCuenta || '-'}
                        </TableCell>
                        <TableCell>{cuenta.tipoCuenta || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={cuenta.moneda === 'ARS' ? 'default' : 'secondary'}>
                            {cuenta.moneda}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={cuenta.activa ? 'default' : 'secondary'}>
                            {cuenta.activa ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(cuenta)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
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

              {/* Paginación */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between px-2">
                  <div className="text-sm text-gray-500">
                    Mostrando {((currentPage - 1) * pagination.limit) + 1} a{' '}
                    {Math.min(currentPage * pagination.limit, pagination.total)} de {pagination.total} cuentas
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
                      Página {currentPage} de {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                      disabled={currentPage === pagination.pages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Formulario de creación */}
      {showForm && (
        <CuentaForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Formulario de edición */}
      {editingCuenta && (
        <CuentaForm
          open={!!editingCuenta}
          onClose={() => setEditingCuenta(null)}
          onSuccess={handleUpdateSuccess}
          cuenta={editingCuenta}
        />
      )}

      {/* Diálogo de eliminación */}
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
