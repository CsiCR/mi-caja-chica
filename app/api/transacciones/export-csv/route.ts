

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener todas las transacciones del usuario sin filtros
    const transacciones = await prisma.transaccion.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        entidad: {
          select: {
            nombre: true,
            tipo: true,
          }
        },
        cuentaBancaria: {
          select: {
            nombre: true,
            banco: true,
            moneda: true,
          }
        },
        asientoContable: {
          select: {
            codigo: true,
            nombre: true,
          }
        },
      },
      orderBy: [
        { fecha: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Crear el CSV content
    const csvHeaders = [
      'ID',
      'Descripcion',
      'Monto',
      'Moneda',
      'Tipo',
      'Estado',
      'Fecha',
      'Fecha_Planificada',
      'Comentario',
      'Entidad_Nombre',
      'Entidad_Tipo',
      'Cuenta_Nombre',
      'Cuenta_Banco',
      'Cuenta_Moneda',
      'Asiento_Codigo',
      'Asiento_Nombre',
      'Fecha_Creacion',
      'Fecha_Actualizacion'
    ].join(',');

    const csvRows = transacciones.map(t => [
      t.id,
      `"${t.descripcion.replace(/"/g, '""')}"`, // Escapar comillas
      t.monto.toString(),
      t.moneda,
      t.tipo,
      t.estado,
      t.fecha.toISOString().split('T')[0], // Solo fecha YYYY-MM-DD
      t.fechaPlanificada ? t.fechaPlanificada.toISOString().split('T')[0] : '',
      `"${(t.comentario || '').replace(/"/g, '""')}"`, // Escapar comillas
      `"${t.entidad.nombre.replace(/"/g, '""')}"`,
      t.entidad.tipo,
      `"${t.cuentaBancaria.nombre.replace(/"/g, '""')}"`,
      `"${t.cuentaBancaria.banco.replace(/"/g, '""')}"`,
      t.cuentaBancaria.moneda,
      t.asientoContable.codigo,
      `"${t.asientoContable.nombre.replace(/"/g, '""')}"`,
      t.createdAt.toISOString().split('T')[0],
      t.updatedAt.toISOString().split('T')[0],
    ].join(','));

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    // Crear nombre de archivo con fecha actual
    const fechaActual = new Date().toISOString().split('T')[0];
    const fileName = `transacciones_${fechaActual}.csv`;

    // Configurar headers para descarga
    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv; charset=utf-8');
    response.headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    
    return response;
  } catch (error) {
    console.error('Error al exportar transacciones:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

