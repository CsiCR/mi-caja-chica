
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Building2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { EntidadForm } from './entidad-form';
import { EntidadDeleteDialog } from './entidad-delete-dialog';
import toast from 'react-hot-toast';

export interface Entidad {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: 'FREELANCE' | 'COMERCIO' | 'SERVICIOS' | 'CONSTRUCCION' | 'TECNOLOGIA' | 'PERSONAL';
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EntidadesResponse {
  entidades: Entidad[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const tipoLabels = {
  FREELANCE: 'Freelance',
  COMERCIO: 'Comercio',
  SERVICIOS: 'Servicios',
  CONSTRUCCION: 'Construcción',
  TECNOLOGIA: 'Tecnología',
  PERSONAL: 'Personal',
};

export function EntidadesList() {
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [activaFilter, setActivaFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingEntidad, setEditingEntidad] = useState<Entidad | null>(null);
  const [deletingEntidad, setDeletingEntidad] = useState<Entidad | null>(null);

  const fetchEntidades = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(tipoFilter && { tipo: tipoFilter }),
        ...(activaFilter && { activa: activaFilter }),
      });

      const response = await fetch(`/api/entidades?${params}`);
      if (!response.ok) throw new Error('Error al cargar entidades');

      const data: EntidadesResponse = await response.json();
      setEntidades(data.entidades);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar las entidades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntidades();
  }, [currentPage, searchTerm, tipoFilter, activaFilter]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filter: string, value: string) => {
    if (filter === 'tipo') {
      setTipoFilter(value === 'all' ? '' : value);
    } else if (filter === 'activa') {
      setActivaFilter(value === 'all' ? '' : value);
    }
    setCurrentPage(1);
  };

  const handleCreateSuccess = () => {
    setShowForm(false);
    fetchEntidades();
    toast.success('Entidad creada correctamente');
  };

  const handleUpdateSuccess = () => {
    setEditingEntidad(null);
    fetchEntidades();
    toast.success('Entidad actualizada correctamente');
  };

  const handleDeleteSuccess = () => {
    setDeletingEntidad(null);
    fetchEntidades();
    toast.success('Entidad eliminada correctamente');
  };

  const handleEdit = (entidad: Entidad) => {
    setEditingEntidad(entidad);
  };

  const handleDelete = (entidad: Entidad) => {
    setDeletingEntidad(entidad);
  };

  return (
    <div className="space-y-3">
      {/* Cabecera y Controles en una sola fila */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border shadow-sm space-y-3">
        <div className="flex items-center justify-between sm:justify-start gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-slate-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Entidades</h2>
          </div>
          <p className="text-[10px] text-slate-400 hidden md:block">Gestiona tus emprendimientos y sociedades</p>
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
                {(tipoFilter || activaFilter) && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-4 space-y-4" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Tipo</Label>
                  <Select value={tipoFilter || 'all'} onValueChange={(value) => handleFilterChange('tipo', value)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="FREELANCE">Freelance</SelectItem>
                      <SelectItem value="COMERCIO">Comercio</SelectItem>
                      <SelectItem value="SERVICIOS">Servicios</SelectItem>
                      <SelectItem value="CONSTRUCCION">Construcción</SelectItem>
                      <SelectItem value="TECNOLOGIA">Tecnología</SelectItem>
                      <SelectItem value="PERSONAL">Personal</SelectItem>
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
                {(tipoFilter || activaFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTipoFilter('');
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

          {/* Botón Nueva Entidad */}
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
              <p className="mt-2 text-sm text-slate-500">Cargando entidades...</p>
            </div>
          ) : entidades.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No hay entidades</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
                {searchTerm || tipoFilter || activaFilter
                  ? "No se encontraron entidades con los filtros aplicados."
                  : "Comienza creando tu primera entidad de negocio para empezar a gestionar tus finanzas."}
              </p>
              {!searchTerm && !tipoFilter && !activaFilter && (
                <Button onClick={() => setShowForm(true)} className="mt-6" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera entidad
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[45%] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre / Tipo</TableHead>
                    <TableHead className="hidden md:table-cell w-[35%] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descripción</TableHead>
                    <TableHead className="w-[10%] text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Estado</TableHead>
                    <TableHead className="w-[10%] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entidades.map((entidad) => (
                    <TableRow key={entidad.id} className="hover:bg-slate-50/50 transition-colors group border-slate-100">
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate max-w-[180px] sm:max-w-none">
                            {entidad.nombre}
                          </span>
                          <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-medium">
                            {tipoLabels[entidad.tipo]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-3">
                        <p className="text-xs text-slate-500 truncate max-w-[250px]">{entidad.descripcion || '-'}</p>
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full mx-auto ring-4 ring-offset-0",
                            entidad.activa
                              ? "bg-green-500 ring-green-50"
                              : "bg-slate-300 ring-slate-50"
                          )}
                          title={entidad.activa ? 'Activa' : 'Inactiva'}
                        />
                      </TableCell>
                      <TableCell className="text-right py-3 pr-4">
                        <div className="flex items-center justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleEdit(entidad)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(entidad)}
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
        {!loading && entidades.length > 0 && (
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
        <EntidadForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editingEntidad && (
        <EntidadForm
          open={!!editingEntidad}
          onClose={() => setEditingEntidad(null)}
          onSuccess={handleUpdateSuccess}
          entidad={editingEntidad}
        />
      )}

      {deletingEntidad && (
        <EntidadDeleteDialog
          open={!!deletingEntidad}
          onClose={() => setDeletingEntidad(null)}
          onSuccess={handleDeleteSuccess}
          entidad={deletingEntidad}
        />
      )}
    </div>
  );
}
