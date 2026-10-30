import { Injectable, signal } from '@angular/core';

import { SOLICITUDES_MUESTRA, SolicitudExtraccion } from '../models/extraccion.model';

/** Datos de lo que se graba: todo menos lo que asigna el almacén (id, número, estado y fecha). */
export type DatosSolicitudExtraccion = Omit<SolicitudExtraccion, 'id' | 'numero' | 'estado' | 'fecha' | 'entidad'>;

const ENTIDAD = '0001 - Ministerio de Economía y Finanzas';

const hoy = (): string => new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Solicitudes de extracción en memoria: reemplazan al backend en la demostración. Viven mientras la página no se
 * recargue, igual que el resto de datos de muestra.
 */
@Injectable({ providedIn: 'root' })
export class ExtraccionStore {
  readonly solicitudes = signal<SolicitudExtraccion[]>([...SOLICITUDES_MUESTRA]);

  obtener(id: string): SolicitudExtraccion | undefined {
    return this.solicitudes().find((s) => s.id === id);
  }

  /** Crea la solicitud en estado Elaborado, o actualiza la que ya existe con ese `id`. */
  grabar(datos: DatosSolicitudExtraccion, id?: string): SolicitudExtraccion {
    const existente = id ? this.obtener(id) : undefined;
    if (existente) {
      const actualizada = { ...existente, ...datos, estado: 'Elaborado' as const };
      this.solicitudes.update((lista) => lista.map((s) => (s.id === existente.id ? actualizada : s)));
      return actualizada;
    }
    const correlativo = this.solicitudes().length + 1;
    const nueva: SolicitudExtraccion = {
      ...datos,
      id: `seb-${String(correlativo).padStart(4, '0')}`,
      numero: `SEB-${String(correlativo).padStart(5, '0')}-2026-MEF-DGA`,
      estado: 'Elaborado',
      fecha: hoy(),
      entidad: ENTIDAD,
    };
    this.solicitudes.update((lista) => [nueva, ...lista]);
    return nueva;
  }

  verificar(id: string): void {
    this.solicitudes.update((lista) => lista.map((s) => (s.id === id ? { ...s, estado: 'Verificado' as const } : s)));
  }

  eliminar(id: string): void {
    this.solicitudes.update((lista) => lista.filter((s) => s.id !== id));
  }
}
