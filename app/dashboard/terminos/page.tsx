
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayoutServer } from '@/components/layout/dashboard-layout-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Scale, FileText, CheckCircle2 } from 'lucide-react';
import { APP_VERSION } from '@/lib/version-config';

export default async function TerminosPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/');
    }

    return (
        <DashboardLayoutServer user={session.user}>
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-2">
                    <Scale className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold text-slate-800">Términos y Condiciones</h1>
                </div>

                <p className="text-slate-500 text-sm italic">
                    Última actualización: Marzo 2026. Vigente para la República Argentina.
                </p>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-slate-400" />
                            Acuerdo de Uso del Servicio
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6 text-slate-700 text-sm leading-relaxed">
                        <section className="space-y-3">
                            <h3 className="font-bold text-slate-900 uppercase tracking-tight">1. Aceptación de los Términos</h3>
                            <p>
                                Al acceder y utilizar <strong>Mi Caja Chica</strong>, usted acepta cumplir y estar sujeto a los siguientes términos y condiciones de uso, los cuales, junto con nuestra política de privacidad, rigen la relación entre usted y la plataforma en el marco de las leyes de la República Argentina, especialmente la Ley N° 24.240 de Defensa del Consumador.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h3 className="font-bold text-slate-900 uppercase tracking-tight">2. Descripción del Servicio</h3>
                            <p>
                                Mi Caja Chica proporciona una herramienta de gestión financiera basada en la nube. Usted reconoce que el servicio incluye el uso de Inteligencia Artificial (IA) para la categorización y procesamiento de datos. Los resultados generados por la IA son a título informativo y deben ser validados por el usuario.
                            </p>
                        </section>

                        <section className="space-y-3 border-l-4 border-amber-200 pl-4 bg-amber-50/30 py-2">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4 text-amber-500" />
                                3. Responsabilidad Financiera
                            </h3>
                            <p>
                                La plataforma no constituye asesoramiento financiero, contable ni legal profesional. El uso de la información para la toma de decisiones económicas es responsabilidad exclusiva del usuario. Mi Caja Chica no garantiza que los reportes satisfagan requerimientos impositivos específicos ante la AFIP sin la supervisión de un profesional matriculado.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h3 className="font-bold text-slate-900 uppercase tracking-tight">4. Propiedad de los Datos</h3>
                            <p>
                                Usted mantiene la propiedad completa de todos los datos financieros cargados en la plataforma. Mi Caja Chica no comercializará su información con terceros. Usted es responsable de mantener la confidencialidad de sus credenciales de acceso.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h3 className="font-bold text-slate-900 uppercase tracking-tight">5. Modificaciones y Suspensión</h3>
                            <p>
                                Nos reservamos el derecho de modificar el servicio o estos términos en cualquier momento. El uso continuado del sistema tras dichos cambios implica la aceptación de los nuevos términos.
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
