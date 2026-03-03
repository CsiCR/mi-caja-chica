import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.transaccion.groupBy({
        by: ['entidadId', 'asientoContableId'],
        _count: {
            _all: true
        }
    });

    const entidades = await prisma.entidad.findMany({
        select: { id: true, nombre: true }
    });
    const asientos = await prisma.asientoContable.findMany({
        select: { id: true, codigo: true }
    });

    const entidadMap = Object.fromEntries(entidades.map(e => [e.id, e.nombre]));
    const asientoMap = Object.fromEntries(asientos.map(a => [a.id, a.codigo]));

    let output = '--- RESUMEN DE TRANSACCIONES ---\n';
    counts.forEach(c => {
        output += `Entidad: ${entidadMap[c.entidadId] || 'Unknown'} | Asiento: ${asientoMap[c.asientoContableId] || 'Unknown'} | Cantidad: ${c._count._all}\n`;
    });

    fs.writeFileSync('c:/MiCajaChica/mi_caja_chica/app/scripts/counts-report.txt', output);
    console.log('Reporte generado en counts-report.txt');
}

main().catch(console.error).finally(() => prisma.$disconnect());
