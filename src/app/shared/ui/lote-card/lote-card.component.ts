import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { ButtonComponent } from '../button/button.component';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { IconComponent } from '../icon/icon.component';
import { StatusTagComponent } from '../status-tag/status-tag.component';

/** Dato corto de un lote con su etiqueta: acto público, cantidad o incremento de oferta. */
export interface LoteCardDato {
  label: string;
  value: string;
}

/**
 * Tarjeta de un lote de una convocatoria (Figma «card-lote»): a la izquierda la foto con la casilla para elegirlo, al
 * centro el título, la descripción, las categorías y tres datos (acto público, cantidad e incremento de oferta), y a la
 * derecha el precio base, la garantía y el botón de detalle. Es un organismo armado con `siaf-checkbox`,
 * `siaf-button` e `siaf-icon`: no hace nada por sí sola, el padre decide qué pasa con `selectedChange` y
 * `actionClicked`.
 *
 * Sin `imageSrc` pinta un recuadro gris con un ícono en lugar de la foto. Con `status` muestra a la derecha del título
 * la etiqueta de estado del lote para el postor («Pago pendiente»). En móvil las zonas se apilan.
 *
 * @usar
 * - En el listado de lotes del detalle de una convocatoria (pestaña «Lotes» de «Procesos del postor»).
 * - Con `[selectable]="false"` cuando el lote no se puede elegir y la casilla sobra.
 * - Con `status` en los lotes en los que el postor ya participa y tienen algo pendiente (pago de garantía).
 * - Con `imageSrc` en un archivo propio del proyecto (`assets/img/…`), nunca una URL externa.
 * @evitar
 * - Para una convocatoria completa: usar `siaf-convocatoria-card`.
 * - Para muchos registros comparables en columnas: usar la grilla estándar (`siaf-documents-records-table`).
 * - Para mostrar un único ítem elegido desde un panel lateral: usar `siaf-summary-card`.
 * @teclado
 * - **Tab**: pasa por la casilla y por el botón de detalle.
 * - **Espacio** en la casilla: la marca o desmarca y emite `selectedChange`; **Enter / Espacio** en el botón emiten
 *   `actionClicked`.
 * @accesibilidad
 * - **4.1.2 Nombre, función y valor (A)**: la casilla se nombra «Seleccionar» + el título del lote y el botón de
 *   detalle lleva el título del lote en su nombre accesible.
 * - **1.1.1 Contenido no textual (A)**: la foto es decorativa (`alt` vacío) porque el título y la descripción ya
 *   dicen qué es el lote; el recuadro sin foto y su ícono son `aria-hidden`.
 * - **1.3.1 Información y relaciones (A)**: el título es un `h3` y los datos, una lista de definiciones
 *   (`dl`, `dt`, `dd`).
 * - **1.4.3 Contraste mínimo (AA)**: títulos en `text-neutral-medium` y etiquetas en `text-neutral-low` sobre blanco.
 * - **1.4.1 Uso del color (A)**: el estado va escrito en la etiqueta; el ícono y el borde solo lo refuerzan.
 * - **2.5.8 Tamaño del objetivo (AA)**: el botón mide 40 px de alto.
 */
@Component({
  selector: 'siaf-lote-card',
  standalone: true,
  imports: [ButtonComponent, CheckboxComponent, IconComponent, StatusTagComponent],
  template: `
    <article class="flex flex-col overflow-hidden rounded-siaf-md border border-[var(--sys-color-divider-default)] bg-surface md:flex-row md:items-stretch">
      <div class="relative h-[200px] shrink-0 bg-[var(--sys-color-bg-surfaces-surface-high)] md:w-[245px]">
        @if (imageSrc) {
          <img class="size-full object-cover" [src]="imageSrc" alt="" loading="lazy" />
        } @else {
          <div class="flex size-full items-center justify-center text-[var(--sys-color-text-neutral-low)]" aria-hidden="true">
            <siaf-icon name="image" [size]="48" />
          </div>
        }
        @if (selectable) {
          <div class="absolute left-siaf-xs top-siaf-xs rounded-siaf-sm bg-surface">
            <!-- El texto de la casilla queda solo para lectores de pantalla: en el diseño se ve únicamente el cuadro. -->
            <siaf-checkbox class="block [&_label>span]:sr-only" [label]="'Seleccionar ' + title" [checked]="selected" (checkedChange)="selectedChange.emit($event)" />
          </div>
        }
      </div>

      <div class="flex min-w-0 flex-1 flex-col gap-siaf-xs p-siaf-md">
        <div class="flex items-start justify-between gap-siaf-md">
          <h3 class="m-0 text-base font-bold uppercase leading-normal tracking-[0.02px] text-[var(--sys-color-text-neutral-medium)]">{{ title }}</h3>
          @if (status) {
            <siaf-status-tag appearance="outline" size="small" [icon]="statusIcon">{{ status }}</siaf-status-tag>
          }
        </div>
        @if (description) {
          <p class="m-0 text-sm leading-normal tracking-[0.0249px] text-[var(--sys-color-text-neutral-low)]">{{ description }}</p>
        }
        @if (categories.length > 0) {
          <ul class="m-0 flex list-none flex-wrap gap-siaf-xs p-0">
            @for (categoria of categories; track $index) {
              <li class="rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-high)] px-siaf-xs py-siaf-xxs text-[11px] font-bold uppercase tracking-[0.66px] text-[var(--sys-color-text-brand-secondary)]">{{ categoria }}</li>
            }
          </ul>
        }
        @if (datos.length > 0) {
          <dl class="m-0 mt-auto grid grid-cols-1 rounded-siaf-sm border border-[var(--sys-color-divider-default)] px-siaf-sm sm:grid-cols-3">
            @for (dato of datos; track $index) {
              <div class="flex flex-col gap-siaf-xxs border-b border-[var(--sys-color-divider-default)] py-siaf-xs last:border-b-0 sm:border-b-0 sm:border-l sm:px-siaf-md sm:first:border-l-0 sm:first:pl-0">
                <dt class="text-[11px] font-medium uppercase tracking-[0.66px] text-[var(--sys-color-text-neutral-low)]">{{ dato.label }}</dt>
                <dd class="m-0 text-xs font-bold text-[var(--sys-color-text-neutral-medium)]">{{ dato.value }}</dd>
              </div>
            }
          </dl>
        }
      </div>

      <div class="flex shrink-0 flex-col gap-siaf-xs border-t border-[var(--sys-color-divider-default)] px-siaf-lg py-siaf-md md:w-[200px] md:items-end md:border-l md:border-t-0">
        <div class="flex flex-col md:items-end">
          <span class="text-[11px] font-medium uppercase tracking-[0.66px] text-[var(--sys-color-text-neutral-low)]">{{ priceLabel }}</span>
          <span class="text-[22px] font-bold uppercase leading-normal tracking-[-0.19px] text-[var(--sys-color-text-neutral-high)]">{{ price }}</span>
        </div>
        @if (guarantee) {
          <p class="m-0 flex gap-siaf-xxs text-xs">
            <span class="text-[var(--sys-color-text-neutral-low)]">{{ guaranteeLabel }}</span>
            <span class="font-medium text-[var(--sys-color-text-neutral-medium)]">{{ guarantee }}</span>
          </p>
        }
        <siaf-button
          class="mt-auto w-full"
          variant="outline"
          size="md"
          [ariaLabel]="actionLabel + ' ' + title"
          (click)="actionClicked.emit()"
        >{{ actionLabel }}</siaf-button>
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoteCardComponent {
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() categories: string[] = [];
  /** Ruta de la foto (por ejemplo `assets/img/lote-muestra.png`). Sin ella se pinta un recuadro con ícono. */
  @Input() imageSrc = '';
  @Input() datos: LoteCardDato[] = [];
  @Input() priceLabel = 'Precio base';
  @Input() price = '';
  @Input() guaranteeLabel = 'Garantía:';
  @Input() guarantee = '';
  @Input() actionLabel = 'Ver detalle';
  /** Estado del lote para el postor (p. ej. «Pago pendiente»), a la derecha del título. Sin texto no se pinta. */
  @Input() status = '';
  @Input() statusIcon = 'pending';
  @Input() selectable = true;
  @Input() selected = false;

  @Output() selectedChange = new EventEmitter<boolean>();
  @Output() actionClicked = new EventEmitter<void>();
}
