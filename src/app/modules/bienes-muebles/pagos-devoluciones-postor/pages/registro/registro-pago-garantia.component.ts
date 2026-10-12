import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { SolicitudeFormCardComponent } from '../../../../../shared/components/solicitude-form-card/solicitude-form-card.component';
import { SolicitudePageLayoutComponent } from '../../../../../shared/components/solicitude-page-layout/solicitude-page-layout.component';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { CollapsibleCardComponent, CollapsibleCardField } from '../../../../../shared/ui/collapsible-card/collapsible-card.component';
import { DateTimePickerComponent } from '../../../../../shared/ui/date-time-picker/date-time-picker.component';
import { ExpansionPanelComponent } from '../../../../../shared/ui/expansion-panel/expansion-panel.component';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { IconDropdownMenuComponent, IconDropdownMenuItem } from '../../../../../shared/ui/icon-dropdown-menu/icon-dropdown-menu.component';
import { LoadingProgressComponent } from '../../../../../shared/ui/loading-progress/loading-progress.component';
import { ModalComponent } from '../../../../../shared/ui/modal/modal.component';
import { SideNavComponent } from '../../../../../shared/ui/side-nav/side-nav.component';
import { SnackbarComponent } from '../../../../../shared/ui/snackbar/snackbar.component';
import { StatusTagComponent } from '../../../../../shared/ui/status-tag/status-tag.component';
import { SummaryCardComponent, SummaryCardField } from '../../../../../shared/ui/summary-card/summary-card.component';
import { TextFieldComponent } from '../../../../../shared/ui/text-field/text-field.component';
import { UploadedFileCardComponent } from '../../../../../shared/ui/uploaded-file-card/uploaded-file-card.component';
import { UploaderComponent } from '../../../../../shared/ui/uploader/uploader.component';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { PROCESS_ID, PROCESS_ROUTE } from '../../config/pagos-devoluciones-postor.rutas';
import {
  BIENES_POR_LOTE,
  CUENTA_DEVOLUCION_MUESTRA,
  ConstanciaPago,
  ESTADO_ORDEN,
  MODALIDAD_PAGO,
  PRECIO_BASE_POR_LOTE,
  formatoMonto,
  nuevoIdConstancia,
} from '../../models/pago.model';
import { PagosPostorStore } from '../../services/pagos-postor.store';

const CUENTA_INGRESO_MUESTRA = '34534-213213213';
const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

const formatoFecha = (iso: string): string => iso.split('-').reverse().join('/');
const tamano = (bytes: number): string => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/**
 * «Registro de pago de garantía» de una orden de pago: datos del proceso y de la orden, resumen con el monto
 * registrado y su avance, las constancias de operación bancaria y la cuenta de devolución. Mientras la orden está
 * pendiente o vencida el postor agrega, edita y elimina constancias y registra el pago (con confirmación); después de
 * registrarlo la orden queda «Pago en validación» y la pantalla pasa a solo lectura. Todavía sin backend simulado: el
 * cambio vive solo mientras la página no se recarga.
 */
@Component({
  selector: 'siaf-registro-pago-garantia',
  standalone: true,
  imports: [
    SolicitudePageLayoutComponent,
    SolicitudeFormCardComponent,
    CollapsibleCardComponent,
    SummaryCardComponent,
    LoadingProgressComponent,
    AlertComponent,
    ButtonComponent,
    ExpansionPanelComponent,
    IconComponent,
    IconDropdownMenuComponent,
    StatusTagComponent,
    ModalComponent,
    SideNavComponent,
    SnackbarComponent,
    TextFieldComponent,
    DateTimePickerComponent,
    UploaderComponent,
    UploadedFileCardComponent,
  ],
  template: `
    @if (orden(); as o) {
      <div class="min-h-[calc(100vh-56px)] bg-[var(--sys-color-bg-surfaces-surface-lowest)]">
        <siaf-solicitude-page-layout
          [breadcrumbs]="breadcrumbs()"
          heading="Registro de pago de garantía"
          [secondaryText]="'Nro orden de pago: ' + o.orden"
          [showReturn]="true"
          [showTag]="false"
          [customActions]="true"
          (returned)="volver()"
        >
          <ng-container actions>
            @if (!soloLectura()) {
              <siaf-button variant="outline" size="md" icon="close" (click)="volver()">Cancelar</siaf-button>
              <siaf-button variant="accent" size="md" icon="send" [disabled]="constancias().length === 0" (click)="confirmarRegistro.set(true)">Registrar pago</siaf-button>
            }
          </ng-container>

          @if (avisoSoloLectura(); as aviso) {
            <siaf-alert tone="warning" [title]="aviso.titulo" [description]="aviso.texto" />
          }

          <siaf-solicitude-form-card title="Datos del proceso de subasta">
            <siaf-collapsible-card [fields]="datosProceso()" [closable]="false">
              <div class="flex flex-col gap-siaf-md px-siaf-lg py-siaf-md">
                @for (n of numerosLote(); track n) {
                  <div class="flex min-h-12 items-center gap-siaf-xs rounded-siaf-sm border border-[var(--sys-color-divider-strong)] bg-surface px-siaf-md py-siaf-xxs">
                    <siaf-icon class="shrink-0 text-[var(--sys-color-text-neutral-medium)]" name="expand_more" [size]="24" />
                    <p class="m-0 text-sm font-medium text-[var(--sys-color-text-neutral-medium)]">
                      LOTE N°{{ n }} <span class="text-[var(--sys-color-text-neutral-low)]">({{ bienesPorLote }} bienes muebles)</span>
                    </p>
                  </div>
                }
              </div>
            </siaf-collapsible-card>
          </siaf-solicitude-form-card>

          <siaf-solicitude-form-card title="Datos de la orden de pago">
            <siaf-summary-card [fields]="datosOrden()" [bordered]="true" [showIndicator]="true" [showClose]="false" />
          </siaf-solicitude-form-card>

          <siaf-solicitude-form-card title="Resumen del pago de garantía">
            <div class="flex flex-col gap-siaf-lg">
              <div class="grid gap-siaf-md sm:grid-cols-2 xl:grid-cols-4">
                @for (dato of resumen(); track dato.label) {
                  <div class="flex flex-col gap-siaf-xxs rounded-siaf-md border border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm" [class]="dato.fondo">
                    <span class="min-h-4 text-[11px] font-medium uppercase tracking-[0.66px] text-[var(--sys-color-text-neutral-low)]">{{ dato.label }}</span>
                    <span class="text-sm font-bold tracking-[-0.02px] text-[var(--sys-color-text-neutral-medium)]">{{ dato.value }}</span>
                  </div>
                }
              </div>

              @if (!soloLectura()) {
                <div class="flex flex-col gap-siaf-xs">
                  <span class="text-xs text-[var(--sys-color-text-neutral-low)]">Garantía cubierta</span>
                  <div class="flex items-center gap-siaf-md">
                    <siaf-loading-progress class="block min-w-0 flex-1" variant="bar" [value]="porcentaje()" label="Garantía cubierta" />
                    <span class="shrink-0 text-xs text-[var(--sys-color-text-neutral-medium)]" aria-hidden="true">{{ porcentaje() }}%</span>
                  </div>
                  @if (cubierta()) {
                    <p class="m-0 text-xs text-[var(--sys-color-text-neutral-medium)]">
                      El monto registrado cubre la garantía requerida. Las constancias agregadas serán validadas después del registro y se le notificará el resultado.
                    </p>
                  }
                </div>

                @if (constancias().length === 0) {
                  <siaf-alert
                    tone="info"
                    title="Registro de constancias de pago"
                    description="Agregue la constancia de pago de la garantía. Si pagó en varias operaciones, agregue una constancia por cada una; el monto registrado se calculará automáticamente y será validado después del registro."
                  />
                } @else if (!cubierta()) {
                  <siaf-alert
                    tone="warning"
                    title="Garantía incompleta"
                    [description]="'Faltan S/ ' + formato(faltante()) + ' para cubrir la garantía requerida. Si realizó el pago en varias operaciones, agregue las constancias restantes. Si registra con un monto menor al requerido, su registro será observado.'"
                  />
                }
              }

              <div class="flex flex-col gap-siaf-md border-t border-[var(--sys-color-divider-default)] pt-siaf-lg">
                <div class="flex flex-wrap items-center justify-between gap-siaf-md">
                  <h3 class="m-0 text-base font-bold uppercase leading-normal text-[var(--sys-color-text-neutral-high)]">Constancia(s) de operación bancaria</h3>
                  @if (!soloLectura()) {
                    <siaf-button variant="outline" size="md" icon="file_upload" (click)="abrirModal()">Agregar constancia</siaf-button>
                  }
                </div>

                @if (constancias().length === 0) {
                  <p class="m-0 rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-[var(--sys-color-text-neutral-medium)]">
                    No se han adjuntado archivos. Por favor, haga clic en el botón para registrar una constancia.
                  </p>
                } @else {
                  <div class="flex flex-col gap-siaf-sm">
                    @for (c of constancias(); track c.id) {
                      <siaf-collapsible-card [closable]="false">
                        <div card-info class="flex items-center gap-siaf-md">
                          <span class="min-w-0 flex-1 truncate text-sm text-[var(--sys-color-text-neutral-medium)]">
                            N.º de operación: {{ c.nroOperacion }} · {{ c.modalidad.toUpperCase() }}
                          </span>
                          <span class="shrink-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">S/ {{ formato(c.monto) }}</span>
                          <siaf-status-tag appearance="soft" size="small" tone="default">Pendiente de validar</siaf-status-tag>
                          @if (!soloLectura()) {
                            <siaf-icon-dropdown-menu
                              icon="more_vert"
                              [ariaLabel]="'Más opciones de la constancia ' + c.nroOperacion"
                              [items]="menuConstancia"
                              (selected)="accionConstancia($event, c)"
                            />
                          }
                        </div>

                        <div class="flex flex-col gap-siaf-md px-siaf-lg py-siaf-md">
                          <dl class="m-0 grid gap-siaf-md sm:grid-cols-2">
                            <div class="flex flex-col gap-siaf-xxs">
                              <dt class="text-[11px] font-medium uppercase tracking-[0.66px] text-[var(--sys-color-text-neutral-low)]">Fecha de pago</dt>
                              <dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-medium)]">{{ fecha(c.fechaPago) }}</dd>
                            </div>
                            <div class="flex flex-col gap-siaf-xxs">
                              <dt class="text-[11px] font-medium uppercase tracking-[0.66px] text-[var(--sys-color-text-neutral-low)]">Hora de pago</dt>
                              <dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-medium)]">{{ c.horaPago }}</dd>
                            </div>
                          </dl>
                          <div class="flex items-center gap-siaf-xs">
                            <siaf-uploaded-file-card class="min-w-0 flex-1" [file]="archivoDe(c)" [readonly]="true" />
                            @if (c.archivo) {
                              <siaf-button variant="text" size="md" icon="file_download" [iconOnly]="true" [ariaLabel]="'Descargar ' + c.archivoNombre" (click)="descargar(c)" />
                            }
                          </div>
                        </div>
                      </siaf-collapsible-card>
                    }
                  </div>
                }
              </div>
            </div>
          </siaf-solicitude-form-card>

          <siaf-expansion-panel title="Devolución de garantía" [expanded]="true">
            <p class="m-0 text-sm text-[var(--sys-color-text-neutral-medium)]">En caso de corresponder, la devolución se realizará a esta cuenta.</p>
            <dl class="m-0 mt-siaf-md grid gap-x-siaf-lg gap-y-siaf-md sm:grid-cols-2 xl:grid-cols-4">
              @for (dato of cuentaDevolucion; track dato.label) {
                <div class="flex flex-col gap-siaf-xxs">
                  <dt class="text-[11px] font-medium uppercase tracking-[0.66px] text-[var(--sys-color-text-neutral-low)]">{{ dato.label }}</dt>
                  <dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-medium)]">{{ dato.value }}</dd>
                </div>
              }
            </dl>
          </siaf-expansion-panel>
        </siaf-solicitude-page-layout>

        <siaf-side-nav
          title="Registrar pago"
          confirmLabel="Aceptar"
          [width]="520"
          [open]="modalAbierto()"
          [confirmDisabled]="!formularioValido()"
          (confirmed)="aceptarConstancia()"
          (canceled)="cerrarModal()"
          (closed)="cerrarModal()"
        >
          <div class="flex flex-col gap-siaf-md">
            <siaf-input label="Modalidad" [value]="modalidad" [disabled]="true" />
            <div class="grid gap-siaf-md sm:grid-cols-2">
              <siaf-input label="Nro de operación" [required]="true" [value]="nroOperacion()" (valueChange)="nroOperacion.set($any($event))" />
              <siaf-input label="Monto (S/ )" type="decimal" [required]="true" [value]="monto()" (valueChange)="monto.set($any($event))" />
              <siaf-date-time-picker label="Fecha de pago" [required]="true" [fullWidth]="true" [defaultToToday]="false" [value]="fechaPago()" (valueChange)="fechaPago.set($event)" />
              <siaf-input label="Hora de pago" placeholder="hh:mm" [required]="true" [value]="horaPago()" [error]="errorHora()" (valueChange)="horaPago.set($any($event))" />
            </div>
            <p class="m-0 text-sm text-[var(--sys-color-text-neutral-medium)]">Sube un archivo en el formato correcto.</p>
            @if (archivo(); as a) {
              <siaf-uploaded-file-card [file]="a" (replace)="archivo.set(null)" (removed)="archivo.set(null)" />
            } @else {
              <siaf-uploader accept=".jpg,.jpeg,.png,.svg,.pdf" hint="Se permiten archivos de 10 MB como máximo" (fileSelected)="archivo.set($event)" />
            }
            <p class="m-0 text-sm text-[var(--sys-color-text-neutral-medium)]">Solo admite archivos .jpg, .png, .svg y pdf</p>
          </div>
        </siaf-side-nav>

        <siaf-modal
          variant="custom"
          title="¿Registrar pago?"
          description="Las constancias de operación bancaria registradas serán validadas y se le notificará el resultado. Mientras estén en validación, no podrá modificarlas."
          confirmLabel="Aceptar"
          [showIllustration]="true"
          illustrationSrc="assets/figma/modals/verify.svg"
          [open]="confirmarRegistro()"
          (confirmed)="registrar(o.orden)"
          (canceled)="confirmarRegistro.set(false)"
          (closed)="confirmarRegistro.set(false)"
        />

        <siaf-snackbar tone="success" message="Se envió el documento" [open]="avisoEnvio()" (closed)="avisoEnvio.set(false)" />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroPagoGarantiaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(PagosPostorStore);

  readonly bienesPorLote = BIENES_POR_LOTE;
  readonly modalidad = MODALIDAD_PAGO;
  readonly menuConstancia: IconDropdownMenuItem[] = [
    { label: 'Editar constancia', value: 'editar' },
    { label: 'Eliminar constancia', value: 'eliminar' },
  ];
  readonly cuentaDevolucion = [
    { label: 'Titular de la cuenta', value: CUENTA_DEVOLUCION_MUESTRA.titular },
    { label: 'Banco', value: CUENTA_DEVOLUCION_MUESTRA.banco },
    { label: 'Tipo de cuenta', value: CUENTA_DEVOLUCION_MUESTRA.tipoCuenta },
    { label: 'Número de cuenta', value: CUENTA_DEVOLUCION_MUESTRA.numeroCuenta },
    { label: 'CCI (código de cuenta interbancario)', value: CUENTA_DEVOLUCION_MUESTRA.cci },
    { label: 'Moneda', value: CUENTA_DEVOLUCION_MUESTRA.moneda },
  ];

  readonly orden = signal(this.store.obtener(this.route.snapshot.paramMap.get('orden') ?? ''));
  readonly constancias = signal<ConstanciaPago[]>(this.orden()?.constancias ?? []);
  /** Se puede modificar solo mientras la orden esté pendiente o vencida. */
  readonly soloLectura = computed(() => {
    const estado = this.orden()?.estado;
    return estado !== 'pendiente' && estado !== 'vencido';
  });

  // Panel lateral «Registrar pago»
  readonly modalAbierto = signal(false);
  private readonly editandoId = signal<string | null>(null);
  readonly nroOperacion = signal('');
  readonly monto = signal<string | number>('');
  readonly fechaPago = signal('');
  readonly horaPago = signal('');
  readonly archivo = signal<File | { name: string; size?: number } | null>(null);

  readonly confirmarRegistro = signal(false);
  readonly avisoEnvio = signal(false);

  readonly breadcrumbs = computed(() => buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE, 'Registro de pago de garantía'));
  readonly numerosLote = computed(() => Array.from({ length: this.orden()?.lotes ?? 0 }, (_, i) => String(i + 1).padStart(3, '0')));

  readonly requerido = computed(() => this.orden()?.monto ?? 0);
  readonly registrado = computed(() => this.constancias().reduce((suma, c) => suma + c.monto, 0));
  readonly cubierta = computed(() => this.requerido() > 0 && this.registrado() >= this.requerido());
  readonly faltante = computed(() => Math.max(0, this.requerido() - this.registrado()));
  readonly porcentaje = computed(() =>
    this.requerido() > 0 ? Math.min(100, Math.round((this.registrado() / this.requerido()) * 100)) : 0,
  );

  readonly datosProceso = computed<CollapsibleCardField[]>(() => [
    { label: 'Código del proceso', value: this.orden()?.proceso ?? '—' },
    { label: 'Etapa', value: 'CONVOCATORIA Y HABILITACIÓN DE POSTORES' },
    { label: 'Lotes en los cuales postula', value: this.orden()?.lotes ?? 0, icon: 'info', iconLabel: 'Detalle de los lotes' },
  ]);

  readonly datosOrden = computed<SummaryCardField[]>(() => {
    const estado = ESTADO_ORDEN[this.orden()?.estado ?? 'pendiente'];
    return [
      { label: 'Nro', value: this.orden()?.orden ?? '—' },
      { label: 'Estado', value: estado.label, tag: { label: estado.label, tone: estado.tone, icon: estado.icon } },
      { label: 'Cuenta de ingreso', value: CUENTA_INGRESO_MUESTRA, icon: 'info', iconLabel: 'Información de la cuenta de ingreso' },
    ];
  });

  readonly resumen = computed(() => {
    const lotes = this.orden()?.lotes ?? 0;
    const fondoRegistrado =
      this.registrado() === 0
        ? 'bg-[var(--sys-color-bg-surfaces-surface-lowest)]'
        : this.cubierta()
          ? 'bg-[var(--color-palette-turquesa-50)]'
          : 'bg-[var(--sys-color-bg-feedback-light-danger)]';
    const neutro = 'bg-[var(--sys-color-bg-surfaces-surface-lowest)]';
    return [
      { label: 'Cantidad de bienes muebles', value: String(lotes * BIENES_POR_LOTE), fondo: neutro },
      { label: 'Precio base total', value: `S/ ${formatoMonto(lotes * PRECIO_BASE_POR_LOTE)}`, fondo: neutro },
      { label: 'Garantía requerida', value: `S/ ${formatoMonto(this.requerido())}`, fondo: neutro },
      { label: 'Monto registrado', value: `S/ ${formatoMonto(this.registrado())}`, fondo: fondoRegistrado },
    ];
  });

  /** Aviso de la orden ya enviada: si el monto cubre la garantía o si será observada. */
  readonly avisoSoloLectura = computed(() => {
    const estado = this.orden()?.estado;
    if (estado !== 'validacion' || this.constancias().length === 0) return null;
    return this.cubierta()
      ? {
          titulo: 'Pago en validación',
          texto: 'El monto registrado cubre la garantía requerida. Sus constancias están en validación y se le notificará el resultado.',
        }
      : {
          titulo: 'Garantía incompleta',
          texto:
            'El monto registrado no cubre la garantía requerida y las constancias están pendientes de validación. Una vez que se observe el registro, realice el pago de la diferencia y adjunte una nueva constancia dentro del plazo establecido en las bases de la subasta pública electrónica.',
        };
  });

  readonly errorHora = computed(() => (this.horaPago() && !HORA_VALIDA.test(this.horaPago().trim()) ? 'Use el formato hh:mm (24 horas).' : ''));
  readonly formularioValido = computed(() => {
    const monto = Number(this.monto());
    return (
      this.nroOperacion().trim().length > 0 &&
      Number.isFinite(monto) && monto > 0 &&
      this.fechaPago().length > 0 &&
      HORA_VALIDA.test(this.horaPago().trim()) &&
      this.archivo() !== null
    );
  });

  constructor() {
    effect(() => {
      if (!this.orden()) void this.router.navigateByUrl(PROCESS_ROUTE);
    });
  }

  formato(monto: number): string {
    return formatoMonto(monto);
  }

  fecha(iso: string): string {
    return formatoFecha(iso);
  }

  archivoDe(c: ConstanciaPago): File | { name: string; size?: number } {
    return c.archivo ?? { name: c.archivoNombre };
  }

  abrirModal(c?: ConstanciaPago): void {
    this.editandoId.set(c?.id ?? null);
    this.nroOperacion.set(c?.nroOperacion ?? '');
    this.monto.set(c ? c.monto : '');
    this.fechaPago.set(c?.fechaPago ?? '');
    this.horaPago.set(c?.horaPago ?? '');
    this.archivo.set(c ? (c.archivo ?? { name: c.archivoNombre }) : null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  aceptarConstancia(): void {
    const archivo = this.archivo();
    if (!this.formularioValido() || !archivo) return;
    const id = this.editandoId() ?? nuevoIdConstancia();
    const constancia: ConstanciaPago = {
      id,
      modalidad: MODALIDAD_PAGO,
      nroOperacion: this.nroOperacion().trim(),
      monto: Number(this.monto()),
      fechaPago: this.fechaPago(),
      horaPago: this.horaPago().trim(),
      archivoNombre: archivo.name,
      archivoTamano: archivo.size ? tamano(archivo.size) : '',
      archivo: archivo instanceof File ? archivo : undefined,
    };
    this.constancias.update((lista) =>
      this.editandoId() ? lista.map((c) => (c.id === id ? constancia : c)) : [...lista, constancia],
    );
    this.modalAbierto.set(false);
  }

  accionConstancia(accion: string, c: ConstanciaPago): void {
    if (accion === 'editar') this.abrirModal(c);
    if (accion === 'eliminar') this.constancias.update((lista) => lista.filter((x) => x.id !== c.id));
  }

  descargar(c: ConstanciaPago): void {
    if (!c.archivo) return;
    const url = URL.createObjectURL(c.archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = c.archivoNombre;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  registrar(orden: string): void {
    this.confirmarRegistro.set(false);
    this.store.registrarPago(orden, this.constancias());
    this.orden.set(this.store.obtener(orden));
    this.avisoEnvio.set(true);
  }

  volver(): void {
    void this.router.navigateByUrl(PROCESS_ROUTE);
  }
}
