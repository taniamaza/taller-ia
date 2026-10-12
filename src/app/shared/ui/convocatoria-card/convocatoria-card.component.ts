import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';
import { StatusTagComponent, StatusTagTone } from '../status-tag/status-tag.component';

/** Dato corto de la convocatoria con su ícono: vigencia, entidad o ubicación. */
export interface ConvocatoriaCardInfo {
  icon: string;
  text: string;
}

/** Participación del postor: texto con la parte destacada en negrita y, opcional, la etiqueta del pago. */
export interface ConvocatoriaCardParticipacion {
  /** Texto que va antes de lo destacado (p. ej. «Participación registrada en»). */
  texto: string;
  /** Parte en negrita (p. ej. «2 de 5 lotes»). */
  destacado: string;
  /** Etiqueta de estado a la derecha (p. ej. «Pago pendiente»). */
  estado?: string;
}

/**
 * Tarjeta de una convocatoria en una lista de procesos (Figma «card-propuesta»): a la izquierda la cantidad de
 * lotes, al centro el código con la fase, los datos de vigencia, entidad y ubicación, la participación del postor y
 * las categorías, y a la derecha la acción principal. Es un organismo armado con `siaf-status-tag`, `siaf-button` y
 * `siaf-icon`: no hace nada por sí sola, el padre decide qué pasa con `actionClicked` y `savedChange`.
 *
 * Reparte el contenido en tres zonas con divisores finos; en móvil las zonas se apilan y la acción ocupa todo el ancho.
 *
 * @usar
 * - En listas de procesos o convocatorias que el usuario revisa de a una y de las que puede participar o abrir el
 *   detalle: «Procesos del postor» de la subasta pública electrónica.
 * - Con `participacion` solo cuando el usuario ya se inscribió: pinta la franja celeste con el avance y el pago.
 * - Con `[saved]` y `(savedChange)` para marcar la convocatoria como guardada; sin ellos, `[showSave]="false"`.
 * @evitar
 * - Para un único ítem elegido desde un panel lateral: usar `siaf-summary-card`.
 * - Para filas con muchas columnas comparables: usar la grilla estándar (`siaf-documents-records-table`).
 * - Para el estado de un documento del flujo: usar `siaf-flow-status-tag`; la fase de la convocatoria va como
 *   etiqueta de este componente.
 * @teclado
 * - **Tab**: pasa por el botón de guardar y por la acción principal.
 * - **Enter / Espacio**: activan cada botón y emiten `savedChange` o `actionClicked`.
 * @accesibilidad
 * - **4.1.2 Nombre, función y valor (A)**: el botón de guardar tiene nombre («Guardar convocatoria» / «Quitar de
 *   guardadas») con el código, y la acción principal se nombra con su texto visible.
 * - **1.3.1 Información y relaciones (A)**: el código es un `h3`; los datos de vigencia, entidad y ubicación van como
 *   lista, y los íconos son decorativos (`aria-hidden`).
 * - **1.4.1 Uso del color (A)**: la fase y el pago van escritos; el color solo los refuerza.
 * - **1.4.3 Contraste mínimo (AA)**: texto `text-neutral-medium` sobre blanco y etiquetas con los tonos de
 *   `siaf-status-tag`.
 * - **2.5.8 Tamaño del objetivo (AA)**: la acción mide 40 px de alto y guardar, 32 × 32 px.
 */
@Component({
  selector: 'siaf-convocatoria-card',
  standalone: true,
  imports: [ButtonComponent, IconComponent, StatusTagComponent],
  template: `
    <article class="flex flex-col overflow-hidden rounded-siaf-md border border-[var(--sys-color-divider-default)] bg-surface md:flex-row md:items-stretch">
      <div class="flex shrink-0 flex-row items-center justify-center gap-siaf-xs border-b border-[var(--sys-color-divider-default)] p-siaf-md md:w-[150px] md:flex-col md:gap-siaf-xxs md:border-b-0 md:border-r">
        <span class="text-xs text-[var(--sys-color-text-neutral-high)]">{{ lotesLabel }}</span>
        <span class="text-[22px] font-bold leading-normal tracking-[-0.19px] text-[var(--sys-color-text-neutral-medium)]">{{ lotes }}</span>
      </div>

      <div class="flex min-w-0 flex-1 flex-col md:border-r md:border-[var(--sys-color-divider-default)]">
        <div class="flex items-center gap-siaf-xs px-siaf-md pb-siaf-xxs pt-siaf-md">
          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-siaf-md gap-y-siaf-xs">
            <h3 class="m-0 text-lg font-bold uppercase leading-normal tracking-[-0.11px] text-[var(--sys-color-text-neutral-high)]">{{ code }}</h3>
            @if (phase) {
              <siaf-status-tag appearance="solid" size="small" [tone]="phaseTone">{{ phase }}</siaf-status-tag>
            }
          </div>
          @if (showSave) {
            <siaf-button
              variant="text"
              size="sm"
              [icon]="saved ? 'bookmark_added' : 'bookmark_add'"
              [iconOnly]="true"
              [ariaLabel]="(saved ? 'Quitar de guardadas ' : 'Guardar convocatoria ') + code"
              (click)="savedChange.emit(!saved)"
            />
          }
        </div>

        @if (info.length > 0) {
          <ul class="m-0 flex list-none flex-wrap items-center gap-x-siaf-xl gap-y-siaf-xs px-siaf-md py-siaf-sm">
            @for (dato of info; track $index) {
              <li class="flex items-center gap-siaf-xxs text-xs text-[var(--sys-color-text-neutral-medium)]">
                <siaf-icon class="shrink-0" [name]="dato.icon" [size]="12" />
                <span>{{ dato.text }}</span>
              </li>
            }
          </ul>
        }

        @if (participation) {
          <div class="px-siaf-md">
            <div class="flex flex-wrap items-center gap-siaf-xs rounded-siaf-sm bg-[var(--color-palette-turquesa-50)] p-siaf-xs">
              <siaf-icon class="shrink-0 text-[var(--sys-color-text-neutral-medium)]" name="assignment_ind" [size]="12" />
              <span class="min-w-0 flex-1 truncate text-xs text-[var(--sys-color-text-neutral-medium)]">
                {{ participation.texto }} <strong>{{ participation.destacado }}</strong>
              </span>
              @if (participation.estado) {
                <siaf-status-tag appearance="outline" size="small" icon="pending">{{ participation.estado }}</siaf-status-tag>
              }
            </div>
          </div>
        }

        @if (categories.length > 0) {
          <ul class="m-0 flex list-none flex-wrap gap-siaf-xs px-siaf-md pb-siaf-md pt-siaf-xs">
            @for (categoria of categories; track $index) {
              <li class="rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-high)] px-siaf-xs py-siaf-xxs text-[11px] font-bold uppercase tracking-[0.66px] text-[var(--sys-color-text-brand-secondary)]">{{ categoria }}</li>
            }
          </ul>
        }
      </div>

      <div class="flex shrink-0 items-end p-siaf-md md:w-[200px]">
        <siaf-button class="w-full" variant="accent" size="md" (click)="actionClicked.emit()">{{ actionLabel }}</siaf-button>
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConvocatoriaCardComponent {
  /** Código de la convocatoria (p. ej. `SPE-001-2025-MTC`). */
  @Input({ required: true }) code = '';
  /** Cantidad de lotes que se muestra a la izquierda. */
  @Input() lotes: number | string = 0;
  @Input() lotesLabel = 'Lotes';
  /** Fase actual, escrita en la etiqueta junto al código. */
  @Input() phase = '';
  @Input() phaseTone: StatusTagTone = 'info';
  @Input() info: ConvocatoriaCardInfo[] = [];
  @Input() participation: ConvocatoriaCardParticipacion | null = null;
  @Input() categories: string[] = [];
  /** Texto del botón de la derecha («Ver detalle», «Participar»). */
  @Input() actionLabel = 'Ver detalle';
  @Input() showSave = true;
  @Input() saved = false;

  @Output() actionClicked = new EventEmitter<void>();
  @Output() savedChange = new EventEmitter<boolean>();
}
