import { Injectable, signal } from '@angular/core';

import { DOCUMENTOS_REVISION_MUESTRA, DocumentoRevision } from '../models/documento-revision.model';

/**
 * Documentos de «Aprobación de subasta» en memoria: sin backend simulado, vive mientras la página no se recarga. Existe
 * para que la validación de constancias, la aprobación y la observación del detalle se vean al volver a la lista.
 */
@Injectable({ providedIn: 'root' })
export class RevisionDocumentosStore {
  readonly documentos = signal<DocumentoRevision[]>(DOCUMENTOS_REVISION_MUESTRA);

  obtener(id: string): DocumentoRevision | undefined {
    return this.documentos().find((d) => d.id === id);
  }

  validarConstancia(documentoId: string, constanciaId: string, conforme: boolean, resultado: string): void {
    this.actualizar(documentoId, (d) => ({
      ...d,
      constancias: d.constancias.map((c) =>
        c.id === constanciaId ? { ...c, estado: conforme ? ('conforme' as const) : ('no-conforme' as const), resultado } : c,
      ),
    }));
  }

  aprobar(documentoId: string, usuario: string, fecha: string): void {
    this.actualizar(documentoId, (d) => ({
      ...d,
      estado: 'Aprobado',
      orden: { ...d.orden, estado: 'validado' },
      aprobadoPor: { usuario, fecha },
    }));
  }

  observar(documentoId: string, motivo: string): void {
    this.actualizar(documentoId, (d) => ({ ...d, estado: 'Observado', observacion: motivo }));
  }

  private actualizar(id: string, cambio: (d: DocumentoRevision) => DocumentoRevision): void {
    this.documentos.update((lista) => lista.map((d) => (d.id === id ? cambio(d) : d)));
  }
}
