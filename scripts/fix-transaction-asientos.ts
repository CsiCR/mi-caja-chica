import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- INICIANDO ACTUALIZACIÓN DE TRANSACCIONES ---');

    // Buscar entidades por partes para evitar errores de acentos o variaciones de nombre
    const orange = await prisma.entidad.findFirst({
        where: { nombre: { contains: 'Orange', mode: 'insensitive' } }
    });
    const vivienda = await prisma.entidad.findFirst({
        where: {
            OR: [
                { nombre: { contains: 'Vivienda', mode: 'insensitive' } },
                { nombre: { contains: 'Particular', mode: 'insensitive' } }
            ]
        }
    });

    // Buscar asientos exactos
    const asientoA = await prisma.asientoContable.findFirst({
        where: { codigo: 'A-Imputar' }
    });
    const asientoB = await prisma.asientoContable.findFirst({
        where: { codigo: 'B-Imputar' }
    });

    console.log('Entidades encontradas:', {
        orange: orange?.nombre || '❌ No encontrado',
        vivienda: vivienda?.nombre || '❌ No encontrado'
    });
    console.log('Asientos encontrados:', {
        asientoA: asientoA?.codigo || '❌ No encontrado',
        asientoB: asientoB?.codigo || '❌ No encontrado'
    });

    if (!orange || !vivienda || !asientoA || !asientoB) {
        console.error('❌ Error: No se encontraron todos los elementos necesarios.');
        return;
    }

    // Actualizar transacciones de Orange
    const resOrange = await prisma.transaccion.updateMany({
        where: { entidadId: orange.id },
        data: { asientoContableId: asientoA.id }
    });
    console.log(`✅ Actualizadas ${resOrange.count} transacciones para ${orange.nombre} -> ${asientoA.codigo}`);

    // Actualizar transacciones de Vivienda
    const resVivienda = await prisma.transaccion.updateMany({
        where: { entidadId: vivienda.id },
        data: { asientoContableId: asientoB.id }
    });
    console.log(`✅ Actualizadas ${resVivienda.count} transacciones para ${vivienda.nombre} -> ${asientoB.codigo}`);

    console.log('--- FINALIZADO ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
