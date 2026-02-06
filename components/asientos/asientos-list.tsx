
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, FileText, Sparkles, CheckSquare, Square, CheckCircle, XCircle } from 'lucide-react';
import { AsientoForm } from './asiento-form';
import { AsientoDeleteDialog } from './asiento-delete-dialog';
import { AsientosGenerateDialog } from './asientos-generate-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';

export interface AsientoContable {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AsientosResponse {
  asientos: AsientoContable[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function AsientosList() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [asientos, setAsientos] = useState<AsientoContable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activoFilter, setActivoFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [editingAsiento, setEditingAsiento] = useState<AsientoContable | null>(null);
  const [deletingAsiento, setDeletingAsiento] = useState<AsientoContable | null>(null);

  // Nuevos filtros
  const [entidadFilter, setEntidadFilter] = useState('');
  const [claseFilter, setClaseFilter] = useState('');
  const [mayorFilter, setMayorFilter] = useState('');
  const [subcuentaFilter, setSubcuentaFilter] = useState('');
  const [entidades, setEntidades] = useState<{ id: string, nombre: string }[]>([]);

  // Selección múltiple
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Manejar parámetros de URL para accesos rápidos desde dashboard
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'nuevo') {
      setShowForm(true);
      // Limpiar URL
      router.replace('/dashboard/asientos', { scroll: false });
    }

    // Cargar entidades para el filtro
    fetch('/api/entidades?limit=100') // Pedir suficientes
      .then(res => res.json())
      .then(data => setEntidades(data.entidades || []))
      .catch(err => console.error('Error cargando entidades:', err));
  }, [searchParams, router]);

  const fetchAsientos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50', // Aumentamos límite para ver más cuentas
        ...(searchTerm && { search: searchTerm }),
        ...(activoFilter && { activo: activoFilter }),
        ...(entidadFilter && { entidadId: entidadFilter }),
        ...(claseFilter && { clase: claseFilter }),
        ...(mayorFilter && { mayor: mayorFilter }),
        ...(subcuentaFilter && { subcuenta: subcuentaFilter }),
      });

      const response = await fetch(`/api/asientos?${params}`);
      if (!response.ok) throw new Error('Error al cargar asientos');

      const data: AsientosResponse = await response.json();
      setAsientos(data.asientos);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar los asientos contables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsientos();
    setSelectedIds([]); // Limpiar selección al cambiar filtros o página
  }, [currentPage, searchTerm, activoFilter, entidadFilter, claseFilter, mayorFilter, subcuentaFilter]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filter: string, value: string) => {
    const val = value === 'all' ? '' : value;
    if (filter === 'activo') setActivoFilter(val);
    if (filter === 'entidad') setEntidadFilter(val);
    if (filter === 'clase') {
      setClaseFilter(val);
      setMayorFilter(''); // Reset mayor and subcuenta when class changes
      setSubcuentaFilter('');
    }
    if (filter === 'mayor') {
      setMayorFilter(val);
      setSubcuentaFilter(''); // Reset subcuenta when mayor changes
    }
    if (filter === 'subcuenta') setSubcuentaFilter(val);

    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(asientos.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkAction = async (activo: boolean) => {
    if (selectedIds.length === 0) return;

    try {
      setBulkLoading(true);
      const response = await fetch('/api/asientos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, activo }),
      });

      if (!response.ok) throw new Error('Error en actualización masiva');

      toast.success(`Se han ${activo ? 'activado' : 'desactivado'} ${selectedIds.length} asientos`);
      setSelectedIds([]);
      fetchAsientos();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al realizar la acción masiva');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowForm(false);
    fetchAsientos();
    toast.success('Asiento contable creado correctamente');
  };

  const handleUpdateSuccess = () => {
    setEditingAsiento(null);
    fetchAsientos();
    toast.success('Asiento contable actualizado correctamente');
  };

  const handleDeleteSuccess = () => {
    setDeletingAsiento(null);
    fetchAsientos();
    toast.success('Asiento contable eliminado correctamente');
  };

  const handleEdit = (asiento: AsientoContable) => {
    setEditingAsiento(asiento);
  };

  const handleDelete = (asiento: AsientoContable) => {
    setDeletingAsiento(asiento);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Asientos Contables
              </CardTitle>
              <CardDescription>
                Crea y gestiona categorías contables para organizar tus transacciones
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowGenerate(true)}
                className="flex items-center gap-2 border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50 text-yellow-700"
              >
                <Sparkles className="h-4 w-4" />
                Auto-generar Plan
              </Button>
              <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Asiento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por código, nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={entidadFilter || 'all'} onValueChange={(value) => handleFilterChange('entidad', value)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Todas las Entidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Entidades</SelectItem>
                  {entidades.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={activoFilter || 'all'} onValueChange={(value) => handleFilterChange('activo', value)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  <SelectItem value="true">Activos</SelectItem>
                  <SelectItem value="false">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={claseFilter || 'all'} onValueChange={(value) => handleFilterChange('clase', value)}>
                <SelectTrigger className="grow sm:w-[120px]">
                  <SelectValue placeholder="Clase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Clases</SelectItem>
                  <SelectItem value="1">1 - Activo</SelectItem>
                  <SelectItem value="2">2 - Pasivo</SelectItem>
                  <SelectItem value="3">3 - Patrimonio</SelectItem>
                  <SelectItem value="4">4 - Ingresos</SelectItem>
                  <SelectItem value="5">5 - Gastos</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 grow sm:w-[150px]">
                <Input
                  placeholder="Mayor (ej: 1.1)"
                  value={mayorFilter}
                  onChange={(e) => handleFilterChange('mayor', e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="flex items-center gap-2 grow sm:w-[150px]">
                <Input
                  placeholder="Sub (ej: 1.1.01)"
                  value={subcuentaFilter}
                  onChange={(e) => handleFilterChange('subcuenta', e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Barra de Acciones Masivas */}
          {selectedIds.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">
                  {selectedIds.length} asientos seleccionados
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction(true)}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 border-green-200 text-green-700 hover:bg-green-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Activar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction(false)}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                  Desactivar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                  disabled={bulkLoading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Tabla */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-500">Cargando asientos...</p>
            </div>
          ) : asientos.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No hay asientos contables</h3>
              <p className="mt-2 text-gray-500">
                Crea tu primer asiento contable para categorizar tus transacciones.
              </p>
              <Button onClick={() => setShowForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer asiento
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={asientos.length > 0 && selectedIds.length === asientos.length}
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                      </TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Creación</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {asientos.map((asiento) => (
                      <TableRow key={asiento.id} className={selectedIds.includes(asiento.id) ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(asiento.id)}
                            onCheckedChange={(checked) => handleSelectOne(asiento.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium">{asiento.codigo}</TableCell>
                        <TableCell className="font-medium">{asiento.nombre}</TableCell>
                        <TableCell className="max-w-xs truncate">{asiento.descripcion || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={asiento.activo ? 'default' : 'secondary'}>
                            {asiento.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(asiento.createdAt).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(asiento)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(asiento)}
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
                    {Math.min(currentPage * pagination.limit, pagination.total)} de {pagination.total} asientos
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
        <AsientoForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Formulario de edición */}
      {editingAsiento && (
        <AsientoForm
          open={!!editingAsiento}
          onClose={() => setEditingAsiento(null)}
          onSuccess={handleUpdateSuccess}
          asiento={editingAsiento}
        />
      )}

      {/* Diálogo de generación con IA */}
      {showGenerate && (
        <AsientosGenerateDialog
          open={showGenerate}
          onClose={() => setShowGenerate(false)}
          onSuccess={fetchAsientos}
        />
      )}

      {/* Diálogo de eliminación */}
      {deletingAsiento && (
        <AsientoDeleteDialog
          open={!!deletingAsiento}
          onClose={() => setDeletingAsiento(null)}
          onSuccess={handleDeleteSuccess}
          asiento={deletingAsiento}
        />
      )}
    </div>
  );
}
