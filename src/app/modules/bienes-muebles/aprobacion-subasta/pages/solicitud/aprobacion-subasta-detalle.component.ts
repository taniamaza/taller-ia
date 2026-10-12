import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CurrentUserService } from '../../../../../core/auth/current-user.service';
import type { BreadcrumbItem } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormTableSearchComponent } from '../../../../../shared/components/form-table-search/form-table-search.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import { SolicitudeFormCardComponent } from '../../../../../shared/components/solicitude-form-card/solicitude-form-card.component';
import { SolicitudeInfoCardComponent, SolicitudeInfoField } from '../../../../../shared/components/solicitude-info-card/solicitude-info-card.component';
import { SolicitudePageLayoutComponent } from '../../../../../shared/components/solicitude-page-layout/solicitude-page-layout.component';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { ActionTrackerComponent, ActionTrackerSummary } from '../../../../../shared/ui/action-tracker/action-tracker.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { CollapsibleCardComponent, CollapsibleCardField } from '../../../../../shared/ui/collapsible-card/collapsible-card.component';
import { DocumentSummaryCardComponent } from '../../../../../shared/ui/document-summary-card/document-summary-card.component';
import type { FlowStatus } from '../../../../../shared/ui/flow-status-tag/flow-status-tag.component';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../../../shared/ui/modal/modal.component';
import { RadioComponent, RadioOption } from '../../../../../shared/ui/radio/radio.component';
import { SideNavComponent } from '../../../../../shared/ui/side-nav/side-nav.component';
import { SnackbarComponent } from '../../../../../shared/ui/snackbar/snackbar.component';
import { StatusTagComponent, StatusTagTone } from '../../../../../shared/ui/status-tag/status-tag.component';
import { SummaryCardComponent, SummaryCardField } from '../../../../../shared/ui/summary-card/summary-card.component';
import { TextAreaControlComponent } from '../../../../../shared/ui/text-area-control/text-area-control.component';
import { TextFieldComponent, TextFieldOption } from '../../../../../shared/ui/text-field/text-field.component';
import { TooltipDirective } from '../../../../../shared/ui/tooltip/tooltip.directive';
import { PROCESS_ID, PROCESS_ROUTE } from '../../config/aprobacion-subasta.rutas';
import {
  ConstanciaRevision,
  EstadoConstanciaRevision,
  NOMBRE_DOCUMENTO,
  TIPOS_ERROR_VALIDACION,
} from '../../models/documento-revision.model';
import { RevisionDocumentosStore } from '../../services/revision-documentos.store';

const ETIQUETA_CONSTANCIA: Record<EstadoConstanciaRevision, { label: string; tone: StatusTagTone }> = {
  pendiente: { label: 'Pendiente de validar', tone: 'default' },
  conforme: { label: 'Conforme', tone: 'success' },
  'no-conforme': { label: 'No conforme', tone: 'danger' },
};

const formatoMonto = (monto: number): string =>
  monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ');

/**
 * Detalle de un documento de «Aprobación de subasta pública electrónica» para el revisor: registro de pago de garantía
 * o de saldo. El revisor valida cada constancia de operación bancaria (conforme o no conforme, en un panel lateral) y
 * después aprueba el documento u lo observa. «Aprobar» se habilita cuando todas las constancias son conformes y
 * «Observar», cuando alguna no lo es. Todavía sin backend simulado: el cambio vive solo mientras la página no se recarga.
 */
@Component({
  selector: 'siaf-aprobacion-subasta-detalle',
  standalone: true,
  imports: [
    SolicitudePageLayoutComponent,
    SolicitudeInfoCardComponent,
    SolicitudeFormCardComponent,
    DocumentSummaryCardComponent,
    CollapsibleCardComponent,
    SummaryCardComponent,
    FormTableSearchComponent,
    PaginationComponent,
    ButtonComponent,
    IconComponent,
    StatusTagComponent,
    TooltipDirective,
    ActionTrackerComponent,
    SideNavComponent,
    RadioComponent,
    TextAreaControlComponent,
    TextFieldComponent,
    ModalComponent,
    SnackbarComponent,
  ],
  template: `
    @if (documento(); as d) {
      <siaf-solicitude-page-layout
        [breadcrumbs]="breadcrumbs()"
        role="approver"
        [state]="estadoEncabezado()"
        [heading]="titulo()"
        secondaryText="Creación"
        [showReturn]="true"
        [showTag]="false"
        [customActions]="true"
        (returned)="volver()"
      >
        <ng-container actions>
          @if (d.estado === 'Verificado') {
            <siaf-button variant="outline" size="md" icon="assignment_late" [disabled]="!hayNoConformes()" (click)="abrirObservar()">Observar</siaf-button>
            <siaf-button variant="accent" size="md" icon="inventory" [disabled]="!todasConformes()" (click)="modalAprobar.set(true)">Aprobar</siaf-button>
          }
        </ng-container>

        <section class="grid gap-siaf-md lg:grid-cols-[1fr_360px]">
          <siaf-solicitude-info-card [fields]="camposEntidad()" />
          <siaf-document-summary-card [documentNumber]="d.numeroVisible" [status]="estadoDocumento()" />
        </section>

        <siaf-solicitude-form-card [title]="esSaldo() ? 'Datos del proceso' : 'Datos del proceso de subasta'">
          <siaf-collapsible-card [fields]="datosProceso()" [closable]="false">
            <div class="flex flex-col gap-siaf-md px-siaf-lg py-siaf-md">
              @for (n of numerosLote(); track n) {
                <div class="flex min-h-12 items-center gap-siaf-xs rounded-siaf-sm border border-[var(--sys-color-divider-strong)] bg-surface px-siaf-md py-siaf-xxs">
                  <siaf-icon class="shrink-0 text-[var(--sys-color-text-neutral-medium)]" name="expand_more" [size]="24" />
                  <p class="m-0 text-sm font-medium text-[var(--sys-color-text-neutral-medium)]">
                    LOTE N°{{ n }} <span class="text-[var(--sys-color-text-neutral-low)]">(10 bienes muebles)</span>
                  </p>
                </div>
              }
            </div>
          </siaf-collapsible-card>
        </siaf-solicitude-form-card>

        <siaf-solicitude-form-card title="Datos de la orden de pago">
          <siaf-summary-card [fields]="datosOrden()" [bordered]="true" [showIndicator]="true" [showClose]="false" />
        </siaf-solicitude-form-card>

        <siaf-solicitude-form-card [title]="esSaldo() ? 'Resumen del pago de adjudicación' : 'Detalle del registro'">
          <div class="flex flex-col gap-siaf-lg">
            <div class="grid gap-siaf-md sm:grid-cols-2 xl:grid-cols-4">
              @for (dato of resumen(); track dato.label) {
                <div
                  class="flex flex-col gap-siaf-xxs rounded-siaf-md border border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm"
                  [class]="dato.destacado ? 'bg-[var(--color-palette-turquesa-50)]' : 'bg-[var(--sys-color-bg-surfaces-surface-lowest)]'"
                >
                  <span class="min-h-4 text-[11px] font-medium uppercase tracking-[0.66px] text-[var(--sys-color-text-neutral-low)]">{{ dato.label }}</span>
                  <span class="text-sm font-bold tracking-[-0.02px] text-[var(--sys-color-text-neutral-medium)]">{{ dato.value }}</span>
                  @if (dato.nota) {
                    <span class="text-[11px] text-[var(--sys-color-text-neutral-medium)]">{{ dato.nota }}</span>
                  }
                </div>
              }
            </div>

            <div class="flex flex-col gap-siaf-md">
              <h3 class="m-0 text-sm font-bold uppercase text-text">Constancia(s) de operación bancaria</h3>

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
                      <th class="siaf-table-th">Modalidad</th>
                      <th class="siaf-table-th">Nro de operación</th>
                      <th class="siaf-table-th">Monto (S/)</th>
                      <th class="siaf-table-th">Fecha de pago</th>
                      <th class="siaf-table-th">Hora de pago</th>
                      <th class="siaf-table-th">Estado</th>
                      <th class="siaf-table-th">Fecha de registro</th>
                      <th class="siaf-table-th siaf-table-sticky-cell"><span class="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of visibles(); track c.id) {
                      <tr class="siaf-table-row">
                        <td class="siaf-table-td">{{ c.modalidad }}</td>
                        <td class="siaf-table-td">{{ c.nroOperacion }}</td>
                        <td class="siaf-table-td">S/ {{ monto(c.monto) }}</td>
                        <td class="siaf-table-td">{{ c.fechaPago }}</td>
                        <td class="siaf-table-td">{{ c.horaPago }}</td>
                        <td class="siaf-table-td">
                          <siaf-status-tag appearance="soft" size="small" [tone]="etiqueta(c).tone">{{ etiqueta(c).label }}</siaf-status-tag>
                        </td>
                        <td class="siaf-table-td">{{ c.fechaRegistro }}</td>
                        <td class="siaf-table-td siaf-table-sticky-cell">
                          <div class="flex items-center justify-end gap-siaf-xs">
                            <span siafTooltip="Descargar constancia">
                              <siaf-button variant="text" size="sm" icon="file_download" [iconOnly]="true" [ariaLabel]="'Descargar la constancia ' + c.nroOperacion" (click)="descargar(c)" />
                            </span>
                            <span siafTooltip="Validar operación">
                              <siaf-button
                                variant="text"
                                size="sm"
                                icon="checklist"
                                [iconOnly]="true"
                                [disabled]="d.estado !== 'Verificado'"
                                [ariaLabel]="'Validar la operación ' + c.nroOperacion"
                                (click)="abrirValidacion(c)"
                              />
                            </span>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td class="siaf-table-td text-center text-[var(--sys-color-text-neutral-low)]" colspan="8">No hay constancias que coincidan con la búsqueda.</td>
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
            </div>
          </div>
        </siaf-solicitude-form-card>

        <siaf-action-tracker [showSummaryCards]="true" [showTabs]="false" [summaryItems]="trazabilidad()" />
      </siaf-solicitude-page-layout>

      <siaf-side-nav
        title="Validar pago"
        confirmLabel="Aceptar"
        [width]="520"
        [open]="validando() !== null"
        [confirmDisabled]="!validacionLista()"
        (confirmed)="aceptarValidacion()"
        (canceled)="validando.set(null)"
        (closed)="validando.set(null)"
      >
        @if (validando(); as c) {
          <div class="flex flex-col gap-siaf-lg">
            <dl class="m-0 grid gap-x-siaf-lg gap-y-siaf-md sm:grid-cols-2">
              <div class="flex flex-col gap-siaf-xxs sm:col-span-2">
                <dt class="text-[11px] font-medium uppercase tracking-[0.66px] text-[var(--sys-color-text-neutral-low)]">Modalidad</dt>
                <dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">{{ c.modalidad }}</dd>
              </div>
              <div class="flex flex-col gap-siaf-xxs">
                <dt class="text-[11px] font-medium uppercase tracking-[0.66px] text-[var(--sys-color-text-neutral-low)]">Nro de operación</dt>
                <dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">{{ c.nroOperacion }}</dd>
              </div>
              <div class="flex flex-col gap-siaf-xxs">
                <dt class="text-[11px] font-medium uppercase tracking-[0.66px] text-[var(--sys-color-text-neutral-low)]">Monto (S/)</dt>
                <dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">S/ {{ monto(c.monto) }}</dd>
              </div>
              <div class="flex flex-col gap-siaf-xxs">
                <dt class="text-[11px] font-medium uppercase tracking-[0.66px] text-[var(--sys-color-text-neutral-low)]">Fecha de pago</dt>
                <dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">{{ c.fechaPago }}</dd>
              </div>
              <div class="flex flex-col gap-siaf-xxs">
                <dt class="text-[11px] font-medium uppercase tracking-[0.66px] text-[var(--sys-color-text-neutral-low)]">Hora de pago</dt>
                <dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">{{ c.horaPago }}</dd>
              </div>
            </dl>

            <siaf-radio-group
              label="Resultado de validación"
              name="resultado-validacion"
              [inline]="true"
              [options]="opcionesResultado"
              [value]="resultado()"
              (valueChange)="resultado.set($event)"
            />

            @if (resultado() === 'conforme') {
              <text-area-control placeholder="Comentarios" [maxlength]="200" [value]="comentario()" (valueChange)="comentario.set($event)" />
            } @else if (resultado() === 'no-conforme') {
              <siaf-input label="Tipo de error" type="select" [required]="true" [options]="tiposError" [value]="tipoError()" (valueChange)="tipoError.set($any($event))" />
            }
          </div>
        }
      </siaf-side-nav>

      <siaf-modal
        variant="custom"
        title="¿Aprobar documento?"
        description="El documento será aprobado."
        confirmLabel="Aceptar"
        [showIllustration]="true"
        illustrationSrc="assets/figma/modals/approve.svg"
        [open]="modalAprobar()"
        (confirmed)="aprobar(d.id)"
        (canceled)="modalAprobar.set(false)"
        (closed)="modalAprobar.set(false)"
      />

      <siaf-modal
        variant="observe"
        [open]="modalObservar()"
        [reason]="motivo()"
        reasonLabel="Descripción de la observación"
        [reasonMaxLength]="500"
        [confirmDisabled]="motivo().trim().length === 0"
        (reasonChange)="motivo.set($event)"
        (confirmed)="observar(d.id)"
        (canceled)="modalObservar.set(false)"
        (closed)="modalObservar.set(false)"
      />

      <siaf-snackbar tone="success" [message]="aviso()" [open]="aviso() !== ''" (closed)="aviso.set('')" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AprobacionSubastaDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(RevisionDocumentosStore);
  private readonly usuario = inject(CurrentUserService);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  /** Se lee del almacén en cada cambio: la pantalla refleja lo que valida, aprueba u observa. */
  readonly documento = computed(() => this.store.documentos().find((d) => d.id === this.id));

  readonly opcionesResultado: RadioOption[] = [
    { label: 'Conforme', value: 'conforme' },
    { label: 'No conforme', value: 'no-conforme' },
  ];
  readonly tiposError: TextFieldOption[] = TIPOS_ERROR_VALIDACION.map((t) => ({ label: t, value: t }));

  // Panel «Validar pago»
  readonly validando = signal<ConstanciaRevision | null>(null);
  readonly resultado = signal('');
  readonly comentario = signal('');
  readonly tipoError = signal('');

  readonly modalAprobar = signal(false);
  readonly modalObservar = signal(false);
  readonly motivo = signal('');
  readonly aviso = signal('');

  readonly busqueda = signal('');
  readonly pagina = signal(1);
  readonly filasPorPagina = signal(10);

  readonly esSaldo = computed(() => this.documento()?.tipo === 'saldo');
  readonly titulo = computed(() => {
    const tipo = this.documento()?.tipo;
    return tipo ? NOMBRE_DOCUMENTO[tipo].replace('Pago de Saldo', 'pago de saldo') : '';
  });
  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE, this.titulo()));

  readonly estadoDocumento = computed<FlowStatus>(() => (this.documento()?.estado ?? 'Elaborado') as FlowStatus);
  readonly estadoEncabezado = computed(() => {
    switch (this.documento()?.estado) {
      case 'Aprobado': return 'approved' as const;
      case 'Observado': return 'observed' as const;
      default: return 'verified' as const;
    }
  });

  readonly camposEntidad = computed<SolicitudeInfoField[]>(() => [
    { label: 'Fecha', value: '13/01/2026 07:40:15' },
    { label: 'Ente rector', value: 'MEF - DIRECCIÓN GENERAL DE ABASTECIMIENTO' },
    { label: 'Entidad', value: 'MINISTERIO DE TRANSPORTE Y COMUNICACIONES' },
  ]);

  readonly numerosLote = computed(() =>
    Array.from({ length: this.documento()?.proceso.lotes ?? 0 }, (_, i) => String(i + 1).padStart(3, '0')),
  );

  readonly datosProceso = computed<CollapsibleCardField[]>(() => {
    const p = this.documento()?.proceso;
    if (!p) return [];
    return this.esSaldo()
      ? [
          { label: 'Código del proceso', value: p.codigo },
          { label: 'Descripción', value: p.descripcion },
          { label: 'Lotes adjudicados', value: p.lotes, icon: 'info', iconLabel: 'Detalle de los lotes' },
        ]
      : [
          { label: 'Código del proceso', value: p.codigo },
          { label: 'Etapa', value: p.etapa },
          { label: 'Lotes en los cuales postula', value: p.lotes, icon: 'info', iconLabel: 'Detalle de los lotes' },
        ];
  });

  readonly datosOrden = computed<SummaryCardField[]>(() => {
    const o = this.documento()?.orden;
    if (!o) return [];
    const validado = o.estado === 'validado';
    return [
      { label: 'Nro', value: o.nro },
      {
        label: 'Estado',
        value: validado ? 'Pago validado' : 'Pago en validación',
        tag: validado
          ? { label: 'Pago validado', tone: 'success', appearance: 'outline', icon: 'check_circle' }
          : { label: 'Pago en validación', tone: 'info', appearance: 'outline', icon: 'fact_check' },
      },
      { label: 'Cuenta de ingreso', value: o.cuentaIngreso, icon: 'info', iconLabel: 'Información de la cuenta de ingreso' },
    ];
  });

  private readonly registrado = computed(() => (this.documento()?.constancias ?? []).reduce((suma, c) => suma + c.monto, 0));

  readonly resumen = computed(() => {
    const d = this.documento();
    if (!d) return [];
    const cubierto = this.registrado() >= d.montoRequerido;
    const registrado = { label: 'Monto registrado', value: `S/ ${formatoMonto(this.registrado())}`, destacado: cubierto, nota: '' };
    if (d.adjudicacion) {
      return [
        { label: 'Monto de adjudicación', value: `S/ ${formatoMonto(d.adjudicacion.montoAdjudicacion)}`, destacado: false, nota: '' },
        {
          label: 'Garantía pagada',
          value: `S/ ${formatoMonto(d.adjudicacion.garantiaPagada)}`,
          destacado: false,
          nota: `Garantía aplicada: S/ ${formatoMonto(d.adjudicacion.garantiaAplicada)}`,
        },
        { label: 'Saldo a pagar', value: `S/ ${formatoMonto(d.montoRequerido)}`, destacado: false, nota: '' },
        registrado,
      ];
    }
    return [
      { label: 'Cantidad de bienes muebles', value: String(d.proceso.lotes * 10), destacado: false, nota: '' },
      { label: 'Precio base total (S/)', value: `S/ ${formatoMonto(d.proceso.lotes * 55000)}`, destacado: false, nota: '' },
      { label: 'Garantía requerida (S/)', value: `S/ ${formatoMonto(d.montoRequerido)}`, destacado: false, nota: '' },
      registrado,
    ];
  });

  readonly todasConformes = computed(() => {
    const c = this.documento()?.constancias ?? [];
    return c.length > 0 && c.every((x) => x.estado === 'conforme');
  });
  readonly hayNoConformes = computed(() => (this.documento()?.constancias ?? []).some((x) => x.estado === 'no-conforme'));

  private readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const lista = this.documento()?.constancias ?? [];
    if (!texto) return lista;
    return lista.filter((c) =>
      [c.modalidad, c.nroOperacion, c.fechaPago, ETIQUETA_CONSTANCIA[c.estado].label].some((v) => v.toLowerCase().includes(texto)),
    );
  });
  readonly total = computed(() => this.filtradas().length);
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.filasPorPagina())));
  readonly visibles = computed(() => {
    const inicio = (this.pagina() - 1) * this.filasPorPagina();
    return this.filtradas().slice(inicio, inicio + this.filasPorPagina());
  });

  readonly validacionLista = computed(
    () => this.resultado() === 'conforme' || (this.resultado() === 'no-conforme' && this.tipoError() !== ''),
  );

  readonly trazabilidad = computed<ActionTrackerSummary[]>(() => {
    const aprobado = this.documento()?.aprobadoPor;
    return [
      { label: 'Elaborado por', actionBy: 'RICARDO JOHN DOE BUSTAMANTE', date: '19/08/2026 08:00:59' },
      { label: 'Verificado por', actionBy: 'RICARDO JOHN DOE BUSTAMANTE', date: '19/08/2025 08:00:59' },
      { label: 'Aprobado por', actionBy: aprobado?.usuario ?? '', date: aprobado?.fecha ?? '' },
    ];
  });

  constructor() {
    effect(() => {
      const d = this.documento();
      if (!d || !d.conDetalle) void this.router.navigateByUrl(PROCESS_ROUTE);
    });
  }

  monto(valor: number): string {
    return formatoMonto(valor);
  }

  etiqueta(c: ConstanciaRevision) {
    return ETIQUETA_CONSTANCIA[c.estado];
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

  abrirValidacion(c: ConstanciaRevision): void {
    this.resultado.set(c.estado === 'pendiente' ? '' : c.estado);
    this.comentario.set(c.estado === 'conforme' ? (c.resultado ?? '') : '');
    this.tipoError.set(c.estado === 'no-conforme' ? (c.resultado ?? '') : '');
    this.validando.set(c);
  }

  aceptarValidacion(): void {
    const c = this.validando();
    const d = this.documento();
    if (!c || !d || !this.validacionLista()) return;
    const conforme = this.resultado() === 'conforme';
    this.store.validarConstancia(d.id, c.id, conforme, conforme ? this.comentario().trim() : this.tipoError());
    this.validando.set(null);
  }

  abrirObservar(): void {
    this.motivo.set('');
    this.modalObservar.set(true);
  }

  aprobar(id: string): void {
    const ahora = new Date()
      .toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      .replace(', ', ' ');
    this.store.aprobar(id, this.usuario.name.toUpperCase(), ahora);
    this.modalAprobar.set(false);
    this.aviso.set('El documento fue aprobado con éxito.');
  }

  observar(id: string): void {
    this.store.observar(id, this.motivo().trim());
    this.modalObservar.set(false);
    this.aviso.set('El documento fue observado.');
  }

  /** Sin archivo real en la muestra: baja un texto con los datos de la constancia. */
  descargar(c: ConstanciaRevision): void {
    const texto = `Constancia de muestra\nModalidad: ${c.modalidad}\nNro de operación: ${c.nroOperacion}\nMonto: S/ ${formatoMonto(c.monto)}\nFecha de pago: ${c.fechaPago} ${c.horaPago}\n`;
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `constancia-${c.nroOperacion}.txt`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  volver(): void {
    void this.router.navigateByUrl(PROCESS_ROUTE);
  }
}
