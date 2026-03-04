

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayoutServer } from '@/components/layout/dashboard-layout-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Wallet,
  Building2,
  CreditCard,
  BookOpen,
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  Sparkles,
  Scale,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { APP_VERSION } from '@/lib/version-config';

export default async function InformacionPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  return (
    <DashboardLayoutServer user={session.user}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Mi Caja Chica</h1>
              <p className="text-green-100">Sistema de Gestión Financiera</p>
            </div>
          </div>
          <p className="text-lg text-white/90">
            Tu herramienta integral para la gestión financiera de emprendimientos argentinos
          </p>
        </div>

        {/* Descripción principal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">¿Qué es Mi Caja Chica?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              <strong>Mi Caja Chica</strong> es una plataforma diseñada especialmente para emprendedores
              argentinos que necesitan llevar un control preciso de sus finanzas personales y empresariales.
              Con nuestra herramienta podrás gestionar múltiples emprendimientos, registrar ingresos y egresos,
              manejar cuentas bancarias y generar reportes detallados para tomar mejores decisiones financieras.
            </p>
          </CardContent>
        </Card>

        {/* Funcionalidades principales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Funcionalidades Principales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Entidades */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">Gestión de Entidades</h3>
                  <p className="text-gray-600 text-sm">
                    Organiza múltiples emprendimientos, sociedades, actividades freelance e inversiones
                    en un solo lugar. Cada entidad con su propia contabilidad y registros independientes.
                  </p>
                </div>
              </div>

              {/* Cuentas */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">Cuentas Bancarias</h3>
                  <p className="text-gray-600 text-sm">
                    Registra y gestiona todas tus cuentas bancarias. Soporte completo para pesos argentinos
                    (ARS) y dólares estadounidenses (USD). Visualiza saldos actualizados en tiempo real.
                  </p>
                </div>
              </div>

              {/* Asientos */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">Plan de Cuentas Pro</h3>
                  <p className="text-gray-600 text-sm">
                    Estructura contable profesional (X-XX-XXX-XXXX) vinculada a cada entidad.
                    Usa la <strong>IA de Gemini</strong> para generar sugerencias de nombres y códigos
                    correlativos automáticamente según el propósito de la cuenta.
                  </p>
                </div>
              </div>

              {/* Transacciones */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ArrowUpDown className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">Transacciones Inteligentes</h3>
                  <p className="text-gray-600 text-sm">
                    Registra movimientos por <strong>Voz</strong> o texto. Gemini clasifica automáticamente
                    el gasto o ingreso al asiento contable correcto según el contexto de la entidad.
                    Carga por lotes para pagos recurrentes.
                  </p>
                </div>
              </div>

              {/* Reportes */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">Libro Mayor y Reportes</h3>
                  <p className="text-gray-600 text-sm">
                    Genera reportes de <strong>Libro Mayor</strong> con agrupación profesional por Asiento o Cuenta.
                    Visualiza saldos iniciales históricos, movimientos del periodo y balances finales con un solo clic.
                    Exporta todo a CSV para tu contador.
                  </p>
                </div>
              </div>

              {/* Google Calendar */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">Agenda de Pagos</h3>
                  <p className="text-gray-600 text-sm">
                    Sincroniza tus pagos planificados con <strong>Google Calendar</strong>.
                    Si inicias sesión con tu cuenta de Google, tus vencimientos aparecerán
                    automáticamente en tu calendario para que nunca olvides un compromiso financiero.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Características destacadas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              Características Destacadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong>Inteligencia Artificial (Gemini):</strong> Sugerencias inteligentes para crear
                  cuentas, clasificar transacciones y procesar comandos de voz complejos.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong>Jerarquía y Agrupación:</strong> Soporte para Libro Mayor con niveles contables
                  y agrupación inteligente de transacciones para una lectura clara de la estructura de costos.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <BarChart3 className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong>Balance Dinámico:</strong> Cálculo automático de saldos iniciales históricos
                  y señalética visual (verde para superávit, rojo para déficit) en todos los reportes.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong>Multi-moneda:</strong> Gestión fluida en pesos (ARS) y dólares (USD) con
                  seguimiento histórico por cuenta bancaria.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong>Entrada por Voz:</strong> Di lo que gastaste o cobraste y la IA se encarga de
                  extraer monto, moneda, entidad y categoría.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong>Identidad Visual:</strong> Sistema adaptativo (PWA) diseñado para que
                  tu negocio se sienta premium desde cualquier dispositivo.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Beneficios */}
        <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Por qué usar Mi Caja Chica?</h2>
            <div className="space-y-3 text-gray-700">
              <p>
                ✅ <strong>Ahorra tiempo:</strong> Automatiza el registro de pagos recurrentes y genera
                reportes en segundos.
              </p>
              <p>
                ✅ <strong>Toma mejores decisiones:</strong> Visualiza claramente el estado financiero de
                cada emprendimiento.
              </p>
              <p>
                ✅ <strong>Simplifica tu contabilidad:</strong> Organiza tus registros de forma profesional
                y accesible.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sección Legal */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4 border-t border-slate-200">
          <Link href="/dashboard/terminos" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">
            <Scale className="h-4 w-4" />
            Términos y Condiciones
          </Link>
          <div className="hidden sm:block w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
          <Link href="/dashboard/privacidad" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">
            <ShieldCheck className="h-4 w-4" />
            Seguridad y Privacidad
          </Link>
          <div className="hidden sm:block w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
          <Link href="/dashboard/novedades" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">
            <Sparkles className="h-4 w-4" />
            Novedades v{APP_VERSION}
          </Link>
        </div>
      </div>
    </DashboardLayoutServer>
  );
}
