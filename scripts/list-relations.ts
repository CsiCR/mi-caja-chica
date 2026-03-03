import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const asientosConEntidad = await prisma.asientoContable.findMany({
        where: {
            entidadId: { not: null }
        },
        include: {
            entidad: true
        }
    });

    if (asientosConEntidad.length === 0) {
        console.log('No se encontraron asientos contables vinculados a ninguna entidad.');
    } else {
        console.log('--- ASIENTOS VINCULADOS A ENTIDADES ---');
        asientosConEntidad.forEach(a => {
            console.log(`Asiento: [${a.codigo}] ${a.nombre} -> Entidad: ${a.entidad?.nombre}`);
        });
    }

    const todasEntidades = await prisma.entidad.findMany({
        select: { nombre: true }
    });
    console.log('\n--- TODAS LAS ENTIDADES ---');
    todasEntidades.forEach(e => console.log(`- ${e.nombre}`));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
