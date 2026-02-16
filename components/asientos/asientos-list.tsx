
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, FileText, Sparkles, CheckSquare, Square, CheckCircle, XCircle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
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
    <div className="space-y-3">
      {/* Cabecera y Controles en una sola fila */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-slate-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Asientos</h2>
          </div>

          <div className="flex gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGenerate(true)}
              className="h-8 sm:h-9 px-2 sm:px-3 border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50 text-yellow-700 gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">IA Plan</span>
            </Button>
            <Button onClick={() => setShowForm(true)} size="sm" className="h-8 sm:h-9 px-2 sm:px-3 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nuevo</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
            <Input
              placeholder="Buscar código o nombre..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-9 border-slate-200 bg-slate-50/50 focus:bg-white transition-colors text-sm"
            />
          </div>

          {/* Filtro Avanzado */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-slate-200 shrink-0 relative bg-white">
                <Filter className="h-4 w-4" />
                {(activoFilter || entidadFilter || claseFilter || mayorFilter || subcuentaFilter) && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-4 space-y-4" align="end">
              <div className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar pr-1">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Entidad</Label>
                  <Select value={entidadFilter || 'all'} onValueChange={(value) => handleFilterChange('entidad', value)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todas las Entidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las Entidades</SelectItem>
                      {entidades.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Clase</Label>
                  <Select value={claseFilter || 'all'} onValueChange={(value) => handleFilterChange('clase', value)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todas las Clases" />
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
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Mayor</Label>
                    <Input
                      placeholder="ej: 1.1"
                      value={mayorFilter}
                      onChange={(e) => handleFilterChange('mayor', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Sub</Label>
                    <Input
                      placeholder="ej: 1.1.01"
                      value={subcuentaFilter}
                      onChange={(e) => handleFilterChange('subcuenta', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Estado</Label>
                  <Select value={activoFilter || 'all'} onValueChange={(value) => handleFilterChange('activo', value)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los Estados</SelectItem>
                      <SelectItem value="true">Activos</SelectItem>
                      <SelectItem value="false">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(activoFilter || entidadFilter || claseFilter || mayorFilter || subcuentaFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActivoFilter('');
                      setEntidadFilter('');
                      setClaseFilter('');
                      setMayorFilter('');
                      setSubcuentaFilter('');
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
        </div>
      </div>

      {/* Acciones Masivas (Sticky/Floating) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 text-white rounded-full px-4 py-2 shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in zoom-in-95 fill-mode-both">
          <span className="text-xs font-bold px-2 py-0.5 bg-primary rounded-full">{selectedIds.length}</span>
          <div className="h-4 w-[1px] bg-slate-700" />
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBulkAction(true)}
              disabled={bulkLoading}
              className="h-8 w-8 p-0 hover:bg-slate-800 text-green-400"
              title="Activar"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBulkAction(false)}
              disabled={bulkLoading}
              className="h-8 w-8 p-0 hover:bg-slate-800 text-red-400"
              title="Desactivar"
            >
              <XCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              disabled={bulkLoading}
              className="h-8 w-8 p-0 hover:bg-slate-800 text-slate-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
        {/* Tabla */}
        <div className="relative">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-slate-500">Cargando...</p>
            </div>
          ) : asientos.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Sin asientos</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
                No hay asientos para mostrar.
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowForm(true)} className="mt-6" variant="outline">
                  Crear primer asiento
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[40px] px-3">
                      <Checkbox
                        checked={asientos.length > 0 && selectedIds.length === asientos.length}
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead className="w-[45%] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plan / Nombre</TableHead>
                    <TableHead className="hidden md:table-cell w-[35%] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descripción</TableHead>
                    <TableHead className="w-[10%] text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Estado</TableHead>
                    <TableHead className="w-[10%] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asientos.map((asiento) => (
                    <TableRow key={asiento.id} className={cn(
                      "hover:bg-slate-50/50 transition-colors group border-slate-100",
                      selectedIds.includes(asiento.id) && "bg-primary/5"
                    )}>
                      <TableCell className="px-3">
                        <Checkbox
                          checked={selectedIds.includes(asiento.id)}
                          onCheckedChange={(checked) => handleSelectOne(asiento.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] sm:text-[11px] text-slate-500 font-bold leading-none mb-1">
                            {asiento.codigo}
                          </span>
                          <span className="font-bold text-slate-900 text-sm leading-tight truncate max-w-[150px] sm:max-w-none">
                            {asiento.nombre}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-3">
                        <p className="text-xs text-slate-500 truncate max-w-[250px]">{asiento.descripcion || '-'}</p>
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full mx-auto ring-4 ring-offset-0",
                            asiento.activo
                              ? "bg-green-500 ring-green-50"
                              : "bg-slate-300 ring-slate-50"
                          )}
                          title={asiento.activo ? 'Activo' : 'Inactivo'}
                        />
                      </TableCell>
                      <TableCell className="text-right py-3 pr-4">
                        <div className="flex items-center justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleEdit(asiento)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
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
          )}
        </div>

        {/* Paginación Compacta */}
        {!loading && asientos.length > 0 && (
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
        <AsientoForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editingAsiento && (
        <AsientoForm
          open={!!editingAsiento}
          onClose={() => setEditingAsiento(null)}
          onSuccess={handleUpdateSuccess}
          asiento={editingAsiento}
        />
      )}

      {showGenerate && (
        <AsientosGenerateDialog
          open={showGenerate}
          onClose={() => setShowGenerate(false)}
          onSuccess={fetchAsientos}
        />
      )}

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
