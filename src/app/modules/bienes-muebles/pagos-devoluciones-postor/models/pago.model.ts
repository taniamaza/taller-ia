import type { StatusTagTone } from '../../../../shared/ui/status-tag/status-tag.component';

export type TipoOrdenPago = 'garantias' | 'adjudicaciones' | 'devoluciones';
export type EstadoOrdenPago = 'validacion' | 'pendiente' | 'validado' | 'vencido';

/** Constancia de una operación bancaria con la que el postor respalda su pago. */
export interface ConstanciaPago {
  id: string;
  modalidad: string;
  nroOperacion: string;
  monto: number;
  /** Fecha del pago en ISO (`2026-09-12`). */
  fechaPago: string;
  /** Hora del pago (`21:09`). */
  horaPago: string;
  archivoNombre: string;
  archivoTamano: string;
  /** El archivo subido en esta sesión; las constancias de muestra no lo tienen. */
  archivo?: File;
}

export interface OrdenPago {
  orden: string;
  proceso: string;
  tipo: TipoOrdenPago;
  lotes: number;
  monto: number;
  estado: EstadoOrdenPago;
  registro: string;
  limite: string;
  constancias: ConstanciaPago[];
}

/** Cómo se muestra cada estado de la orden: texto, tono y ícono de `siaf-status-tag` (estilo `outline`). */
export const ESTADO_ORDEN: Record<EstadoOrdenPago, { label: string; tone: StatusTagTone; icon: string }> = {
  validacion: { label: 'Pago en validación', tone: 'info', icon: 'fact_check' },
  pendiente: { label: 'Pago pendiente', tone: 'default', icon: 'pending' },
  validado: { label: 'Pago validado', tone: 'success', icon: 'check_circle' },
  vencido: { label: 'Vencido', tone: 'warning', icon: 'warning' },
};

/** Precio base y garantía por lote de muestra: salen de las convocatorias de «Procesos del postor». */
export const PRECIO_BASE_POR_LOTE = 55000;
export const BIENES_POR_LOTE = 10;

export const MODALIDAD_PAGO = 'Banco de la Nación';

let siguienteIdConstancia = 1;
export const nuevoIdConstancia = (): string => `constancia-${siguienteIdConstancia++}`;

/** Las órdenes ya enviadas o validadas traen una constancia de muestra por el total de la orden. */
const constanciasDeMuestra = (estado: EstadoOrdenPago, monto: number, registro: string): ConstanciaPago[] =>
  estado === 'validacion' || estado === 'validado'
    ? [
        {
          id: nuevoIdConstancia(),
          modalidad: MODALIDAD_PAGO,
          nroOperacion: '000239233',
          monto,
          fechaPago: registro.split('/').reverse().join('-'),
          horaPago: '10:30',
          archivoNombre: 'voucher_bn_01.pdf',
          archivoTamano: '500 KB',
        },
      ]
    : [];

const orden = (
  o: string, proceso: string, tipo: TipoOrdenPago, lotes: number, monto: number, estado: EstadoOrdenPago, registro: string, limite: string,
): OrdenPago => ({ orden: o, proceso, tipo, lotes, monto, estado, registro, limite, constancias: constanciasDeMuestra(estado, monto, registro) });

/** Órdenes de muestra, sin backend simulado: son las del prototipo de Figma más unas pocas para las otras pestañas. */
export const ORDENES_MUESTRA: OrdenPago[] = [
  orden('PAY-002-2026', 'SPE-001-2026-MTC', 'garantias', 1, 4000, 'validacion', '09/01/2026', '10/01/2026'),
  orden('PAY-001-2026', 'SPE-001-2026-MTC', 'garantias', 2, 11000, 'pendiente', '09/01/2026', '10/01/2026'),
  orden('PAY-002-2025', 'SPE-001-2025-MEF', 'garantias', 1, 8000, 'validado', '22/10/2025', '24/10/2025'),
  orden('PAY-003-2025', 'SPE-001-2026-RENIEC', 'garantias', 2, 5000, 'validado', '23/08/2025', '24/08/2025'),
  orden('PAY-005-2025', 'SPE-001-2026-RENIEC', 'garantias', 2, 500, 'vencido', '23/08/2025', '24/08/2025'),
  orden('ADJ-001-2026', 'SPE-004-2026-MINSA', 'adjudicaciones', 1, 38500, 'pendiente', '21/02/2026', '28/02/2026'),
  orden('ADJ-002-2025', 'SPE-005-2025-MINEDU', 'adjudicaciones', 2, 96000, 'validado', '12/11/2025', '19/11/2025'),
  orden('DEV-001-2026', 'SPE-006-2025-MINJUS', 'devoluciones', 1, 5500, 'validacion', '02/03/2026', '09/03/2026'),
  orden('DEV-002-2025', 'SPE-002-2025-MEF', 'devoluciones', 1, 8000, 'validado', '30/10/2025', '06/11/2025'),
];

/** Cuenta a la que se devolverá la garantía; de muestra, porque el postor aún no la registra en esta pantalla. */
export const CUENTA_DEVOLUCION_MUESTRA = {
  titular: 'MAURICIO SÁENZ GUADALUPE',
  banco: 'BANCO DE CRÉDITO DEL PERÚ',
  tipoCuenta: 'CUENTA AHORROS',
  numeroCuenta: '193-4567890-0-12',
  cci: '00219300456789001234',
  moneda: 'SOLES (PEN)',
};

/** Monto con espacio como separador de miles, como en el prototipo («11 000.00»). */
export const formatoMonto = (monto: number): string =>
  monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ');
