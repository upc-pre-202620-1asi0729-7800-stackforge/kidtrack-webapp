import { PlanTier } from '../../../domain/model/plan.entity';

export interface PlanFeature { text: string; ok: boolean; }
export interface PlanMeta {
    name: string;
    desc: string;
    icon: string;
    color: string;
    badge: string | null;
    monthly: number;
    features: PlanFeature[];
}

const BASE_FEATURES = [
    'Registro de alumnos', 'Marcación de abordaje digital', 'Inicio y cierre de trayecto',
    'Reporte de incidencias', 'Bitácora de viajes', 'Notificaciones de abordaje',
];

/** Plan metadata (from the README user stories & hypotheses). */
export const PLAN_META: Record<PlanTier, PlanMeta> = {
    BASIC: {
        name: 'Básico',
        desc: 'Ideal para grupos pequeños de padres organizados',
        icon: 'pi pi-shield',
        color: '#64748b',
        badge: null,
        monthly: 9.99,
        features: [
            { text: 'Hasta 2 rutas activas', ok: true },
            { text: 'Hasta 2 conductores', ok: true },
            ...BASE_FEATURES.map(text => ({ text, ok: true })),
            { text: 'Alertas de proximidad', ok: false },
            { text: 'Cámara en vivo del bus', ok: false },
            { text: 'Historial de asistencia mensual', ok: false },
            { text: 'GPS en tiempo real', ok: false },
            { text: 'Analítica de flota (PDF)', ok: false },
            { text: 'Botón de pánico SOS', ok: false },
        ],
    },
    INTERMEDIATE: {
        name: 'Intermedio',
        desc: 'Para flotas medianas que buscan mayor visibilidad',
        icon: 'pi pi-star-fill',
        color: '#E07A2B',
        badge: 'Más Popular',
        monthly: 24.99,
        features: [
            { text: 'Hasta 6 rutas activas', ok: true },
            { text: 'Hasta 6 conductores', ok: true },
            ...BASE_FEATURES.map(text => ({ text, ok: true })),
            { text: 'Alertas de proximidad (US19)', ok: true },
            { text: 'Cámara en vivo del bus (US21)', ok: true },
            { text: 'Historial de asistencia (US22)', ok: true },
            { text: 'GPS en tiempo real', ok: false },
            { text: 'Analítica de flota (PDF)', ok: false },
            { text: 'Botón de pánico SOS', ok: false },
        ],
    },
    COMPLETE: {
        name: 'Completo',
        desc: 'Solución total para empresas de transporte escolar',
        icon: 'pi pi-verified',
        color: '#1E3A63',
        badge: 'Todo incluido',
        monthly: 49.99,
        features: [
            { text: 'Hasta 20 rutas activas', ok: true },
            { text: 'Hasta 20 conductores', ok: true },
            ...BASE_FEATURES.map(text => ({ text, ok: true })),
            { text: 'Alertas de proximidad (US19)', ok: true },
            { text: 'Cámara en vivo del bus (US21)', ok: true },
            { text: 'Historial de asistencia (US22)', ok: true },
            { text: 'GPS en tiempo real (US18/US45)', ok: true },
            { text: 'Analítica de flota PDF (US7)', ok: true },
            { text: 'Botón de pánico SOS (US13)', ok: true },
        ],
    },
};
