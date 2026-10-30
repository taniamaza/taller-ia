import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import type { BreadcrumbItem } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import { TableControlsComponent } from '../../../../../shared/components/table-controls/table-controls.component';
import { RequestApprovalModalsComponent } from '../../../../../shared/components/request-approval-modals/request-approval-modals.component';
import { SelectionColumn, SelectionSideNavComponent } from '../../../../../shared/components/selection-side-nav/selection-side-nav.component';
import { SolicitudeFormCardComponent } from '../../../../../shared/components/solicitude-form-card/solicitude-form-card.component';
import { SolicitudeInfoCardComponent, SolicitudeInfoField } from '../../../../../shared/components/solicitude-info-card/solicitude-info-card.component';
import type { SolicitudeHeaderState } from '../../../../../shared/components/solicitude-header/solicitude-header.component';
import { SolicitudePageLayoutComponent } from '../../../../../shared/components/solicitude-page-layout/solicitude-page-layout.component';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { ActionTrackerComponent, ActionTrackerSummary } from '../../../../../shared/ui/action-tracker/action-tracker.component';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../../../shared/ui/checkbox/checkbox.component';
import { DocumentSummaryCardComponent } from '../../../../../shared/ui/document-summary-card/document-summary-card.component';
import type { FlowStatus } from '../../../../../shared/ui/flow-status-tag/flow-status-tag.component';
import { RadioComponent } from '../../../../../shared/ui/radio/radio.component';
import { SideNavComponent } from '../../../../../shared/ui/side-nav/side-nav.component';
import { SwitchComponent } from '../../../../../shared/ui/switch/switch.component';
import { SnackbarComponent } from '../../../../../shared/ui/snackbar/snackbar.component';
import { SummaryCardComponent, SummaryCardField } from '../../../../../shared/ui/summary-card/summary-card.component';
import { TextFieldComponent } from '../../../../../shared/ui/text-field/text-field.component';
import { TooltipDirective } from '../../../../../shared/ui/tooltip/tooltip.directive';
import { PROCESS_ID, PROCESS_ROUTE } from '../../config/extraccion-bienes.rutas';
import {
  ENTE_RECTOR,
  NOMBRE_DOCUMENTO,
  ETIQUETA_METODO,
  MetodoExtraccion,
  OPCIONES_METODO,
  OPCIONES_CARTONIZACION,
  OPERARIOS_MUESTRA,
  PEDIDOS_MUESTRA,
  POLITICAS_INVENTARIO,
  PedidoExtraccion,
  etiquetaLpn,
  formatoNumero,
} from '../../models/extraccion.model';
import { ExtraccionStore } from '../../services/extraccion.store';

interface Paginacion {
  pagina: number;
  filas: number;
}

const PAGINACION_INICIAL: Paginacion = { pagina: 1, filas: 10 };

/**
 * Solicitud de Extracción de bienes (creación): el responsable de logística elige los pedidos a extraer, define el
 * método de extracción y asigna operarios. El resumen y el aviso de abajo dicen qué falta para grabar; al grabar se
 * generan las listas de extracción por operario. Con datos de muestra y sin backend: la solicitud vive en
 * `ExtraccionStore` mientras la página no se recargue.
 */
@Component({
  selector: 'siaf-solicitud-extraccion',
  standalone: true,
  imports: [
    SolicitudePageLayoutComponent,
    SolicitudeInfoCardComponent,
    SolicitudeFormCardComponent,
    DocumentSummaryCardComponent,
    SummaryCardComponent,
    SelectionSideNavComponent,
    PaginationComponent,
    TableControlsComponent,
    ButtonComponent,
    CheckboxComponent,
    RadioComponent,
    TextFieldComponent,
    AlertComponent,
    ActionTrackerComponent,
    SideNavComponent,
    RequestApprovalModalsComponent,
    SnackbarComponent,
    SwitchComponent,
    TooltipDirective,
  ],
  template: `
    <div class="min-h-[calc(100vh-56px)] bg-[var(--sys-color-bg-surfaces-surface-lowest)] text-text">
      <siaf-solicitude-page-layout
        [breadcrumbs]="breadcrumbs()"
        role="creator"
        [state]="estadoEncabezado()"
        heading="Extracción de bienes"
        [secondaryText]="soloLectura() ? 'Consulta' : 'Creación'"
        [showReturn]="true"
        [saveDisabled]="!puedeGrabar()"
        [verifyDisabled]="!guardada()"
        (returned)="regresar()"
        (canceled)="regresar()"
        (saved)="modalGrabar.set(true)"
        (edited)="editando.set(true)"
        (verified)="modalVerificar.set(true)"
        (deleted)="modalEliminar.set(true)"
      >
        @if (guardada()) {
          <section class="grid gap-siaf-md lg:grid-cols-[1fr_360px]">
            <siaf-solicitude-info-card [fields]="camposEntidad()" />
            <siaf-document-summary-card [documentNumber]="numero()" [status]="estadoDocumento()" />
          </section>
        } @else {
          <siaf-solicitude-info-card [fields]="camposEntidad()" [captureOpenDate]="true" />
        }

        @if (soloLectura()) {
          <!-- ── Consulta: resumen, pedidos, listas de extracción, LPN y trazabilidad ── -->
          <siaf-solicitude-form-card title="Resumen de extracción">
            <siaf-summary-card [fields]="camposConsulta()" [maxPerRow]="6" [bordered]="true" [showIndicator]="true" [showClose]="false" />
          </siaf-solicitude-form-card>

          <siaf-solicitude-form-card title="Pedidos extraídos">
            <div class="siaf-table-shell">
              <table class="siaf-table">
                <thead>
                  <tr class="siaf-table-head-row">
                    <th class="siaf-table-th">Código de pedido</th>
                    <th class="siaf-table-th">Tipo</th>
                    <th class="siaf-table-th">Prioridad</th>
                    <th class="siaf-table-th">Destino</th>
                    <th class="siaf-table-th text-right">Bienes</th>
                    <th class="siaf-table-th">Volumen</th>
                    <th class="siaf-table-th">Fecha</th>
                    <th class="siaf-table-th siaf-table-sticky-cell"><span class="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of pedidos(); track p.codigo) {
                    <tr class="siaf-table-row">
                      <td class="siaf-table-td">{{ p.codigo }}</td>
                      <td class="siaf-table-td">{{ p.tipo }}</td>
                      <td class="siaf-table-td">{{ p.prioridad }}</td>
                      <td class="siaf-table-td">{{ destino(p) }}</td>
                      <td class="siaf-table-td text-right">{{ p.bienes }}</td>
                      <td class="siaf-table-td">{{ numero2(p.volumen) }} m³</td>
                      <td class="siaf-table-td">{{ p.fecha }}</td>
                      <td class="siaf-table-td siaf-table-sticky-cell">
                        <span siafTooltip="Ver detalle del pedido">
                          <siaf-button variant="text" size="sm" icon="visibility" [iconOnly]="true" [ariaLabel]="'Ver el pedido ' + p.codigo" (click)="detallePedido.set(p)" />
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </siaf-solicitude-form-card>

          <siaf-solicitude-form-card title="Listas de extracción por operario">
            <span card-actions>
              <siaf-button variant="outline" size="md" icon="file_download" (click)="descargarListas()">Descargar todas</siaf-button>
            </span>
            <div class="siaf-table-shell">
              <table class="siaf-table">
                <thead>
                  <tr class="siaf-table-head-row">
                    <th class="siaf-table-th">Código</th>
                    <th class="siaf-table-th">Operario</th>
                    <th class="siaf-table-th">Lista de extracción (LE)</th>
                    <th class="siaf-table-th">Pedidos / bienes asignados</th>
                    <th class="siaf-table-th">Observación</th>
                    <th class="siaf-table-th siaf-table-sticky-cell"><span class="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (l of listas(); track l.operario.codigo) {
                    <tr class="siaf-table-row">
                      <td class="siaf-table-td">{{ l.operario.codigo }}</td>
                      <td class="siaf-table-td">{{ l.operario.nombre }}</td>
                      <td class="siaf-table-td font-bold">{{ l.le }}</td>
                      <td class="siaf-table-td">{{ asignacionPrevista(l.operario.codigo) }}</td>
                      <td class="siaf-table-td">—</td>
                      <td class="siaf-table-td siaf-table-sticky-cell">
                        <span siafTooltip="Descargar lista de extracción">
                          <siaf-button variant="text" size="sm" icon="file_download" [iconOnly]="true" [ariaLabel]="'Descargar la lista ' + l.le" (click)="descargarListas(l.operario.codigo)" />
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </siaf-solicitude-form-card>

          @if (lpnGenerados().length > 0) {
            <siaf-solicitude-form-card title="LPN generados">
              <span card-actions>
                <siaf-button variant="outline" size="md" icon="file_download" (click)="descargarLpn()">Descargar todos</siaf-button>
              </span>
              <div class="siaf-table-shell">
                <table class="siaf-table">
                  <thead>
                    <tr class="siaf-table-head-row">
                      <th class="siaf-table-th">Código LPN</th>
                      <th class="siaf-table-th">Tipo</th>
                      <th class="siaf-table-th text-right">Bienes</th>
                      <th class="siaf-table-th">Lista de extracción (LE)</th>
                      <th class="siaf-table-th siaf-table-sticky-cell"><span class="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (l of lpnGenerados(); track l.codigo) {
                      <tr class="siaf-table-row">
                        <td class="siaf-table-td">{{ l.codigo }}</td>
                        <td class="siaf-table-td">{{ l.tipo }}</td>
                        <td class="siaf-table-td text-right">{{ l.bienes }}</td>
                        <td class="siaf-table-td">{{ l.le }}</td>
                        <td class="siaf-table-td siaf-table-sticky-cell">
                          <span siafTooltip="Descargar LPN">
                            <siaf-button variant="text" size="sm" icon="file_download" [iconOnly]="true" [ariaLabel]="'Descargar el ' + l.codigo" (click)="descargarLpn(l.codigo)" />
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </siaf-solicitude-form-card>
          }

          <siaf-action-tracker [showSummaryCards]="true" [showTabs]="false" [summaryItems]="trazabilidad()" />
        } @else {
        <!-- ── Pedidos a extraer ── -->
        <siaf-solicitude-form-card title="Pedidos a extraer">
          @if (!soloLectura()) {
            <span card-actions>
              @if (pedidos().length === 0) {
                <siaf-button variant="accent" size="md" icon="search" [iconOnly]="true" ariaLabel="Seleccionar pedidos" (click)="abrirPanelPedidos()" />
              } @else {
                <siaf-button variant="filled" size="md" icon="add" [iconOnly]="true" ariaLabel="Agregar pedidos" (click)="abrirPanelPedidos()" />
              }
            </span>
          }

          @if (pedidos().length === 0) {
            <div class="flex min-h-[49px] items-center rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm">
              <p class="m-0 text-sm text-[var(--sys-color-text-neutral-medium)]">No se ha seleccionado ningún pedido. Haga clic en el botón para realizar una selección.</p>
            </div>
          } @else {
            <siaf-table-controls
              selectAllLabel="Seleccionar todos los pedidos"
              deleteLabel="Quitar pedidos seleccionados"
              [showSelection]="!soloLectura()"
              [showDeleteAction]="true"
              [checked]="todosMarcados()"
              [indeterminate]="marcados().length > 0 && !todosMarcados()"
              [selectedCount]="marcados().length"
              [page]="pagPedidos().pagina"
              [pageSize]="pagPedidos().filas"
              [totalItems]="pedidos().length"
              [totalPages]="totalPaginas(pedidos().length, pagPedidos().filas)"
              (selectionChange)="marcarTodos($event)"
              (delete)="quitarMarcados()"
              (previous)="irA(pagPedidos, -1, pedidos().length)"
              (next)="irA(pagPedidos, 1, pedidos().length)"
            />

            <div class="siaf-table-shell">
              <table class="siaf-table">
                <thead>
                  <tr class="siaf-table-head-row">
                    <th class="siaf-table-th w-12"></th>
                    <th class="siaf-table-th">Código de pedido</th>
                    <th class="siaf-table-th">Tipo</th>
                    <th class="siaf-table-th">Prioridad</th>
                    <th class="siaf-table-th">Destino</th>
                    <th class="siaf-table-th text-right">Bienes</th>
                    <th class="siaf-table-th">Volumen</th>
                    <th class="siaf-table-th">Fecha</th>
                    <th class="siaf-table-th siaf-table-sticky-cell"><span class="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of paginaPedidos(); track p.codigo) {
                    <tr class="siaf-table-row">
                      <td class="siaf-table-td">
                        @if (!soloLectura()) {
                          <siaf-checkbox class="[&_label>span]:sr-only" [label]="'Seleccionar ' + p.codigo" [checked]="marcados().includes(p.codigo)" (checkedChange)="marcar(p.codigo, $event)" />
                        }
                      </td>
                      <td class="siaf-table-td">{{ p.codigo }}</td>
                      <td class="siaf-table-td">{{ p.tipo }}</td>
                      <td class="siaf-table-td">{{ p.prioridad }}</td>
                      <td class="siaf-table-td">{{ destino(p) }}</td>
                      <td class="siaf-table-td text-right">{{ p.bienes }}</td>
                      <td class="siaf-table-td">{{ numero2(p.volumen) }} m³</td>
                      <td class="siaf-table-td">{{ p.fecha }}</td>
                      <td class="siaf-table-td siaf-table-sticky-cell">
                        <span siafTooltip="Ver detalle del pedido">
                          <siaf-button variant="text" size="sm" icon="visibility" [iconOnly]="true" [ariaLabel]="'Ver el pedido ' + p.codigo" (click)="detallePedido.set(p)" />
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <siaf-pagination
              position="Bottom"
              [rowPage]="true"
              [page]="pagPedidos().pagina"
              [pageSize]="pagPedidos().filas"
              [rowsPerPage]="pagPedidos().filas"
              [totalItems]="pedidos().length"
              [totalPages]="totalPaginas(pedidos().length, pagPedidos().filas)"
              (previous)="irA(pagPedidos, -1, pedidos().length)"
              (next)="irA(pagPedidos, 1, pedidos().length)"
              (rowsPerPageChange)="cambiarFilas(pagPedidos, $event)"
            />
          }
        </siaf-solicitude-form-card>

        <!-- ── Método de extracción ── -->
        <siaf-solicitude-form-card title="Método de extracción" titleInfo="El método define cómo se reparten los pedidos entre los operarios.">
          @if (pedidos().length === 0) {
            <div class="flex min-h-[49px] items-center rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm">
              <p class="m-0 text-sm text-[var(--sys-color-text-neutral-medium)]">Seleccione al menos un pedido para configurar el método de extracción.</p>
            </div>
          } @else {
            <div class="flex flex-col gap-siaf-md">
              <siaf-radio-group
                label="Método"
                name="metodo-extraccion"
                [inline]="true"
                [required]="true"
                [disabled]="soloLectura()"
                [options]="opcionesMetodo"
                [value]="metodo()"
                (valueChange)="metodo.set($any($event))"
              />
              <div class="grid gap-x-siaf-xl gap-y-siaf-md md:grid-cols-3">
                <siaf-input
                  label="Política de inventario"
                  type="select"
                  placeholder="Seleccione la política"
                  [required]="true"
                  [disabled]="soloLectura()"
                  [options]="politicas"
                  [value]="politica()"
                  (valueChange)="politica.set($any($event))"
                />
<siaf-input
                  label="Cartonización"
                  type="select"
                  placeholder="Seleccione"
                  [required]="true"
                  [disabled]="soloLectura()"
                  [options]="opcionesCartonizacion"
                  [value]="cartonizacion()"
                  (valueChange)="cartonizacion.set($any($event))"
                />
<siaf-input
                  label="LPN"
                  type="select"
                  [disabled]="true"
                  [options]="opcionesLpn()"
                  [value]="lpn()"
                />
              </div>
            </div>
          }
        </siaf-solicitude-form-card>

        <!-- ── Operarios y listas de extracción ── -->
        <siaf-solicitude-form-card title="Operarios y listas de extracción">
          @if (!metodo()) {
            <div class="flex min-h-[49px] items-center rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm">
              <p class="m-0 text-sm text-[var(--sys-color-text-neutral-medium)]">Elija el método de extracción para asignar operarios. Aquí se mostrará la distribución prevista antes de grabar.</p>
            </div>
          } @else {
            <div class="flex items-center justify-between gap-siaf-md">
              <div class="flex items-center gap-siaf-md">
                @if (!soloLectura()) {
                  <siaf-switch label="Asignar a todos" [checked]="todosAsignados()" (checkedChange)="asignarTodos($event)" />
                }
                <span class="text-sm text-[var(--sys-color-text-neutral-low)]">· {{ operariosAsignados().length }} asignado{{ operariosAsignados().length === 1 ? '' : 's' }} de {{ operarios.length }}</span>
              </div>
              <div class="flex items-center gap-siaf-md">
                <siaf-pagination
                  position="Top"
                  [page]="pagOperarios().pagina"
                  [pageSize]="pagOperarios().filas"
                  [totalItems]="operarios.length"
                  [totalPages]="totalPaginas(operarios.length, pagOperarios().filas)"
                  (previous)="irA(pagOperarios, -1, operarios.length)"
                  (next)="irA(pagOperarios, 1, operarios.length)"
                />
              </div>
            </div>

            <div class="siaf-table-shell">
              <table class="siaf-table">
                <thead>
                  <tr class="siaf-table-head-row">
                    <th class="siaf-table-th">Asignar</th>
                    <th class="siaf-table-th">Código</th>
                    <th class="siaf-table-th">Operario</th>
                    <th class="siaf-table-th">Zona</th>
                    @if (soloLectura()) {
                      <th class="siaf-table-th">Asignación prevista</th>
                      <th class="siaf-table-th">Lista de extracción (LE)</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (o of paginaOperarios(); track o.codigo) {
                    @let asignado = operariosAsignados().includes(o.codigo);
                    <tr class="siaf-table-row" [class.bg-[var(--sys-color-bg-surfaces-surface-low)]]="asignado">
                      <td class="siaf-table-td">
                        <siaf-switch
                          [ariaLabel]="'Asignar a ' + o.nombre"
                          [checked]="asignado"
                          [disabled]="soloLectura()"
                          (checkedChange)="alternarOperario(o.codigo)"
                        />
                      </td>
                      <td class="siaf-table-td">{{ o.codigo }}</td>
                      <td class="siaf-table-td">{{ o.nombre }}</td>
                      <td class="siaf-table-td">—</td>
                      @if (soloLectura()) {
                        <td class="siaf-table-td">{{ asignacionPrevista(o.codigo) }}</td>
                        <td class="siaf-table-td text-[var(--sys-color-text-neutral-low)]">{{ asignado ? 'Generada' : '—' }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <siaf-pagination
              position="Bottom"
              [rowPage]="true"
              [page]="pagOperarios().pagina"
              [pageSize]="pagOperarios().filas"
              [rowsPerPage]="pagOperarios().filas"
              [totalItems]="operarios.length"
              [totalPages]="totalPaginas(operarios.length, pagOperarios().filas)"
              (previous)="irA(pagOperarios, -1, operarios.length)"
              (next)="irA(pagOperarios, 1, operarios.length)"
              (rowsPerPageChange)="cambiarFilas(pagOperarios, $event)"
            />
          }
        </siaf-solicitude-form-card>

        <!-- ── Resumen de extracción ── -->
        <siaf-solicitude-form-card title="Resumen de extracción">
          <siaf-summary-card [fields]="camposResumen()" [maxPerRow]="6" [bordered]="true" [showIndicator]="true" [showClose]="false" />
          @if (faltantes().length === 0) {
            <siaf-alert tone="success" title="Información completa" description="Al grabar se generan las listas de extracción por operario." />
          } @else {
            <siaf-alert tone="info" title="Información pendiente para grabar" [description]="'Complete: ' + faltantes().join(', ') + '.'" />
          }
        </siaf-solicitude-form-card>
        }
      </siaf-solicitude-page-layout>

      <!-- Panel «Seleccionar pedidos» -->
      <siaf-selection-side-nav
        title="Seleccionar pedidos"
        mode="multiple"
        idKey="codigo"
        [open]="panelPedidos()"
        [rows]="pedidosFiltrados()"
        [columns]="columnasPedidos"
        [searchValue]="busquedaPedidos()"
        [selectedIds]="seleccionPanel()"
        [showSelectAll]="true"
        [selectAllChecked]="seleccionPanel().length === pedidosFiltrados().length && pedidosFiltrados().length > 0"
        [selectAllIndeterminate]="seleccionPanel().length > 0 && seleccionPanel().length < pedidosFiltrados().length"
        [paginated]="true"
        [showTopPagination]="true"
        [totalItems]="pedidosFiltrados().length"
        (searchChange)="busquedaPedidos.set($event)"
        (selectionChange)="seleccionPanel.set($event)"
        (selectAllChange)="seleccionarTodosPanel($event)"
        (accepted)="aceptarPedidos($event)"
        (closed)="panelPedidos.set(false)"
      />

      <!-- Panel «Detalle del pedido» -->
      <siaf-side-nav title="Detalle del pedido" [open]="detallePedido() !== null" [showFooter]="false" (closed)="detallePedido.set(null)">
        @if (detallePedido(); as p) {
          <siaf-summary-card [fields]="camposDetalle(p)" [bordered]="true" [showIndicator]="true" [showClose]="false" />
        }
      </siaf-side-nav>

      <siaf-request-approval-modals
        [saveOpen]="modalGrabar()"
        [verifyOpen]="modalVerificar()"
        [deleteOpen]="modalEliminar()"
        [requestType]="nombreDocumento"
        [requestNumber]="numero()"
        (saveConfirmed)="grabar()"
        (verifyConfirmed)="verificar()"
        (deleteConfirmed)="eliminar()"
        (saveClosed)="modalGrabar.set(false)"
        (verifyClosed)="modalVerificar.set(false)"
        (deleteClosed)="modalEliminar.set(false)"
      />
      <siaf-snackbar tone="success" [message]="aviso()" [open]="aviso() !== ''" (closed)="aviso.set('')" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitudExtraccionComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(ExtraccionStore);

  readonly nombreDocumento = NOMBRE_DOCUMENTO;
  readonly operarios = OPERARIOS_MUESTRA;
  readonly opcionesMetodo = OPCIONES_METODO;
  readonly opcionesCartonizacion = OPCIONES_CARTONIZACION;
  readonly politicas = POLITICAS_INVENTARIO;
  readonly columnasPedidos: SelectionColumn<Record<string, unknown>>[] = [
    { key: 'codigo', label: 'Código de pedido', widthClass: 'w-[170px]' },
    { key: 'tipo', label: 'Tipo', widthClass: 'w-[110px]' },
    { key: 'prioridad', label: 'Prioridad', widthClass: 'w-[100px]' },
    { key: 'destino', label: 'Destino', widthClass: 'w-[110px]' },
    { key: 'bienes', label: 'Bienes', widthClass: 'w-[70px]', cellClass: 'text-right' },
    { key: 'fecha', label: 'Fecha', widthClass: 'w-[110px]' },
  ];

  /** Id de la solicitud abierta (ruta `:id`); sin él, se está creando una nueva. */
  readonly id = signal(this.route.snapshot.paramMap.get('id') ?? '');
  readonly editando = signal(false);

  // Formulario
  readonly pedidos = signal<PedidoExtraccion[]>([]);
  readonly marcados = signal<string[]>([]);
  readonly metodo = signal<MetodoExtraccion | ''>('');
  readonly politica = signal('');
  readonly cartonizacion = signal('');
  readonly operariosAsignados = signal<string[]>([]);

  // Paneles, modales y paginación
  readonly panelPedidos = signal(false);
  readonly seleccionPanel = signal<string[]>([]);
  readonly busquedaPedidos = signal('');
  readonly detallePedido = signal<PedidoExtraccion | null>(null);
  readonly modalGrabar = signal(false);
  readonly modalVerificar = signal(false);
  readonly modalEliminar = signal(false);
  readonly aviso = signal('');
  readonly pagPedidos = signal<Paginacion>({ ...PAGINACION_INICIAL });
  readonly pagOperarios = signal<Paginacion>({ ...PAGINACION_INICIAL });

  readonly guardada = computed(() => this.id() !== '' && this.store.obtener(this.id()) !== undefined);
  readonly numero = computed(() => this.store.obtener(this.id())?.numero ?? '');
  readonly soloLectura = computed(() => this.guardada() && !this.editando());
  readonly estadoDocumento = computed<FlowStatus>(() => (this.store.obtener(this.id())?.estado ?? 'Elaborado') as FlowStatus);
  readonly estadoEncabezado = computed<SolicitudeHeaderState>(() => {
    if (!this.guardada()) return 'new';
    if (this.editando()) return 'edit';
    return this.store.obtener(this.id())?.estado === 'Verificado' ? 'verified' : 'elaborated';
  });
  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE, 'Extracción de bienes'));

  readonly camposEntidad = computed<SolicitudeInfoField[]>(() => [
    { label: 'Fecha', value: this.store.obtener(this.id())?.fecha ?? '' },
    { label: 'Ente rector', value: ENTE_RECTOR },
  ]);

  readonly pedidosFiltrados = computed(() => {
    const texto = this.busquedaPedidos().trim().toLowerCase();
    return PEDIDOS_MUESTRA.filter((p) => !texto || [p.codigo, p.tipo, p.prioridad].some((v) => v.toLowerCase().includes(texto))).map((p) => ({
      ...p,
      destino: this.destino(p),
    })) as unknown as Record<string, unknown>[];
  });

  readonly paginaPedidos = computed(() => this.cortar(this.pedidos(), this.pagPedidos()));
  readonly paginaOperarios = computed(() => this.cortar(this.operarios, this.pagOperarios()));
  readonly todosMarcados = computed(() => this.pedidos().length > 0 && this.marcados().length === this.pedidos().length);

  private readonly totales = computed(() => {
    const p = this.pedidos();
    return {
      pedidos: p.length,
      bienes: p.reduce((s, x) => s + x.bienes, 0),
      volumen: p.reduce((s, x) => s + x.volumen, 0),
      peso: p.reduce((s, x) => s + x.peso, 0),
    };
  });

  /** Reparto previsto: los pedidos se distribuyen por turnos entre los operarios asignados. */
  private readonly reparto = computed(() => {
    const asignados = this.operarios.filter((o) => this.operariosAsignados().includes(o.codigo));
    const mapa = new Map<string, PedidoExtraccion[]>();
    asignados.forEach((o) => mapa.set(o.codigo, []));
    if (asignados.length === 0) return mapa;
    this.pedidos().forEach((p, i) => mapa.get(asignados[i % asignados.length].codigo)!.push(p));
    return mapa;
  });

  /** El LPN no se elige: depende de la cartonización (sin cartonización, LPN ciegos; con cartonización, LPN generados). */
  readonly lpn = computed(() => etiquetaLpn(this.cartonizacion()));
  readonly opcionesLpn = computed(() => (this.lpn() ? [{ label: this.lpn(), value: this.lpn() }] : []));

  readonly faltantes = computed(() => {
    const falta: string[] = [];
    if (this.pedidos().length === 0) falta.push('pedidos');
    if (!this.metodo()) falta.push('método de extracción');
    if (!this.politica()) falta.push('política de inventario');
    if (!this.cartonizacion()) falta.push('cartonización');
    if (!this.lpn()) falta.push('LPN');
    if (this.operariosAsignados().length === 0) falta.push('operarios');
    return falta;
  });
  readonly puedeGrabar = computed(() => this.faltantes().length === 0 && !this.soloLectura());

  /** Resumen de la vista de consulta (con N.º de extracción y fecha de registro). */
  readonly camposConsulta = computed<SummaryCardField[]>(() => {
    const id = this.id();
    const registro = this.store.obtener(id);
    const correlativo = id.replace(/\D/g, '').slice(-3).padStart(3, '0');
    return [
      { label: 'N° de extracción', value: `2026-EXTR-A-${correlativo}` },
      { label: 'Fecha de registro', value: registro?.fecha ?? '—' },
      ...this.camposResumen(),
    ];
  });

  /** Una lista de extracción (LE) por operario asignado, numeradas en el orden de la tabla. */
  readonly listas = computed(() =>
    this.operarios
      .filter((o) => this.operariosAsignados().includes(o.codigo))
      .map((operario, i) => ({ operario, le: `2026-LE-${String(i + 1).padStart(6, '0')}` })),
  );

  /** Con cartonización se generan LPN: uno por lista de extracción que tiene bienes. */
  readonly lpnGenerados = computed(() => {
    if (this.cartonizacion() !== 'si') return [];
    return this.listas()
      .map((l) => ({ le: l.le, bienes: (this.reparto().get(l.operario.codigo) ?? []).reduce((s, p) => s + p.bienes, 0) }))
      .filter((l) => l.bienes > 0)
      .map((l, i) => ({ codigo: `LPN-2026-${String(i + 1).padStart(5, '0')}`, tipo: 'Caja', bienes: l.bienes, le: l.le }));
  });

  readonly trazabilidad = computed<ActionTrackerSummary[]>(() => {
    const registro = this.store.obtener(this.id());
    const verificado = registro?.estado === 'Verificado';
    return [
      { label: 'Elaborado por', actionBy: 'RICARDO JOHN DOE BUSTAMANTE', date: registro?.fecha ?? '' },
      { label: 'Verificado por', actionBy: verificado ? 'RICARDO JOHN DOE BUSTAMANTE' : '', date: verificado ? (registro?.fecha ?? '') : '' },
      { label: 'Aprobado por', actionBy: '', date: '' },
    ];
  });

  readonly camposResumen = computed<SummaryCardField[]>(() => {
    const t = this.totales();
    const hay = t.pedidos > 0;
    const m = this.metodo();
    return [
      { label: 'Pedidos', value: hay ? t.pedidos : '—' },
      { label: 'Bienes', value: hay ? t.bienes : '—' },
      { label: 'Volumen', value: hay ? `${formatoNumero(t.volumen)} m³` : '—' },
      { label: 'Peso', value: hay ? `${t.peso} kg` : '—' },
      { label: 'Método de extracción', value: m ? ETIQUETA_METODO[m] : '—' },
      { label: 'Política de inventario', value: this.politica() || '—' },
      { label: 'Cartonización', value: this.cartonizacion() === 'si' ? 'Con cartonización' : this.cartonizacion() === 'no' ? 'Sin cartonización' : '—' },
      { label: 'LPN', value: this.lpn() || '—' },
      { label: 'Operarios asignados', value: this.operariosAsignados().length || '—' },
    ];
  });

  constructor() {
    const existente = this.store.obtener(this.id());
    if (this.id() && !existente) {
      void this.router.navigateByUrl(PROCESS_ROUTE);
      return;
    }
    if (existente) this.cargar(existente.id);
  }

  private cargar(id: string): void {
    const s = this.store.obtener(id);
    if (!s) return;
    this.pedidos.set(PEDIDOS_MUESTRA.filter((p) => s.pedidos.includes(p.codigo)));
    this.metodo.set(s.metodo);
    this.politica.set(s.politica);
    this.cartonizacion.set(s.cartonizacion);
    this.operariosAsignados.set([...s.operarios]);
  }

  // ── Tablas ────────────────────────────────────────────────────────
  destino(p: PedidoExtraccion): string {
    return `${p.destinos} destino${p.destinos === 1 ? '' : 's'}`;
  }

  numero2(valor: number): string {
    return formatoNumero(valor);
  }

  camposDetalle(p: PedidoExtraccion): SummaryCardField[] {
    return [
      { label: 'Código de pedido', value: p.codigo },
      { label: 'Tipo', value: p.tipo },
      { label: 'Prioridad', value: p.prioridad },
      { label: 'Destino', value: this.destino(p) },
      { label: 'Bienes', value: p.bienes },
      { label: 'Volumen', value: `${formatoNumero(p.volumen)} m³` },
      { label: 'Peso', value: `${p.peso} kg` },
      { label: 'Fecha', value: p.fecha },
    ];
  }

  totalPaginas(total: number, filas: number): number {
    return Math.max(1, Math.ceil(total / filas));
  }

  private cortar<T>(lista: readonly T[], p: Paginacion): T[] {
    const inicio = (p.pagina - 1) * p.filas;
    return lista.slice(inicio, inicio + p.filas);
  }

  irA(estado: ReturnType<typeof signal<Paginacion>>, delta: number, total: number): void {
    estado.update((p) => ({ ...p, pagina: Math.min(Math.max(1, p.pagina + delta), this.totalPaginas(total, p.filas)) }));
  }

  cambiarFilas(estado: ReturnType<typeof signal<Paginacion>>, filas: number): void {
    estado.set({ pagina: 1, filas });
  }

  // ── Pedidos ───────────────────────────────────────────────────────
  abrirPanelPedidos(): void {
    this.seleccionPanel.set(this.pedidos().map((p) => p.codigo));
    this.busquedaPedidos.set('');
    this.panelPedidos.set(true);
  }

  /** El checkbox masivo del panel marca (o desmarca) todas las filas que muestra, respetando la búsqueda. */
  seleccionarTodosPanel(marcar: boolean): void {
    const visibles = this.pedidosFiltrados().map((p) => p['codigo'] as string);
    this.seleccionPanel.update((actual) => (marcar ? Array.from(new Set([...actual, ...visibles])) : actual.filter((c) => !visibles.includes(c))));
  }

  aceptarPedidos(codigos: string[]): void {
    this.pedidos.set(PEDIDOS_MUESTRA.filter((p) => codigos.includes(p.codigo)));
    this.marcados.set([]);
    this.panelPedidos.set(false);
    this.pagPedidos.set({ ...PAGINACION_INICIAL });
  }

  marcar(codigo: string, marcado: boolean): void {
    this.marcados.update((m) => (marcado ? [...m, codigo] : m.filter((c) => c !== codigo)));
  }

  marcarTodos(marcado: boolean): void {
    this.marcados.set(marcado ? this.pedidos().map((p) => p.codigo) : []);
  }

  quitarMarcados(): void {
    this.pedidos.update((lista) => lista.filter((p) => !this.marcados().includes(p.codigo)));
    this.marcados.set([]);
  }

  // ── Operarios ─────────────────────────────────────────────────────
  alternarOperario(codigo: string): void {
    this.operariosAsignados.update((a) => (a.includes(codigo) ? a.filter((c) => c !== codigo) : [...a, codigo]));
  }

  readonly todosAsignados = computed(() => this.operariosAsignados().length === this.operarios.length);

  asignarTodos(asignar: boolean): void {
    this.operariosAsignados.set(asignar ? this.operarios.map((o) => o.codigo) : []);
  }

  asignacionPrevista(codigo: string): string {
    const pedidos = this.reparto().get(codigo);
    if (!pedidos) return '—';
    if (pedidos.length === 0) return 'Sin pedidos asignados';
    const bienes = pedidos.reduce((s, p) => s + p.bienes, 0);
    return `${pedidos.map((p) => p.codigo).join(', ')} · ${bienes} bienes`;
  }

  // ── Descargas ─────────────────────────────────────────────────────
  /** Sin archivo real en la muestra: baja un texto con el contenido de la lista (o de todas, sin `operario`). */
  descargarListas(operario?: string): void {
    const filas = this.listas().filter((l) => !operario || l.operario.codigo === operario);
    const texto = filas
      .map((l) => `${l.le}\nOperario: ${l.operario.codigo} - ${l.operario.nombre}\nAsignación: ${this.asignacionPrevista(l.operario.codigo)}\n`)
      .join('\n');
    this.descargar(texto, operario ? `${filas[0]?.le ?? 'lista-extraccion'}.txt` : 'listas-de-extraccion.txt');
  }

  descargarLpn(codigo?: string): void {
    const filas = this.lpnGenerados().filter((l) => !codigo || l.codigo === codigo);
    const texto = filas.map((l) => `${l.codigo}\nTipo: ${l.tipo}\nBienes: ${l.bienes}\nLista de extracción: ${l.le}\n`).join('\n');
    this.descargar(texto, codigo ? `${codigo}.txt` : 'lpn-generados.txt');
  }

  private descargar(texto: string, nombre: string): void {
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  // ── Acciones ──────────────────────────────────────────────────────
  grabar(): void {
    this.modalGrabar.set(false);
    if (!this.puedeGrabar()) return;
    const guardada = this.store.grabar(
      {
        pedidos: this.pedidos().map((p) => p.codigo),
        metodo: this.metodo() as MetodoExtraccion,
        politica: this.politica(),
        cartonizacion: this.cartonizacion() as 'si' | 'no',
        operarios: this.operariosAsignados(),
      },
      this.id() || undefined,
    );
    this.editando.set(false);
    if (this.id() !== guardada.id) {
      this.id.set(guardada.id);
      void this.router.navigateByUrl(`${PROCESS_ROUTE}/solicitud/${guardada.id}`, { replaceUrl: true });
    }
    this.aviso.set('La solicitud se grabó. Se generaron las listas de extracción.');
  }

  verificar(): void {
    this.store.verificar(this.id());
    this.modalVerificar.set(false);
    this.aviso.set('El documento fue verificado.');
  }

  eliminar(): void {
    this.store.eliminar(this.id());
    this.modalEliminar.set(false);
    void this.router.navigateByUrl(PROCESS_ROUTE);
  }

  regresar(): void {
    void this.router.navigateByUrl(PROCESS_ROUTE);
  }
}
