import { Injectable, signal } from '@angular/core';

import { ConstanciaPago, ORDENES_MUESTRA, OrdenPago } from '../models/pago.model';

/**
 * Órdenes de pago del postor en memoria: sin backend simulado, vive mientras la página no se recarga. Existe para que
 * «Registrar pago» deje la orden «En validación» y la lista lo muestre al volver.
 */
@Injectable({ providedIn: 'root' })
export class PagosPostorStore {
  readonly ordenes = signal<OrdenPago[]>(ORDENES_MUESTRA);

  obtener(orden: string): OrdenPago | undefined {
    return this.ordenes().find((o) => o.orden === orden);
  }

  registrarPago(orden: string, constancias: ConstanciaPago[]): void {
    this.ordenes.update((lista) =>
      lista.map((o) => (o.orden === orden ? { ...o, estado: 'validacion' as const, constancias } : o)),
    );
  }
}
