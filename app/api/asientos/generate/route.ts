
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generatePlanContableWithGemini } from '@/lib/gemini';

const activityLabels: Record<string, string> = {
    'FREELANCE': 'Freelance / Profesional Independiente',
    'COMERCIO': 'Comercio Minorista / Negocio',
    'SERVICIOS': 'Empresa de Servicios',
    'CONSTRUCCION': 'Construcción y Refacciones',
    'TECNOLOGIA': 'Software y Tecnología',
    'PERSONAL': 'Finanzas Personales e Inversiones',
};

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { tipoActividad } = await req.json(); // Este es el valor del ENUM
        if (!tipoActividad) {
            return NextResponse.json({ error: 'Tipo de actividad requerido' }, { status: 400 });
        }

        const labelActividad = activityLabels[tipoActividad] || tipoActividad;
        const plan = await generatePlanContableWithGemini(labelActividad);
        if (!plan || !Array.isArray(plan)) {
            return NextResponse.json({ error: 'No se pudo generar el plan con IA' }, { status: 500 });
        }

        // Obtener códigos existentes para evitar duplicados
        const existingCodes = await prisma.asientoContable.findMany({
            where: { userId: session.user.id },
            select: { codigo: true }
        });
        const existingCodesSet = new Set(existingCodes.map(c => c.codigo));

        const newAsientos = plan.filter(a => !existingCodesSet.has(a.codigo));

        if (newAsientos.length === 0) {
            return NextResponse.json({ message: 'No hay asientos nuevos para agregar', count: 0 });
        }

        // Creación masiva
        const result = await prisma.asientoContable.createMany({
            data: newAsientos.map(a => ({
                codigo: a.codigo,
                nombre: a.nombre,
                descripcion: a.descripcion || '',
                userId: session.user.id
            }))
        });

        return NextResponse.json({
            message: 'Plan contable generado correctamente',
            count: result.count,
            asientos: newAsientos
        });

    } catch (error) {
        console.error('Error en API de generación de plan:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
