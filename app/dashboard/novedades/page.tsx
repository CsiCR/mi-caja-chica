
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayoutServer } from '@/components/layout/dashboard-layout-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle2, Bug, PenTool, Scale, Rocket } from 'lucide-react';
import { CHANGELOG } from '@/lib/version-config';

const typeIcons = {
    feat: <Rocket className="h-4 w-4 text-purple-500" />,
    fix: <Bug className="h-4 w-4 text-red-500" />,
    refactor: <PenTool className="h-4 w-4 text-blue-500" />,
    style: <Sparkles className="h-4 w-4 text-amber-500" />,
    legal: <Scale className="h-4 w-4 text-emerald-500" />
};

const typeLabels = {
    feat: 'Nueva Función',
    fix: 'Corrección',
    refactor: 'Mejora de Lógica',
    style: 'Mejora Visual',
    legal: 'Legal y Privacidad'
};

export default async function NovedadesPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/');
    }

    return (
        <DashboardLayoutServer user={session.user}>
            <div className="space-y-8 max-w-4xl mx-auto">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="h-8 w-8 text-amber-500" />
                        Novedades y Actualizaciones
                    </h1>
                    <p className="text-slate-500">
                        Seguí la evolución de Mi Caja Chica y conocé las últimas mejoras que implementamos para vos.
                    </p>
                </div>

                <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {CHANGELOG.map((entry, index) => (
                        <div key={entry.version} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            {/* Dot */}
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 group-[.is-active]:bg-primary text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                {index === 0 ? <Sparkles className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                            </div>

                            {/* Content */}
                            <Card className="w-[calc(100%-4rem)] md:w-[45%] p-1 rounded-xl shadow-none border-slate-200 bg-white group-[.is-active]:border-primary/20 hover:border-primary/40 transition-all duration-300">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant={index === 0 ? "default" : "secondary"} className="font-mono text-[10px] tracking-widest uppercase">
                                            v{entry.version}
                                        </Badge>
                                        <time className="text-xs font-bold text-slate-400 font-mono italic">
                                            {entry.date}
                                        </time>
                                    </div>
                                    <CardTitle className="text-lg text-slate-800 leading-tight">
                                        {entry.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-slate-500 leading-relaxed italic">
                                        "{entry.description}"
                                    </p>

                                    <div className="space-y-2 pt-2 border-t border-slate-100">
                                        {entry.changes.map((change, i) => (
                                            <div key={i} className="flex gap-3 text-sm">
                                                <div className="mt-0.5 shrink-0 opacity-80">{typeIcons[change.type]}</div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 leading-none mb-1 opacity-70 uppercase tracking-tighter">
                                                        {typeLabels[change.type]}
                                                    </span>
                                                    <span className="text-slate-700 leading-snug">
                                                        {change.text}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>

                <div className="text-center pt-8 border-t border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em]">
                        Mi Caja Chica - Versión ZEN de Alto Rendimiento
                    </p>
                </div>
            </div>
        </DashboardLayoutServer>
    );
}
