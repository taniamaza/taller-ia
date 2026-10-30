import { Routes } from '@angular/router';

/** Gestión de Almacenes: Extracción de bienes (Documentos y registros y la solicitud), con datos de muestra. */
export const ALMACENES_ROUTES: Routes = [
  {
    path: 'procesos/extraccion-bienes',
    loadComponent: () =>
      import('./extraccion-bienes/pages/documents/extraccion-bienes-documents.component').then(
        (m) => m.ExtraccionBienesDocumentsComponent,
      ),
  },
  {
    path: 'procesos/extraccion-bienes/solicitud',
    loadComponent: () =>
      import('./extraccion-bienes/pages/solicitud/solicitud-extraccion.component').then(
        (m) => m.SolicitudExtraccionComponent,
      ),
  },
  {
    path: 'procesos/extraccion-bienes/solicitud/:id',
    loadComponent: () =>
      import('./extraccion-bienes/pages/solicitud/solicitud-extraccion.component').then(
        (m) => m.SolicitudExtraccionComponent,
      ),
  },
];
