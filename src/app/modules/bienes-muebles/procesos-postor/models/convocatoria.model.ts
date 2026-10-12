export type FaseConvocatoria = 'exhibicion' | 'habilitacion' | 'acto-publico' | 'adjudicacion' | 'entrega';

export interface Convocatoria {
  id: string;
  codigo: string;
  fase: FaseConvocatoria;
  lotes: number;
  vigencia: string;
  entidad: string;
  ubicacion: string;
  categorias: string[];
  /** Solo si el postor ya se inscribió en la convocatoria. */
  participacion?: { lotesInscritos: number; pagoPendiente: boolean };
  /** Datos del acto público; se muestran en el detalle. */
  acto?: { inicio: string; fin: string; ubicacionFisica: string };
  guardada: boolean;
}

export interface LoteConvocatoria {
  numero: string;
  descripcion: string;
  categorias: string[];
  actoPublico: string;
  bienes: number;
  incrementoOferta: string;
  precioBase: string;
  garantia: string;
  /** El postor ya eligió participar en este lote. */
  participa: boolean;
}

export const FASE_ETIQUETA: Record<FaseConvocatoria, string> = {
  exhibicion: 'Exhibición',
  habilitacion: 'Habilitación de postores',
  'acto-publico': 'Acto público',
  adjudicacion: 'Adjudicación',
  entrega: 'Entrega',
};

/** Convocatorias de muestra: sin backend simulado, solo para armar la pantalla según el prototipo de Figma. */
export const CONVOCATORIAS_MUESTRA: Convocatoria[] = [
  {
    id: 'spe-001-2025-mtc',
    codigo: 'SPE-001-2025-MTC',
    fase: 'habilitacion',
    lotes: 5,
    vigencia: '06/02 - 16:00 GMT-5 al 09/02 - 16:00 GMT-5',
    entidad: 'Ministerio de Transportes y Comunicaciones',
    ubicacion: 'Perú, Lima, Cercado de Lima',
    categorias: ['Vehículo', 'Electrónicos', 'Equipos de cómputo'],
    participacion: { lotesInscritos: 2, pagoPendiente: true },
    acto: { inicio: '06/02/2026 08:00:00 GMT-5', fin: '09/02/2026 18:00:00 GMT-5', ubicacionFisica: 'LIMA, CERCADO DE LIMA' },
    guardada: true,
  },
  {
    id: 'spe-002-2026-mef',
    codigo: 'SPE-002-2026-MEF',
    fase: 'habilitacion',
    lotes: 2,
    vigencia: '06/02 - 16:00 GMT-5 al 09/02 - 16:00 GMT-5',
    entidad: 'Ministerio de Economía y Finanzas',
    ubicacion: 'Lima, Cercado de Lima',
    categorias: ['Equipos de cómputo', 'Electrónicos', 'Vehículo'],
    guardada: false,
  },
  {
    id: 'spe-002-2026-minam',
    codigo: 'SPE-002-2026-MINAM',
    fase: 'habilitacion',
    lotes: 2,
    vigencia: '06/02 - 16:00 GMT-5 al 09/02 - 16:00 GMT-5',
    entidad: 'Ministerio del Ambiente',
    ubicacion: 'Lima, Cercado de Lima',
    categorias: ['Equipos de cómputo', 'Electrónicos', 'Vehículo'],
    guardada: false,
  },
  {
    id: 'spe-003-2026-midagri',
    codigo: 'SPE-003-2026-MIDAGRI',
    fase: 'exhibicion',
    lotes: 3,
    vigencia: '15/02 - 08:00 GMT-5 al 18/02 - 17:00 GMT-5',
    entidad: 'Ministerio de Desarrollo Agrario y Riego',
    ubicacion: 'Lima, Jesús María',
    categorias: ['Maquinaria', 'Vehículo'],
    guardada: false,
  },
  {
    id: 'spe-004-2026-minsa',
    codigo: 'SPE-004-2026-MINSA',
    fase: 'acto-publico',
    lotes: 4,
    vigencia: '20/02 - 10:00 GMT-5 al 20/02 - 14:00 GMT-5',
    entidad: 'Ministerio de Salud',
    ubicacion: 'Lima, Lima, Cercado de Lima',
    categorias: ['Equipos de cómputo', 'Mobiliario'],
    participacion: { lotesInscritos: 1, pagoPendiente: false },
    acto: { inicio: '20/02/2026 10:00:00 GMT-5', fin: '20/02/2026 14:00:00 GMT-5', ubicacionFisica: 'LIMA, CERCADO DE LIMA' },
    guardada: true,
  },
  {
    id: 'spe-005-2025-minedu',
    codigo: 'SPE-005-2025-MINEDU',
    fase: 'adjudicacion',
    lotes: 6,
    vigencia: '22/02 - 09:00 GMT-5 al 24/02 - 17:00 GMT-5',
    entidad: 'Ministerio de Educación',
    ubicacion: 'Lima, San Borja',
    categorias: ['Mobiliario', 'Electrónicos'],
    guardada: false,
  },
  {
    id: 'spe-006-2025-minjus',
    codigo: 'SPE-006-2025-MINJUS',
    fase: 'entrega',
    lotes: 1,
    vigencia: '27/02 - 08:00 GMT-5 al 28/02 - 17:00 GMT-5',
    entidad: 'Ministerio de Justicia y Derechos Humanos',
    ubicacion: 'Lima, Cercado de Lima',
    categorias: ['Vehículo'],
    participacion: { lotesInscritos: 1, pagoPendiente: false },
    acto: { inicio: '27/02/2026 08:00:00 GMT-5', fin: '28/02/2026 17:00:00 GMT-5', ubicacionFisica: 'LIMA, CERCADO DE LIMA' },
    guardada: false,
  },
];

/**
 * Lotes de muestra de una convocatoria: se generan a partir de su cantidad de lotes para que todo «Ver detalle» tenga
 * qué mostrar. El último lote lleva 15 bienes para que la suma de la primera convocatoria cuadre con los 55 del diseño.
 */
export function lotesDe(c: Convocatoria): LoteConvocatoria[] {
  return Array.from({ length: c.lotes }, (_, i) => ({
    numero: String(i + 1).padStart(3, '0'),
    descripcion: 'Vehículos dados de baja por renovación tecnológica en la sede central.',
    categorias: c.categorias.slice(0, 2),
    actoPublico: i % 2 === 0 ? '06/02/2026     08:00:00 GMT-5' : '07/02/2026     08:00:59 GMT-5',
    bienes: i === c.lotes - 1 && c.lotes === 5 ? 15 : 10,
    incrementoOferta: '1,500.00 PEN',
    precioBase: 'S/ 55,000.00',
    garantia: 'S/. 5,500.00',
    participa: i < (c.participacion?.lotesInscritos ?? 0),
  }));
}
