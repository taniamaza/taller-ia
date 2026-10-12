import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { BreadcrumbComponent, type BreadcrumbItem } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormTableSearchComponent } from '../../../../../shared/components/form-table-search/form-table-search.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { ButtonGroupItem, ButtonsGroupComponent } from '../../../../../shared/ui/buttons-group/buttons-group.component';
import { KpiCardComponent } from '../../../../../shared/ui/kpi-card/kpi-card.component';
import { StatusTagComponent } from '../../../../../shared/ui/status-tag/status-tag.component';
import { TooltipDirective } from '../../../../../shared/ui/tooltip/tooltip.directive';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { PROCESS_ID, PROCESS_ROUTE, registroPagoRoute } from '../../config/pagos-devoluciones-postor.rutas';
import { ESTADO_ORDEN, OrdenPago, TipoOrdenPago, formatoMonto } from '../../models/pago.model';
import { PagosPostorStore } from '../../services/pagos-postor.store';

/**
 * «Pagos y Devoluciones del postor»: las órdenes de pago del postor por tipo (garantías, adjudicaciones y
 * devoluciones), con indicadores, búsqueda y paginación. Todavía sin backend simulado: trabaja con las órdenes de
 * muestra en memoria; «Registrar pago» (órdenes pendientes o vencidas) y «Ver» abren el formulario de la orden.
 */
@Component({
  selector: 'siaf-pagos-devoluciones-ordenes',
  standalone: true,
  imports: [
    BreadcrumbComponent,
    ButtonsGroupComponent,
    KpiCardComponent,
    FormTableSearchComponent,
    PaginationComponent,
    StatusTagComponent,
    ButtonComponent,
    TooltipDirective,
  ],
  template: `
    <div class="min-h-[calc(100vh-56px)] bg-[var(--sys-color-bg-surfaces-surface-lowest)]">
      <section class="bg-surface">
        <siaf-breadcrumb class="block" [items]="breadcrumbs" />
        <header class="flex min-h-[72px] flex-col px-siaf-md pb-siaf-xs pt-siaf-sm">
          <h1 class="m-0 text-sm font-bold uppercase leading-normal text-text">Pagos y devoluciones</h1>
          <p class="m-0 text-[10px] font-medium uppercase leading-normal tracking-[0.66px] text-text-muted">Consulta y registra tus pagos a tiempo</p>
        </header>
      </section>

      <section class="p-siaf-md">
        <article class="flex flex-col gap-siaf-md rounded-siaf-md bg-surface p-siaf-lg">
          <h2 class="m-0 text-base font-bold uppercase leading-normal text-[var(--sys-color-text-neutral-high)]">Órdenes de pago</h2>

          <div>
            <siaf-buttons-group ariaLabel="Tipo de orden de pago" [items]="tipos" [value]="tipo()" (valueChange)="cambiarTipo($event)" />
          </div>

          @if (tipo() === 'garantias') {
            <div class="grid gap-siaf-md sm:grid-cols-2 xl:grid-cols-4">
              <siaf-kpi-card title="Garantías activas" amount="S/ 28 500.00" tone="success" icon="verified_user" [showProgress]="false" [compact]="true" />
              <siaf-kpi-card title="Garantías pendientes" amount="S/ 12 000.00" tone="warning" icon="payments" [showProgress]="false" [compact]="true" />
              <siaf-kpi-card title="Nro lotes a postular" amount="8" tone="informative" icon="monetization_on" [showProgress]="false" [compact]="true" />
              <siaf-kpi-card title="Nro lotes pendientes pago" amount="2" tone="success" icon="trending_up" [showProgress]="false" [compact]="true" />
            </div>
          }

          <siaf-form-table-search placeholder="Buscar" [value]="busqueda()" (valueChange)="aplicarBusqueda($event)" />

          <div class="flex justify-end">
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

          <div class="siaf-table-shell">
            <table class="siaf-table">
              <thead>
                <tr class="siaf-table-head-row">
                  <th class="siaf-table-th">Orden de pago</th>
                  <th class="siaf-table-th">Proceso</th>
                  <th class="siaf-table-th">Cantidad lotes</th>
                  <th class="siaf-table-th text-right">Monto (S/)</th>
                  <th class="siaf-table-th">Estado</th>
                  <th class="siaf-table-th">Fecha de registro</th>
                  <th class="siaf-table-th">Fecha límite</th>
                  <th class="siaf-table-th siaf-table-sticky-cell"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (o of visibles(); track o.orden) {
                  <tr class="siaf-table-row">
                    <td class="siaf-table-td">{{ o.orden }}</td>
                    <td class="siaf-table-td">{{ o.proceso }}</td>
                    <td class="siaf-table-td">{{ o.lotes }}</td>
                    <td class="siaf-table-td text-right">{{ monto(o.monto) }}</td>
                    <td class="siaf-table-td">
                      <siaf-status-tag appearance="outline" size="small" [tone]="estado(o).tone" [icon]="estado(o).icon">{{ estado(o).label }}</siaf-status-tag>
                    </td>
                    <td class="siaf-table-td">{{ o.registro }}</td>
                    <td class="siaf-table-td">{{ o.limite }}</td>
                    <td class="siaf-table-td siaf-table-sticky-cell">
                      @if (o.estado === 'pendiente' || o.estado === 'vencido') {
                        <span siafTooltip="Registrar pago">
                          <siaf-button variant="text" size="sm" icon="edit" [iconOnly]="true" [ariaLabel]="'Registrar pago de ' + o.orden" (click)="abrir(o)" />
                        </span>
                      } @else {
                        <siaf-button variant="text" size="sm" icon="visibility" [iconOnly]="true" [ariaLabel]="'Ver ' + o.orden" (click)="abrir(o)" />
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td class="siaf-table-td text-center text-[var(--sys-color-text-neutral-low)]" colspan="8">No hay órdenes de pago que coincidan con la búsqueda.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <siaf-pagination
            navigation="Activate"
            position="Bottom"
            [rowPage]="true"
            [page]="pagina()"
            [pageSize]="filasPorPagina()"
            [totalItems]="total()"
            [totalPages]="totalPaginas()"
            [rowsPerPage]="filasPorPagina()"
            (previous)="irAPagina(pagina() - 1)"
            (next)="irAPagina(pagina() + 1)"
            (rowsPerPageChange)="cambiarFilas($event)"
          />
        </article>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagosDevolucionesOrdenesComponent {
  private readonly router = inject(Router);
  private readonly store = inject(PagosPostorStore);

  readonly breadcrumbs: BreadcrumbItem[] = buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE);
  readonly tipos: ButtonGroupItem[] = [
    { label: 'Garantías', value: 'garantias' },
    { label: 'Adjudicaciones', value: 'adjudicaciones' },
    { label: 'Devoluciones', value: 'devoluciones' },
  ];

  readonly tipo = signal<TipoOrdenPago>('garantias');
  readonly busqueda = signal('');
  readonly pagina = signal(1);
  readonly filasPorPagina = signal(10);

  private readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return this.store
      .ordenes()
      .filter((o) => o.tipo === this.tipo())
      .filter((o) => !texto || [o.orden, o.proceso, ESTADO_ORDEN[o.estado].label].some((v) => v.toLowerCase().includes(texto)));
  });
  readonly total = computed(() => this.filtradas().length);
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.filasPorPagina())));
  readonly visibles = computed(() => {
    const inicio = (this.pagina() - 1) * this.filasPorPagina();
    return this.filtradas().slice(inicio, inicio + this.filasPorPagina());
  });

  estado(o: OrdenPago) {
    return ESTADO_ORDEN[o.estado];
  }

  monto(valor: number): string {
    return formatoMonto(valor);
  }

  cambiarTipo(valor: string): void {
    this.tipo.set(valor as TipoOrdenPago);
    this.pagina.set(1);
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

  abrir(o: OrdenPago): void {
    void this.router.navigateByUrl(registroPagoRoute(o.orden));
  }
}
