import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { BreadcrumbComponent, type BreadcrumbItem } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FilterPillComponent } from '../../../../../shared/components/filter-pill/filter-pill.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import { RecordsSearchToolbarComponent } from '../../../../../shared/components/records-search-toolbar/records-search-toolbar.component';
import { RecordsTabItem, RecordsTabsComponent } from '../../../../../shared/components/records-tabs/records-tabs.component';
import { ConvocatoriaCardComponent, ConvocatoriaCardInfo } from '../../../../../shared/ui/convocatoria-card/convocatoria-card.component';
import { IconDropdownMenuComponent, IconDropdownMenuItem } from '../../../../../shared/ui/icon-dropdown-menu/icon-dropdown-menu.component';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { PROCESS_ID, PROCESS_ROUTE } from '../../config/procesos-postor.rutas';
import { CONVOCATORIAS_MUESTRA, Convocatoria, FASE_ETIQUETA, FaseConvocatoria } from '../../models/convocatoria.model';

type PestanaId = 'todas' | FaseConvocatoria;

const ORDENES = ['Más recientes', 'Código (A-Z)', 'Más lotes'] as const;

/**
 * «Procesos del postor» de la subasta pública electrónica: las convocatorias en las que el postor puede participar,
 * con pestañas por fase, búsqueda, filtros y paginación. Todavía sin backend simulado: trabaja sobre datos de muestra
 * en memoria; «Ver detalle» abre el detalle de la convocatoria y «Participar» aún no lleva a otra pantalla.
 */
@Component({
  selector: 'siaf-procesos-postor-convocatorias',
  standalone: true,
  imports: [
    BreadcrumbComponent,
    RecordsTabsComponent,
    RecordsSearchToolbarComponent,
    IconDropdownMenuComponent,
    FilterPillComponent,
    PaginationComponent,
    ConvocatoriaCardComponent,
  ],
  template: `
    <div class="min-h-[calc(100vh-56px)] bg-[var(--sys-color-bg-surfaces-surface-lowest)]">
      <section class="bg-surface">
        <siaf-breadcrumb class="block" [items]="breadcrumbs" />
        <header class="flex min-h-[72px] flex-col px-siaf-md pb-siaf-xs pt-siaf-sm">
          <h1 class="m-0 text-sm font-bold uppercase leading-normal text-text">Subasta pública electrónica</h1>
          <p class="m-0 text-[10px] font-medium uppercase leading-normal tracking-[0.66px] text-text-muted">Continúa con postulación</p>
        </header>
      </section>

      <section class="p-siaf-md">
        <article class="flex flex-col rounded-siaf-md bg-surface">
          <h2 class="m-0 px-siaf-lg pb-siaf-xs pt-siaf-md text-sm font-bold uppercase leading-normal text-text">Convocatorias</h2>

          <siaf-records-tabs ariaLabel="Fases de la convocatoria" [tabs]="pestanas" [activeId]="pestana()" (activeIdChange)="cambiarPestana($event)" />

          <div class="flex flex-col gap-siaf-md p-siaf-lg">
            <siaf-records-search-toolbar [value]="busqueda()" placeholder="Buscar" (searchSubmit)="aplicarBusqueda($event)">
              <ng-container actions>
                <siaf-icon-dropdown-menu icon="filter_list" ariaLabel="Filtros" [items]="menuFiltros" (selected)="limpiarFiltros()" />
                <siaf-icon-dropdown-menu icon="more_vert" ariaLabel="Más opciones" [items]="menuOpciones" (selected)="restablecerVista()" />
              </ng-container>
            </siaf-records-search-toolbar>

            <div class="flex flex-wrap items-center gap-siaf-xs">
              <siaf-filter-pill label="Ordenar" [options]="ordenes" [selectedValue]="orden()" (selectedValueChange)="cambiarOrden($event)" />
              <siaf-filter-pill label="Categorías" [options]="categorias" [selectedValue]="categoria()" (selectedValueChange)="cambiarCategoria($event)" />
            </div>
          </div>

          <div class="flex flex-col gap-siaf-md border-t border-[var(--sys-color-divider-default)] px-siaf-lg pb-siaf-md pt-siaf-md">
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
              @for (c of visibles(); track c.id) {
                <siaf-convocatoria-card
                  [code]="c.codigo"
                  [lotes]="c.lotes"
                  [phase]="etiquetaFase(c.fase)"
                  [info]="infoDe(c)"
                  [participation]="participacionDe(c)"
                  [categories]="c.categorias"
                  [actionLabel]="c.participacion ? 'Ver detalle' : 'Participar'"
                  [saved]="guardadas().has(c.id)"
                  (savedChange)="guardar(c.id, $event)"
                  (actionClicked)="abrir(c)"
                />
              } @empty {
                <p class="m-0 rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-low)] p-siaf-lg text-center text-sm text-text-muted">
                  No hay convocatorias que coincidan con los filtros.
                </p>
              }
            </div>
          </div>

          <div class="border-t border-[var(--sys-color-divider-default)] px-siaf-lg py-siaf-xs">
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
        </article>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcesosPostorConvocatoriasComponent {
  private readonly router = inject(Router);
  readonly breadcrumbs: BreadcrumbItem[] = buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE);

  readonly pestanas: RecordsTabItem[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'exhibicion', label: 'Exhibiciones' },
    { id: 'habilitacion', label: 'Habilitaciones' },
    { id: 'acto-publico', label: 'Acto público' },
    { id: 'adjudicacion', label: 'Adjudicaciones' },
    { id: 'entrega', label: 'Entrega' },
  ];
  readonly ordenes: string[] = [...ORDENES];
  readonly opcionesFilas = [5, 10, 15, 25];
  readonly menuFiltros: IconDropdownMenuItem[] = [{ label: 'Limpiar filtros' }];
  readonly menuOpciones: IconDropdownMenuItem[] = [{ label: 'Restablecer vista' }];

  private readonly convocatorias = CONVOCATORIAS_MUESTRA;
  readonly categorias = [...new Set(this.convocatorias.flatMap((c) => c.categorias))].sort((a, b) => a.localeCompare(b, 'es'));

  readonly pestana = signal<PestanaId>('habilitacion');
  readonly busqueda = signal('');
  readonly orden = signal('');
  readonly categoria = signal('');
  readonly pagina = signal(1);
  readonly filasPorPagina = signal(15);
  readonly guardadas = signal(new Set(this.convocatorias.filter((c) => c.guardada).map((c) => c.id)));

  private readonly filtradas = computed(() => {
    const fase = this.pestana();
    const texto = this.busqueda().trim().toLowerCase();
    const categoria = this.categoria();
    const lista = this.convocatorias.filter((c) => {
      if (fase !== 'todas' && c.fase !== fase) return false;
      if (categoria && !c.categorias.includes(categoria)) return false;
      if (!texto) return true;
      return [c.codigo, c.entidad, c.ubicacion, ...c.categorias].some((valor) => valor.toLowerCase().includes(texto));
    });
    switch (this.orden()) {
      case 'Código (A-Z)':
        return [...lista].sort((a, b) => a.codigo.localeCompare(b.codigo, 'es'));
      case 'Más lotes':
        return [...lista].sort((a, b) => b.lotes - a.lotes);
      default:
        return lista;
    }
  });

  readonly total = computed(() => this.filtradas().length);
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.filasPorPagina())));
  readonly visibles = computed(() => {
    const inicio = (this.pagina() - 1) * this.filasPorPagina();
    return this.filtradas().slice(inicio, inicio + this.filasPorPagina());
  });

  etiquetaFase(fase: FaseConvocatoria): string {
    return FASE_ETIQUETA[fase];
  }

  infoDe(c: Convocatoria): ConvocatoriaCardInfo[] {
    return [
      { icon: 'gavel', text: c.vigencia },
      { icon: 'domain', text: c.entidad },
      { icon: 'fmd_good', text: c.ubicacion },
    ];
  }

  participacionDe(c: Convocatoria) {
    if (!c.participacion) return null;
    return {
      texto: 'Participación registrada en',
      destacado: `${c.participacion.lotesInscritos} de ${c.lotes} lotes`,
      estado: c.participacion.pagoPendiente ? 'Pago pendiente' : undefined,
    };
  }

  cambiarPestana(id: string): void {
    this.pestana.set(id as PestanaId);
    this.pagina.set(1);
  }

  aplicarBusqueda(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
  }

  cambiarOrden(valor: string): void {
    this.orden.set(valor);
    this.pagina.set(1);
  }

  cambiarCategoria(valor: string): void {
    this.categoria.set(valor);
    this.pagina.set(1);
  }

  cambiarFilas(filas: number): void {
    this.filasPorPagina.set(filas);
    this.pagina.set(1);
  }

  irAPagina(pagina: number): void {
    this.pagina.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.orden.set('');
    this.categoria.set('');
    this.pagina.set(1);
  }

  restablecerVista(): void {
    this.limpiarFiltros();
    this.pestana.set('habilitacion');
    this.filasPorPagina.set(15);
  }

  /** «Ver detalle» abre la convocatoria en la que ya participa; «Participar» todavía no tiene pantalla. */
  abrir(c: Convocatoria): void {
    if (c.participacion) void this.router.navigate([PROCESS_ROUTE, c.id]);
  }

  guardar(id: string, guardada: boolean): void {
    this.guardadas.update((actuales) => {
      const nuevas = new Set(actuales);
      if (guardada) nuevas.add(id);
      else nuevas.delete(id);
      return nuevas;
    });
  }
}
