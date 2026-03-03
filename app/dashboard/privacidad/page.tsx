
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayoutServer } from '@/components/layout/dashboard-layout-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Lock, EyeOff, UserCheck, MessageSquare, CheckCircle2 } from 'lucide-react';
import { APP_VERSION } from '@/lib/version-config';

export default async function PrivacidadPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/');
    }

    return (
        <DashboardLayoutServer user={session.user}>
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck className="h-8 w-8 text-green-600" />
                    <h1 className="text-3xl font-bold text-slate-800">Seguridad y Privacidad</h1>
                </div>

                <p className="text-slate-500 text-sm italic">
                    Política de Privacidad conforme a la Ley N° 25.326 de Protección de Datos Personales (Argentina).
                </p>

                <Card className="border-green-100 shadow-md">
                    <CardHeader className="bg-green-50/50 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Lock className="h-5 w-5 text-green-600" />
                            Protección de tus Datos Financieros
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8 text-slate-700 text-sm leading-relaxed">

                        <section className="space-y-3">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-primary" />
                                1. Tratamiento de Datos (Ley 25.326)
                            </h3>
                            <p>
                                En cumplimiento de la legislación argentina, <strong>Mi Caja Chica</strong> le informa que sus datos personales y financieros serán incorporados a una base de datos automatizada, cuyo responsable es la plataforma. El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos de forma gratuita a intervalos no inferiores a seis meses.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <EyeOff className="h-4 w-4 text-primary" />
                                2. Confidencialidad y Uso de IA
                            </h3>
                            <p>
                                Los datos de sus transacciones son procesados para brindarle servicios de categorización y reportes. Cuando utiliza funciones de Inteligencia Artificial (Gemini), sus datos son enviados de forma encriptada para su procesamiento temporal. <strong>No vendemos ni compartimos sus datos con terceros</strong> con fines publicitarios o de telemarketing.
                            </p>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h4 className="font-bold text-xs uppercase mb-2 text-slate-500">Sus Derechos (ARCO)</h4>
                                <ul className="space-y-2 text-[12px]">
                                    <li className="flex gap-2">✅ <strong>Acceso:</strong> Consultar su información personal.</li>
                                    <li className="flex gap-2">✅ <strong>Rectificación:</strong> Corregir datos inexactos.</li>
                                    <li className="flex gap-2">✅ <strong>Actualización:</strong> Mantener su estado al día.</li>
                                    <li className="flex gap-2">✅ <strong>Supresión:</strong> Solicitar el borrado de sus datos.</li>
                                </ul>
                            </div>
                            <div className="bg-blue-50/30 p-4 rounded-lg border border-blue-100">
                                <h4 className="font-bold text-xs uppercase mb-2 text-blue-600 flex items-center gap-2">
                                    <Lock className="h-3 w-3" />
                                    Seguridad Técnica
                                </h4>
                                <p className="text-[12px]">
                                    Implementamos encriptación SSL/TLS de 256 bits para todas las transferencias de datos. Nuestras bases de datos cuentan con respaldos diarios y acceso restringido mediante autenticación robusta.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3 pt-4 border-t">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-primary" />
                                3. Contacto y Consultas
                            </h3>
                            <p>
                                La <strong>Agencia de Acceso a la Información Pública</strong> es el órgano de control de la Ley N° 25.326. Si tiene dudas sobre el tratamiento de su información, puede contactarnos a través del panel de soporte o dirigir sus consultas a la autoridad de aplicación correspondiente de la República Argentina.
                            </p>
                        </section>
                        <div className="pt-6 border-t flex items-center gap-2 text-primary font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Mi Caja Chica - Versión Profesional v{APP_VERSION}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayoutServer>
    );
}
