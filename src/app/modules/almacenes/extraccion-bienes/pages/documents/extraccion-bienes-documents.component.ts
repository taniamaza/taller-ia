import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { DocumentsRecordsPageComponent } from '../../../../../shared/components/documents-records-page/documents-records-page.component';
import type { DocumentsRecordsConfig, DocumentsRecordsRow } from '../../../../../shared/types/documents-records.types';
import { EXTRACCION_BIENES_DOCUMENTS_CONFIG } from '../../config/extraccion-bienes-documents.config';
import { REQUEST_ROUTE } from '../../config/extraccion-bienes.rutas';
import { NOMBRE_DOCUMENTO } from '../../models/extraccion.model';
import { ExtraccionStore } from '../../services/extraccion.store';

/**
 * «Documentos y registros» de Extracción de bienes. La pantalla entera la arma `siaf-documents-records-page`: esta
 * página solo pasa como filas las solicitudes del almacén en memoria.
 */
@Component({
  selector: 'siaf-extraccion-bienes-documents',
  standalone: true,
  imports: [DocumentsRecordsPageComponent],
  template: `<siaf-documents-records-page [config]="pageConfig()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtraccionBienesDocumentsComponent {
  private readonly store = inject(ExtraccionStore);

  readonly pageConfig = computed((): DocumentsRecordsConfig => {
    const documentRows: DocumentsRecordsRow[] = this.store.solicitudes().map((s) => ({
      document: NOMBRE_DOCUMENTO,
      documentId: s.id,
      number: s.numero,
      actionType: 'Creación',
      status: s.estado,
      system: 'Abastecimiento',
      date: s.fecha,
      entity: s.entidad,
      linkRoute: `${REQUEST_ROUTE}/${s.id}`,
    }));
    return { ...EXTRACCION_BIENES_DOCUMENTS_CONFIG, documentRows };
  });
}
