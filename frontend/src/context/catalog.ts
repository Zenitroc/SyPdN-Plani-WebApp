import { useMemo } from 'react';
import { useApi } from '../lib/query';

/** Reglas académicas publicadas por la API en GET /catalog (ver AcademicCatalog.php). */
export type Catalog = {
  grades: { scale: string[]; failing: string[] };
  attempts: { code: string; label: string }[];
  partials: { number: number; topics: string[] }[];
  terms: number[];
  assignments: { types: string[]; topics: string[]; custom_topic_max_length: number };
  /** Notas que carga "Cerrar asistencia" a quien faltó o no entregó un tema adeudado. */
  attendance_close: { absent: string; not_delivered: string };
  enrollment_statuses: string[];
  final: { min: number; max: number; sign_from: number; promote_from: number; conditions: Record<string, string> };
  tp_approval_threshold: number;
  report_types: Record<string, string>;
  max_image_bytes: number;
  roles: { code: string; description: string }[];
};

// Solo se usa mientras carga el catálogo o si la API todavía no lo publica.
const FALLBACK: Catalog = {
  grades: { scale: ['A', 'N_E', 'NO_SAT', 'SAT-', 'SAT', 'SAT+', 'DIST-', 'DIST'], failing: ['A', 'N_E', 'NO_SAT', 'N_S'] },
  attempts: [{ code: 'PA', label: 'Parcial' }, { code: '1R', label: '1° Recuperatorio' }, { code: '2R', label: '2° Recuperatorio' }],
  partials: [{ number: 1, topics: ['ORG', 'MET', 'TEO1'] }, { number: 2, topics: ['PLS', 'CUR', 'TEO2'] }],
  terms: [1, 2],
  assignments: { types: ['TP', 'TPC', 'TPR'], topics: ['ORG', 'MET', 'PLS', 'CUR'], custom_topic_max_length: 8 },
  attendance_close: { absent: 'A', not_delivered: 'N_E' },
  enrollment_statuses: ['ALTA', 'BAJA'],
  final: { min: 1, max: 10, sign_from: 6, promote_from: 8, conditions: { DESERTO: 'Ausente', RECURSA: 'Recursa', FIRMA: 'Firma', PROMOCIONA: 'Promociona' } },
  tp_approval_threshold: 60,
  report_types: { bug: 'Bug / Fallo', solicitud: 'Solicitud', idea: 'Idea', otro: 'Otro' },
  max_image_bytes: 200 * 1024,
  roles: [],
};

export type GradeTone = 'empty' | 'fail' | 'pass' | 'top';
export type AttemptGrades = Record<string, string | null>;

export function useCatalog() {
  const { data } = useApi<Catalog>('/catalog', { staleMs: 10 * 60_000 });
  return useMemo(() => {
    // Se completa con los valores por defecto por si la API es anterior a algún campo del catálogo.
    const catalog: Catalog = { ...FALLBACK, ...data, assignments: { ...FALLBACK.assignments, ...data?.assignments } };
    const failing = new Set(catalog.grades.failing);
    const passingScale = catalog.grades.scale.filter(code => !failing.has(code));
    const attemptCodes = catalog.attempts.map(attempt => attempt.code);

    const passes = (code: string | null | undefined): boolean => Boolean(code) && !failing.has(String(code).toUpperCase());

    /** Color de una nota: desaprobada, aprobada o en el tercio superior de la escala. */
    const gradeTone = (code: string | null | undefined): GradeTone => {
      if (!code) return 'empty';
      if (!passes(code)) return 'fail';
      const position = passingScale.indexOf(code);
      return position >= 0 && position >= passingScale.length - Math.ceil(passingScale.length / 3) ? 'top' : 'pass';
    };

    /** Un tema está aprobado si alguna de sus instancias lo está (misma regla que la API). */
    const topicPassed = (grades: AttemptGrades | undefined): boolean => attemptCodes.some(code => passes(grades?.[code]));

    const owedTopics = (topics: string[], grades: Record<string, AttemptGrades> | undefined): string[] =>
      topics.filter(topic => !topicPassed(grades?.[topic]));

    const topicsOf = (partial: number): string[] => catalog.partials.find(item => item.number === partial)?.topics ?? [];

    const finalCondition = (grade: number | null, deserted: boolean): string | null => {
      if (deserted) return 'DESERTO';
      if (grade == null) return null;
      if (grade < catalog.final.sign_from) return 'RECURSA';
      return grade < catalog.final.promote_from ? 'FIRMA' : 'PROMOCIONA';
    };

    const attemptLabel = (code: string): string => catalog.attempts.find(attempt => attempt.code === code)?.label ?? code;

    return { ...catalog, attemptCodes, passes, gradeTone, topicPassed, owedTopics, topicsOf, finalCondition, attemptLabel };
  }, [data]);
}

export const termLabel = (term: number | string): string => `${term}° cuatrimestre`;
export const partialLabel = (partial: number | string): string => `${partial}° parcial`;
