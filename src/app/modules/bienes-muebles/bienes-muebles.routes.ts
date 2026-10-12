import { Routes } from '@angular/router';

/** Gestión de Bienes Muebles: Aprobación de subasta pública electrónica, Procesos del postor y Pagos y Devoluciones del postor, con datos de muestra. */
export const BIENES_MUEBLES_ROUTES: Routes = [
  {
    path: 'procesos/aprobacion-subasta',
    loadComponent: () =>
      import('./aprobacion-subasta/pages/documents/aprobacion-subasta-documents.component').then(
        (m) => m.AprobacionSubastaDocumentsComponent,
      ),
  },
  {
    path: 'procesos/procesos-postor',
    loadComponent: () =>
      import('./procesos-postor/pages/convocatorias/procesos-postor-convocatorias.component').then(
        (m) => m.ProcesosPostorConvocatoriasComponent,
      ),
  },
  {
    path: 'procesos/pagos-devoluciones-postor',
    loadComponent: () =>
      import('./pagos-devoluciones-postor/pages/ordenes/pagos-devoluciones-ordenes.component').then(
        (m) => m.PagosDevolucionesOrdenesComponent,
      ),
  },
  {
    path: 'procesos/pagos-devoluciones-postor/:orden/registrar',
    loadComponent: () =>
      import('./pagos-devoluciones-postor/pages/registro/registro-pago-garantia.component').then(
        (m) => m.RegistroPagoGarantiaComponent,
      ),
  },
  {
    path: 'procesos/procesos-postor/:id',
    loadComponent: () =>
      import('./procesos-postor/pages/detalle/procesos-postor-detalle.component').then(
        (m) => m.ProcesosPostorDetalleComponent,
      ),
  },
  {
    path: 'procesos/aprobacion-subasta/solicitud/:id',
    loadComponent: () =>
      import('./aprobacion-subasta/pages/solicitud/aprobacion-subasta-detalle.component').then(
        (m) => m.AprobacionSubastaDetalleComponent,
      ),
  },
];
