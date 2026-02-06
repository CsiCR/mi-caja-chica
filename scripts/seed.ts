
import { PrismaClient, TipoEntidad, Moneda, TipoTransaccion, EstadoTransaccion } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowReset = process.env.ALLOW_PRODUCTION_RESET === 'true';

  if (isProduction && !allowReset) {
    console.error('❌ SEED ABORTADO: Intentando reiniciar base de datos en PRODUCCIÓN sin autorización.');
    console.error('   Para forzar, establece ALLOW_PRODUCTION_RESET="true" en las variables de entorno.');
    process.exit(1);
  }

  if (isProduction) {
    console.warn('⚠️  ADVERTENCIA: Ejecutando seed en PRODUCCIÓN con ALLOW_PRODUCTION_RESET activado.');
    console.warn('   Esperando 5 segundos antes de continuar... (Ctrl+C para cancelar)');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Limpiar datos existentes
  console.log('🧹 Limpiando base de datos...');
  await prisma.transaccion.deleteMany();
  await prisma.asientoContable.deleteMany();
  await prisma.cuentaBancaria.deleteMany();
  await prisma.entidad.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Crear usuario de prueba
  const hashedPassword = await bcrypt.hash('johndoe123', 10);
  const testUser = await prisma.user.create({
    data: {
      email: 'john@doe.com',
      password: hashedPassword,
      firstName: 'Juan Carlos',
      lastName: 'Empresario',
      name: 'Juan Carlos Empresario',
    },
  });

  console.log('✅ Usuario de prueba creado:', testUser.email);

  // Crear entidades
  const entidades = await Promise.all([
    prisma.entidad.create({
      data: {
        nombre: 'Panadería Don Carlos',
        descripcion: 'Panadería y confitería tradicional en Villa Crespo',
        tipo: TipoEntidad.COMERCIO,
        userId: testUser.id,
      },
    }),
    prisma.entidad.create({
      data: {
        nombre: 'Desarrollo Web SRL',
        descripcion: 'Sociedad de desarrollo de software y páginas web',
        tipo: TipoEntidad.TECNOLOGIA,
        userId: testUser.id,
      },
    }),
    prisma.entidad.create({
      data: {
        nombre: 'Consultoría Freelance',
        descripcion: 'Servicios de consultoría en marketing digital',
        tipo: TipoEntidad.FREELANCE,
        userId: testUser.id,
      },
    }),
    prisma.entidad.create({
      data: {
        nombre: 'Inversiones Personales',
        descripcion: 'Cartera de inversiones en bonos y acciones',
        tipo: TipoEntidad.PERSONAL,
        userId: testUser.id,
      },
    }),
  ]);

  console.log('✅ Entidades creadas:', entidades.length);

  // Crear cuentas bancarias
  const cuentasBancarias = await Promise.all([
    prisma.cuentaBancaria.create({
      data: {
        nombre: 'Banco Nación - CC Principal',
        banco: 'Banco de la Nación Argentina',
        numeroCuenta: '123-456789-0',
        tipoCuenta: 'Cuenta Corriente',
        moneda: Moneda.ARS,
        userId: testUser.id,
      },
    }),
    prisma.cuentaBancaria.create({
      data: {
        nombre: 'Santander - CA Ahorro',
        banco: 'Banco Santander',
        numeroCuenta: '987-654321-1',
        tipoCuenta: 'Caja de Ahorro',
        moneda: Moneda.ARS,
        userId: testUser.id,
      },
    }),
    prisma.cuentaBancaria.create({
      data: {
        nombre: 'HSBC - Cuenta USD',
        banco: 'HSBC Bank Argentina',
        numeroCuenta: '555-123456-2',
        tipoCuenta: 'Caja de Ahorro en USD',
        moneda: Moneda.USD,
        userId: testUser.id,
      },
    }),
    prisma.cuentaBancaria.create({
      data: {
        nombre: 'Mercado Pago',
        banco: 'Mercado Pago',
        numeroCuenta: 'MP-789012345',
        tipoCuenta: 'Cuenta Virtual',
        moneda: Moneda.ARS,
        userId: testUser.id,
      },
    }),
  ]);

  console.log('✅ Cuentas bancarias creadas:', cuentasBancarias.length);

  // Crear asientos contables
  const asientosContables = await Promise.all([
    prisma.asientoContable.create({
      data: {
        codigo: 'VTA001',
        nombre: 'Ventas de Productos',
        descripcion: 'Ingresos por venta de productos de panadería',
        userId: testUser.id,
      },
    }),
    prisma.asientoContable.create({
      data: {
        codigo: 'SRV001',
        nombre: 'Servicios Profesionales',
        descripcion: 'Ingresos por servicios de desarrollo web y consultoría',
        userId: testUser.id,
      },
    }),
    prisma.asientoContable.create({
      data: {
        codigo: 'ALQ001',
        nombre: 'Alquileres',
        descripcion: 'Gastos de alquiler de locales comerciales',
        userId: testUser.id,
      },
    }),
    prisma.asientoContable.create({
      data: {
        codigo: 'MP001',
        nombre: 'Materias Primas',
        descripcion: 'Compra de materias primas y mercaderías',
        userId: testUser.id,
      },
    }),
    prisma.asientoContable.create({
      data: {
        codigo: 'GAS001',
        nombre: 'Gastos Generales',
        descripcion: 'Gastos operativos diversos',
        userId: testUser.id,
      },
    }),
    prisma.asientoContable.create({
      data: {
        codigo: 'INV001',
        nombre: 'Rendimientos de Inversión',
        descripcion: 'Dividendos y rendimientos de inversiones',
        userId: testUser.id,
      },
    }),
  ]);

  console.log('✅ Asientos contables creados:', asientosContables.length);

  // Crear transacciones de ejemplo
  const fechaBase = new Date('2024-01-01');
  const transacciones = [];

  // Transacciones reales - Panadería
  transacciones.push(
    prisma.transaccion.create({
      data: {
        descripcion: 'Ventas del día - facturas y pan',
        monto: 85000,
        moneda: Moneda.ARS,
        tipo: TipoTransaccion.INGRESO,
        estado: EstadoTransaccion.REAL,
        fecha: new Date(fechaBase.getTime() + 1 * 24 * 60 * 60 * 1000),
        comentario: 'Día muy movido, muchos clientes',
        entidadId: entidades[0].id, // Panadería
        cuentaBancariaId: cuentasBancarias[3].id, // Mercado Pago
        asientoContableId: asientosContables[0].id, // Ventas
        userId: testUser.id,
      },
    }),
    prisma.transaccion.create({
      data: {
        descripcion: 'Compra de harina y levadura',
        monto: 25000,
        moneda: Moneda.ARS,
        tipo: TipoTransaccion.EGRESO,
        estado: EstadoTransaccion.REAL,
        fecha: new Date(fechaBase.getTime() + 2 * 24 * 60 * 60 * 1000),
        comentario: 'Stock para la semana',
        entidadId: entidades[0].id,
        cuentaBancariaId: cuentasBancarias[0].id, // Banco Nación
        asientoContableId: asientosContables[3].id, // Materias Primas
        userId: testUser.id,
      },
    }),

    // Transacciones reales - Desarrollo Web
    prisma.transaccion.create({
      data: {
        descripcion: 'Desarrollo de sitio web corporativo',
        monto: 450000,
        moneda: Moneda.ARS,
        tipo: TipoTransaccion.INGRESO,
        estado: EstadoTransaccion.REAL,
        fecha: new Date(fechaBase.getTime() + 5 * 24 * 60 * 60 * 1000),
        comentario: 'Proyecto completado para cliente PyMe',
        entidadId: entidades[1].id, // Desarrollo Web SRL
        cuentaBancariaId: cuentasBancarias[0].id,
        asientoContableId: asientosContables[1].id, // Servicios
        userId: testUser.id,
      },
    }),

    // Transacciones reales - Freelance
    prisma.transaccion.create({
      data: {
        descripcion: 'Consultoría en marketing digital',
        monto: 1200,
        moneda: Moneda.USD,
        tipo: TipoTransaccion.INGRESO,
        estado: EstadoTransaccion.REAL,
        fecha: new Date(fechaBase.getTime() + 7 * 24 * 60 * 60 * 1000),
        comentario: 'Cliente internacional, pago en USD',
        entidadId: entidades[2].id, // Freelance
        cuentaBancariaId: cuentasBancarias[2].id, // HSBC USD
        asientoContableId: asientosContables[1].id,
        userId: testUser.id,
      },
    }),

    // Transacciones planificadas
    prisma.transaccion.create({
      data: {
        descripcion: 'Alquiler del local - Enero',
        monto: 180000,
        moneda: Moneda.ARS,
        tipo: TipoTransaccion.EGRESO,
        estado: EstadoTransaccion.PLANIFICADA,
        fecha: new Date(),
        fechaPlanificada: new Date('2024-02-01'),
        comentario: 'Pago mensual del alquiler',
        entidadId: entidades[0].id,
        cuentaBancariaId: cuentasBancarias[0].id,
        asientoContableId: asientosContables[2].id, // Alquileres
        userId: testUser.id,
      },
    }),

    // Inversiones
    prisma.transaccion.create({
      data: {
        descripcion: 'Dividendos YPF',
        monto: 45000,
        moneda: Moneda.ARS,
        tipo: TipoTransaccion.INGRESO,
        estado: EstadoTransaccion.REAL,
        fecha: new Date(fechaBase.getTime() + 10 * 24 * 60 * 60 * 1000),
        comentario: 'Dividendos del semestre',
        entidadId: entidades[3].id, // Inversiones
        cuentaBancariaId: cuentasBancarias[1].id, // Santander
        asientoContableId: asientosContables[5].id, // Rendimientos
        userId: testUser.id,
      },
    })
  );

  const transaccionesCreadas = await Promise.all(transacciones);
  console.log('✅ Transacciones creadas:', transaccionesCreadas.length);

  console.log('🎉 Seed completado exitosamente!');
  console.log('📊 Resumen:');
  console.log(`- Usuario: ${testUser.email}`);
  console.log(`- Entidades: ${entidades.length}`);
  console.log(`- Cuentas Bancarias: ${cuentasBancarias.length}`);
  console.log(`- Asientos Contables: ${asientosContables.length}`);
  console.log(`- Transacciones: ${transaccionesCreadas.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
