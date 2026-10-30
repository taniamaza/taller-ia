import type { CreateDocumentProcessOption } from '../../../../shared/components/create-document/create-document.component';
import { NOMBRE_DOCUMENTO } from '../models/extraccion.model';

/** Rutas e ids del proceso «Extracción de bienes». El id existe en `DEFAULT_PROCESS_TREE` (shared/utils/process-tree.util.ts). */
export const PROCESS_ROUTE = '/procesos/extraccion-bienes';
export const REQUEST_ROUTE = `${PROCESS_ROUTE}/solicitud`;

/** Hoja «Extracción de bienes» del árbol de procesos: arma las migas de pan. */
export const PROCESS_ID = 'extraccion-bienes';

/** Opción del panel «Crear documento» (shell y botón «Crear documento» de la pantalla de documentos). */
export const CREATE_DOCUMENT_OPTIONS: CreateDocumentProcessOption[] = [
  {
    id: PROCESS_ID,
    label: 'Extracción de bienes',
    route: REQUEST_ROUTE,
    documents: [NOMBRE_DOCUMENTO],
    documentOptions: [{ label: NOMBRE_DOCUMENTO, route: REQUEST_ROUTE, actionTypes: ['Creación'] }],
    actionTypes: ['Creación'],
  },
];
