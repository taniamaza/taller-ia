/** Rutas e ids de «Pagos y Devoluciones del postor». El id existe en `DEFAULT_PROCESS_TREE` (shared/utils/process-tree.util.ts). */
export const PROCESS_ROUTE = '/procesos/pagos-devoluciones-postor';

/** Hoja «Pagos y Devoluciones del postor» del árbol de procesos: arma las migas de pan. */
export const PROCESS_ID = 'pagos-devoluciones-postor';

/** Ruta del formulario «Registro de pago de garantía» de una orden de pago. */
export const registroPagoRoute = (orden: string): string => `${PROCESS_ROUTE}/${orden}/registrar`;
