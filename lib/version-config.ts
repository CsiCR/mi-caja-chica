
export interface VersionEntry {
    version: string;
    date: string;
    title: string;
    description: string;
    changes: {
        type: 'feat' | 'fix' | 'refactor' | 'style' | 'legal';
        text: string;
    }[];
}

export const APP_VERSION = '1.2.5-ZEN';

export const CHANGELOG: VersionEntry[] = [
    {
        version: '1.2.5-ZEN',
        date: '2026-03-03',
        title: 'Actualización Legal y Optimización Visual',
        description: 'Consolidación de la plataforma con marcos legales argentinos y mejoras críticas en la interfaz de reportes.',
        changes: [
            { type: 'legal', text: 'Implementación de Términos y Condiciones bajo Ley 24.240.' },
            { type: 'legal', text: 'Política de Privacidad y Seguridad conforme a Ley 25.326 (Protección de Datos).' },
            { type: 'refactor', text: 'Reorganización de filtros en Reportes para evitar desbordamiento en pantallas pequeñas.' },
            { type: 'style', text: 'Señalética visual de saldos (Verde/Rojo) en Libro Mayor para lectura rápida.' },
            { type: 'feat', text: 'Nuevo sistema centralizado de control de versiones y novedades.' }
        ]
    },
    {
        version: '1.2.0-ZEN',
        date: '2026-03-02',
        title: 'Rediseño del Libro Mayor',
        description: 'Lanzamiento de la nueva estructura contable profesional para reportes.',
        changes: [
            { type: 'feat', text: 'Agrupación dinámica por Asiento o Cuenta en Reportes.' },
            { type: 'feat', text: 'Cálculo de Saldo Inicial histórico para balances precisos.' },
            { type: 'feat', text: 'Edición rápida de transacciones directamente desde la tabla de reportes.' },
            { type: 'fix', text: 'Corrección en la visualización de montos negativos en el resumen financiero.' }
        ]
    },
    {
        version: '1.1.0-ZEN',
        date: '2026-02-28',
        title: 'IA y Automatización',
        description: 'Integración profunda con Gemini para agilizar la carga de datos.',
        changes: [
            { type: 'feat', text: 'Sugerencias inteligentes de Asientos Contables mediante IA.' },
            { type: 'feat', text: 'Clasificación automática de transacciones por contexto de entidad.' },
            { type: 'feat', text: 'Carga masiva de transacciones para pagos recurrentes.' }
        ]
    }
];
