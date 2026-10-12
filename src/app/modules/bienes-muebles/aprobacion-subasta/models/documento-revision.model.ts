export type TipoDocumentoRevision = 'garantia' | 'saldo' | 'cuentas-ingreso';
export type EstadoDocumentoRevision = 'Elaborado' | 'Verificado' | 'Aprobado' | 'Observado' | 'Procesado';
export type EstadoConstanciaRevision = 'pendiente' | 'conforme' | 'no-conforme';

export interface ConstanciaRevision {
  id: string;
  modalidad: string;
  nroOperacion: string;
  monto: number;
  fechaPago: string;
  horaPago: string;
  fechaRegistro: string;
  estado: EstadoConstanciaRevision;
  /** Comentario del revisor si fue conforme; tipo de error si no lo fue. */
  resultado?: string;
}

/** Documento que el revisor ve en «Documentos existentes» de Aprobación de subasta. */
export interface DocumentoRevision {
  /** Es el número del documento y el id de la ruta del detalle. */
  id: string;
  tipo: TipoDocumentoRevision;
  /** Número corto que se muestra en la cabecera del detalle (`001-2026`). */
  numeroVisible: string;
  estado: EstadoDocumentoRevision;
  /** Fecha de registro de la lista (`15/01/2026`). */
  fecha: string;
  entidad: string;
  /** Solo los documentos con detalle (garantía y saldo, ya verificados o aprobados) abren su pantalla. */
  conDetalle: boolean;
  proceso: { codigo: string; etapa: string; descripcion: string; lotes: number };
  orden: { nro: string; estado: 'validacion' | 'validado'; cuentaIngreso: string };
  /** Garantía requerida (garantía) o saldo a pagar (saldo). */
  montoRequerido: number;
  /** Solo en el pago de saldo. */
  adjudicacion?: { montoAdjudicacion: number; garantiaPagada: number; garantiaAplicada: number };
  constancias: ConstanciaRevision[];
  aprobadoPor?: { usuario: string; fecha: string };
  observacion?: string;
}

export const NOMBRE_DOCUMENTO: Record<TipoDocumentoRevision, string> = {
  garantia: 'Registro de pago de garantía',
  saldo: 'Registro de Pago de Saldo',
  'cuentas-ingreso': 'Registro de Cuentas de Ingreso SPE',
};

export const TIPOS_ERROR_VALIDACION = [
  'No se identificó el pago',
  'El monto no coincide con la orden de pago',
  'La constancia es ilegible',
  'La fecha de pago está fuera de plazo',
];

export const ENTIDAD_MTC = '010 - Ministerio de Transportes y Comunicaciones';
export const ENTIDAD_MEF = '009 - Ministerio de Economía y Finanzas';

const constancia = (id: string, monto: number, estado: EstadoConstanciaRevision): ConstanciaRevision => ({
  id,
  modalidad: 'BANCO DE LA NACIÓN',
  nroOperacion: '2323232',
  monto,
  fechaPago: '05/01/2025',
  horaPago: '09:00',
  fechaRegistro: '05/01/2025',
  estado,
});

const base = {
  conDetalle: false,
  proceso: { codigo: 'SPE-001-2026-MTC', etapa: 'CONVOCATORIA Y HABILITACIÓN DE POSTORES', descripcion: 'ADJUDICACIÓN PROCESO SPE', lotes: 2 },
  orden: { nro: 'PAY-05-2025', estado: 'validacion' as const, cuentaIngreso: '34534-213213213' },
  montoRequerido: 11000,
  constancias: [] as ConstanciaRevision[],
};

const saldo = { montoAdjudicacion: 31500, garantiaPagada: 11000, garantiaAplicada: 5500 };

/** Documentos de muestra, sin backend simulado: los de los prototipos de revisión de Figma. */
export const DOCUMENTOS_REVISION_MUESTRA: DocumentoRevision[] = [
  {
    ...base,
    id: 'PSP-SAS-00001-2026-MEF-OGA',
    tipo: 'garantia',
    numeroVisible: '001-2026',
    estado: 'Aprobado',
    fecha: '09/01/2026',
    entidad: ENTIDAD_MTC,
    conDetalle: true,
    orden: { ...base.orden, estado: 'validado' },
    constancias: [constancia('c-g1', 11000, 'conforme')],
    aprobadoPor: { usuario: 'RICARDO JOHN DOE BUSTAMANTE', fecha: '19/08/2025 08:00:59' },
  },
  {
    ...base,
    id: 'PSP-SAS-00002-2026-MEF-OGA',
    tipo: 'garantia',
    numeroVisible: '001-2026',
    estado: 'Verificado',
    fecha: '18/01/2026',
    entidad: ENTIDAD_MTC,
    conDetalle: true,
    constancias: [constancia('c-g2', 11000, 'pendiente')],
  },
  { ...base, id: 'PSP-SAS-00003-2026-MEF-OGA', tipo: 'garantia', numeroVisible: '002-2025', estado: 'Elaborado', fecha: '06/08/2025', entidad: ENTIDAD_MEF },
  {
    ...base,
    id: 'PSP-RPS-00001-2026-MEF-OGA',
    tipo: 'saldo',
    numeroVisible: '001-2026',
    estado: 'Verificado',
    fecha: '09/01/2026',
    entidad: ENTIDAD_MTC,
    conDetalle: true,
    montoRequerido: 26000,
    adjudicacion: saldo,
    constancias: [constancia('c-s1', 26000, 'pendiente')],
  },
  {
    ...base,
    id: 'PSP-RPS-00002-2025-MEF-OGA',
    tipo: 'saldo',
    numeroVisible: '002-2025',
    estado: 'Elaborado',
    fecha: '06/08/2025',
    entidad: ENTIDAD_MEF,
    montoRequerido: 26000,
    adjudicacion: saldo,
  },
  { ...base, id: 'PSP-CIS-00001-2025-MEF-OGA', tipo: 'cuentas-ingreso', numeroVisible: '001-2025', estado: 'Procesado', fecha: '15/02/2025', entidad: ENTIDAD_MEF },
  { ...base, id: 'PSP-CIS-00002-2024-MEF-OGA', tipo: 'cuentas-ingreso', numeroVisible: '002-2024', estado: 'Procesado', fecha: '15/06/2024', entidad: ENTIDAD_MEF },
  { ...base, id: 'PSP-CIS-00003-2024-MEF-OGA', tipo: 'cuentas-ingreso', numeroVisible: '001-2024', estado: 'Procesado', fecha: '20/01/2024', entidad: ENTIDAD_MEF },
  { ...base, id: 'PSP-CIS-00004-2023-MEF-OGA', tipo: 'cuentas-ingreso', numeroVisible: '002-2023', estado: 'Procesado', fecha: '15/12/2023', entidad: ENTIDAD_MEF },
];
