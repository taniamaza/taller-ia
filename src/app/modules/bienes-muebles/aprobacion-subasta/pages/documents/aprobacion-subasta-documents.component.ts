import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { DocumentsRecordsPageComponent } from '../../../../../shared/components/documents-records-page/documents-records-page.component';
import type { DocumentsRecordsConfig, DocumentsRecordsRow } from '../../../../../shared/types/documents-records.types';
import { APROBACION_SUBASTA_DOCUMENTS_CONFIG } from '../../config/aprobacion-subasta-documents.config';
import { PROCESS_ROUTE } from '../../config/aprobacion-subasta.rutas';
import { NOMBRE_DOCUMENTO } from '../../models/documento-revision.model';
import { RevisionDocumentosStore } from '../../services/revision-documentos.store';

/**
 * «Documentos y registros» de Aprobación de subasta pública electrónica. Todavía sin backend simulado: la pantalla la
 * arma `siaf-documents-records-page` (`modoConsulta: true`) con los documentos de muestra del almacén en memoria, así
 * que el estado de un documento que se aprueba o se observa en el detalle se ve al volver.
 */
@Component({
  selector: 'siaf-aprobacion-subasta-documents',
  standalone: true,
  imports: [DocumentsRecordsPageComponent],
  template: `<siaf-documents-records-page [config]="pageConfig()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AprobacionSubastaDocumentsComponent {
  private readonly store = inject(RevisionDocumentosStore);

  readonly pageConfig = computed((): DocumentsRecordsConfig => {
    const documentRows: DocumentsRecordsRow[] = this.store.documentos().map((d) => ({
      document: NOMBRE_DOCUMENTO[d.tipo],
      number: d.id,
      linkRoute: d.conDetalle ? `${PROCESS_ROUTE}/solicitud/${d.id}` : PROCESS_ROUTE,
      actionType: 'Creación',
      status: d.estado,
      system: 'Abastecimiento',
      date: d.fecha,
      entity: d.entidad,
    }));
    return { ...APROBACION_SUBASTA_DOCUMENTS_CONFIG, documentRows };
  });
}
