import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BreadcrumbComponent, type BreadcrumbItem } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormTableSearchComponent } from '../../../../../shared/components/form-table-search/form-table-search.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import { SolicitudeHeaderComponent } from '../../../../../shared/components/solicitude-header/solicitude-header.component';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { LoteCardComponent, LoteCardDato } from '../../../../../shared/ui/lote-card/lote-card.component';
import { SummaryCardComponent, SummaryCardField } from '../../../../../shared/ui/summary-card/summary-card.component';
import { TabItem, TabsComponent } from '../../../../../shared/ui/tabs/tabs.component';
import { PROCESS_ID, PROCESS_ROUTE } from '../../config/procesos-postor.rutas';
import { CONVOCATORIAS_MUESTRA, Convocatoria, FASE_ETIQUETA, LoteConvocatoria, lotesDe } from '../../models/convocatoria.model';

const CODIGO_PAGO_MUESTRA = 'PAY-05-2025';
const GARANTIA_POR_LOTE = 5500;

const formatoSoles = (monto: number): string =>
  `S/ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Detalle de una convocatoria de «Procesos del postor»: aviso del pago de garantía, datos del proceso y listado de
 * lotes con búsqueda y paginación. Todavía sin backend simulado: trabaja con los datos de muestra de la convocatoria y
 * los lotes que se generan a partir de ella; solo la pestaña «Lotes» tiene contenido y «Ver detalle» de un lote aún no
 * lleva a otra pantalla.
 */
@Component({
  selector: 'siaf-procesos-postor-detalle',
  standalone: true,
  imports: [
    BreadcrumbComponent,
    SolicitudeHeaderComponent,
    AlertComponent,
    SummaryCardComponent,
    TabsComponent,
    FormTableSearchComponent,
    PaginationComponent,
    LoteCardComponent,
  ],
  template: `
    @if (convocatoria(); as conv) {
      <div class="min-h-[calc(100vh-56px)] bg-[var(--sys-color-bg-surfaces-surface-lowest)]">
        <section class="border-b border-[var(--sys-color-divider-default)] bg-surface">
          <siaf-breadcrumb class="block" [items]="breadcrumbs()" />
          <siaf-solicitude-header
            [heading]="conv.codigo"
            [secondaryText]="conv.entidad"
            [showReturn]="true"
            [showTag]="true"
            [tagLabel]="etiquetaFase()"
            tagTone="info"
            [showButtonGroup]="false"
            (returned)="volver()"
          />
        </section>

        <section class="flex flex-col gap-siaf-md p-siaf-md">
          @if (conv.participacion?.pagoPendiente) {
            <siaf-alert tone="warning" title="Pago de garantía pendiente" [description]="avisoPago()" />
          }

          <article class="flex flex-col gap-siaf-md rounded-siaf-md bg-surface p-siaf-lg">
            <h2 class="m-0 text-base font-bold uppercase leading-normal text-[var(--sys-color-text-neutral-high)]">Datos del proceso</h2>
            <siaf-summary-card [fields]="datosProceso()" [bordered]="true" [showIndicator]="true" [showClose]="false" />
          </article>

          <article class="flex flex-col rounded-siaf-md bg-surface">
            <siaf-tabs ariaLabel="Secciones de la convocatoria" idBase="detalle-convocatoria" [tabs]="pestanas" [activeId]="pestana()" (activeIdChange)="pestana.set($event)" />

            @if (pestana() === 'lotes') {
              <div class="flex flex-col gap-siaf-md p-siaf-lg">
                <h3 class="m-0 text-base font-bold uppercase leading-normal text-[var(--sys-color-text-neutral-high)]">Listado de lotes</h3>
                <siaf-form-table-search placeholder="Buscar" [value]="busqueda()" (valueChange)="aplicarBusqueda($event)" />

                <div class="flex flex-wrap items-center justify-between gap-siaf-md">
                  <p class="m-0 text-xs text-text" aria-live="polite">Resultados {{ total() }}</p>
                  <siaf-pagination
                    class="max-w-max"
                    position="Top"
                    [page]="pagina()"
                    [pageSize]="filasPorPagina()"
                    [totalItems]="total()"
                    [totalPages]="totalPaginas()"
                    (previous)="irAPagina(pagina() - 1)"
                    (next)="irAPagina(pagina() + 1)"
                  />
                </div>

                <div class="flex flex-col gap-siaf-md">
                  @for (lote of visibles(); track lote.numero) {
                    <siaf-lote-card
                      [title]="'Lote N° ' + lote.numero"
                      [status]="estadoDe(lote)"
                      [description]="lote.descripcion"
                      [categories]="lote.categorias"
                      imageSrc="assets/img/lote-muestra.png"
                      [datos]="datosDe(lote)"
                      [price]="lote.precioBase"
                      [guarantee]="lote.garantia"
                      [selected]="elegidos().has(lote.numero)"
                      (selectedChange)="elegir(lote.numero, $event)"
                    />
                  } @empty {
                    <p class="m-0 rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-low)] p-siaf-lg text-center text-sm text-text-muted">
                      No hay lotes que coincidan con la búsqueda.
                    </p>
                  }
                </div>

                <div class="border-t border-[var(--sys-color-divider-default)] pt-siaf-xs">
                  <siaf-pagination
                    navigation="Activate"
                    position="Bottom"
                    [rowPage]="true"
                    [page]="pagina()"
                    [pageSize]="filasPorPagina()"
                    [totalItems]="total()"
                    [totalPages]="totalPaginas()"
                    [rowsPerPage]="filasPorPagina()"
                    [rowsPerPageOptions]="opcionesFilas"
                    (previous)="irAPagina(pagina() - 1)"
                    (next)="irAPagina(pagina() + 1)"
                    (rowsPerPageChange)="cambiarFilas($event)"
                  />
                </div>
              </div>
            } @else {
              <p class="m-0 p-siaf-lg text-sm text-text-muted">Esta sección todavía no está disponible.</p>
            }
          </article>
        </section>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcesosPostorDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly pestanas: TabItem[] = [
    { id: 'lotes', label: 'Lotes' },
    { id: 'cronograma', label: 'Cronograma' },
    { id: 'bases', label: 'Bases' },
    { id: 'manual', label: 'Manual del postor' },
  ];
  readonly opcionesFilas = [5, 10, 15, 25];

  readonly convocatoria = signal<Convocatoria | undefined>(
    CONVOCATORIAS_MUESTRA.find((c) => c.id === this.route.snapshot.paramMap.get('id')),
  );
  private readonly lotes = computed<LoteConvocatoria[]>(() => {
    const conv = this.convocatoria();
    return conv ? lotesDe(conv) : [];
  });

  readonly pestana = signal('lotes');
  readonly busqueda = signal('');
  readonly pagina = signal(1);
  readonly filasPorPagina = signal(10);
  readonly elegidos = signal(new Set(this.lotes().filter((l) => l.participa).map((l) => l.numero)));

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() =>
    buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE, this.convocatoria()?.codigo),
  );
  readonly etiquetaFase = computed(() => {
    const conv = this.convocatoria();
    return conv ? FASE_ETIQUETA[conv.fase] : '';
  });

  readonly avisoPago = computed(() => {
    const inscritos = this.convocatoria()?.participacion?.lotesInscritos ?? 0;
    return (
      `El registro se completó. Para habilitar su participación, realice el pago de ${formatoSoles(inscritos * GARANTIA_POR_LOTE)} ` +
      `con el código ${CODIGO_PAGO_MUESTRA} y registre la constancia en “Pagos y Devoluciones”.`
    );
  });

  readonly datosProceso = computed<SummaryCardField[]>(() => {
    const conv = this.convocatoria();
    const lotes = this.lotes();
    const bienes = lotes.reduce((suma, l) => suma + l.bienes, 0);
    return [
      { label: 'Inicio de acto público', value: conv?.acto?.inicio ?? '—' },
      { label: 'Fin de acto público', value: conv?.acto?.fin ?? '—' },
      { label: 'Cantidad', value: `${lotes.length} LOTES / ${bienes} BIENES MUEBLES` },
      { label: 'Ubicación física', value: conv?.acto?.ubicacionFisica ?? '—' },
    ];
  });

  private readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.lotes();
    return this.lotes().filter((l) =>
      [`lote n° ${l.numero}`, l.descripcion, ...l.categorias].some((valor) => valor.toLowerCase().includes(texto)),
    );
  });
  readonly total = computed(() => this.filtrados().length);
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.filasPorPagina())));
  readonly visibles = computed(() => {
    const inicio = (this.pagina() - 1) * this.filasPorPagina();
    return this.filtrados().slice(inicio, inicio + this.filasPorPagina());
  });

  constructor() {
    effect(() => {
      if (!this.convocatoria()) void this.router.navigateByUrl(PROCESS_ROUTE);
    });
  }

  /** Los lotes en los que ya participa quedan con el pago de garantía pendiente mientras la convocatoria lo esté. */
  estadoDe(lote: LoteConvocatoria): string {
    return lote.participa && this.convocatoria()?.participacion?.pagoPendiente ? 'Pago pendiente' : '';
  }

  datosDe(lote: LoteConvocatoria): LoteCardDato[] {
    return [
      { label: 'Acto público', value: lote.actoPublico },
      { label: 'Cantidad', value: `${lote.bienes} Bienes muebles` },
      { label: 'Incremento de oferta (S/.)', value: lote.incrementoOferta },
    ];
  }

  aplicarBusqueda(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
  }

  cambiarFilas(filas: number): void {
    this.filasPorPagina.set(filas);
    this.pagina.set(1);
  }

  irAPagina(pagina: number): void {
    this.pagina.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }

  elegir(numero: string, elegido: boolean): void {
    this.elegidos.update((actuales) => {
      const nuevos = new Set(actuales);
      if (elegido) nuevos.add(numero);
      else nuevos.delete(numero);
      return nuevos;
    });
  }

  volver(): void {
    void this.router.navigateByUrl(PROCESS_ROUTE);
  }
}
