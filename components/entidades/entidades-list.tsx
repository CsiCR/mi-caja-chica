
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Building2 } from 'lucide-react';
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Gestión de Entidades
              </CardTitle>
              <CardDescription>
                Administra tus emprendimientos, sociedades, actividades freelance e inversiones personales
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nueva Entidad
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tipoFilter || 'all'} onValueChange={(value) => handleFilterChange('tipo', value)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
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
            <Select value={activaFilter || 'all'} onValueChange={(value) => handleFilterChange('activa', value)}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Activas</SelectItem>
                <SelectItem value="false">Inactivas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-500">Cargando entidades...</p>
            </div>
          ) : entidades.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No hay entidades</h3>
              <p className="mt-2 text-gray-500">
                Comienza creando tu primera entidad de negocio.
              </p>
              <Button onClick={() => setShowForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear primera entidad
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Creación</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entidades.map((entidad) => (
                      <TableRow key={entidad.id}>
                        <TableCell className="font-medium">{entidad.nombre}</TableCell>
                        <TableCell>{tipoLabels[entidad.tipo]}</TableCell>
                        <TableCell className="max-w-xs truncate">{entidad.descripcion || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={entidad.activa ? 'default' : 'secondary'}>
                            {entidad.activa ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(entidad.createdAt).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(entidad)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
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

              {/* Paginación */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between px-2">
                  <div className="text-sm text-gray-500">
                    Mostrando {((currentPage - 1) * pagination.limit) + 1} a{' '}
                    {Math.min(currentPage * pagination.limit, pagination.total)} de {pagination.total} entidades
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
        <EntidadForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Formulario de edición */}
      {editingEntidad && (
        <EntidadForm
          open={!!editingEntidad}
          onClose={() => setEditingEntidad(null)}
          onSuccess={handleUpdateSuccess}
          entidad={editingEntidad}
        />
      )}

      {/* Diálogo de eliminación */}
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
