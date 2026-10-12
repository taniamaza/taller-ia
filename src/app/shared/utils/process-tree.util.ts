/**
 * Árbol maestro de procesos + utilidad de búsqueda de ruta.
 * Vive en shared/utils/ (no en layout/) porque lo consumen tanto piezas
 * del shell (layout/process-menu-tree, layout/create-document) como
 * utilidades transversales de shared (breadcrumbs.util) — shared no debe
 * depender de layout, así que la fuente de verdad va acá.
 */
export interface ProcessMenuNode {
  id: string;
  label: string;
  selected?: boolean;
  // Solo debe marcarse en nodos raiz: la vista inicial muestra hasta el segundo nivel.
  expanded?: boolean;
  // Ruta de la página principal del módulo (documentos y registros)
  moduleRoute?: string;
  // Si un nodo tiene estas propiedades, Crear documento puede completar documento/tipo y navegar.
  createRoute?: string;
  documentOptions?: string[];
  documentCreateOptions?: Array<{
    label: string;
    route?: string;
    actionTypes?: string[];
  }>;
  actionTypeOptions?: string[];
  /**
   * Marca un nodo como módulo planificado pero aún no implementado.
   * El menú lo renderiza con texto atenuado y badge "Próximamente",
   * y el click no navega (solo expande si tiene hijos).
   */
  comingSoon?: boolean;
  children?: ProcessMenuNode[];
}

/**
 * Árbol de procesos del taller: un solo grupo, «Gestión de Bienes Muebles». Con pantalla, con datos de muestra, están
 * «Aprobación de subasta pública electrónica» y «Procesos del postor»; el resto son ejemplos de cómo se ve un proceso
 * planificado («Próximamente»). Para sumar un proceso: una hoja con `moduleRoute` y su ruta en
 * `modules/<área>/<área>.routes.ts`.
 *
 * IDs consumidos por componentes externos (migas de pan con `findProcessPathById`):
 *   - aprobacion-subasta
 *   - procesos-postor
 *   - pagos-devoluciones-postor
 */
export const DEFAULT_PROCESS_TREE: ProcessMenuNode[] = [
  {
    id: 'gestion-bienes-muebles',
    label: 'Gestión de Bienes Muebles',
    expanded: true,
    children: [
      {
        id: 'gestion-actos-disposicion-final',
        label: 'Gestión de actos de disposición final',
        expanded: true,
        comingSoon: true,
        children: [
          { id: 'gestion-donacion-raee', label: 'Gestión de Donación RAEE', comingSoon: true },
          {
            id: 'gestion-subasta-publica',
            label: 'Gestión de Subasta Pública',
            expanded: true,
            comingSoon: true,
            children: [
              { id: 'aprobacion-subasta', label: 'Aprobación de subasta pública electrónica', moduleRoute: '/procesos/aprobacion-subasta' },
              { id: 'convocatoria-habilitacion-postores', label: 'Convocatoria y habilitación de postores', comingSoon: true },
              { id: 'adjudicacion-spe', label: 'Adjudicación de la SPE', comingSoon: true },
              { id: 'operaciones-entrega-informe-spe', label: 'Operaciones de Entrega e Informe Final de SPE', comingSoon: true },
              { id: 'procesos-postor', label: 'Procesos del postor', moduleRoute: '/procesos/procesos-postor' },
              { id: 'pagos-devoluciones-postor', label: 'Pagos y Devoluciones del postor', moduleRoute: '/procesos/pagos-devoluciones-postor' },
            ],
          },
          { id: 'gestion-otros-actos', label: 'Gestión de Otros actos', comingSoon: true },
        ],
      },
    ],
  },
];

export function findProcessPathById(id: string, nodes: readonly ProcessMenuNode[] = DEFAULT_PROCESS_TREE): ProcessMenuNode[] {
  for (const node of nodes) {
    if (node.id === id) {
      return [node];
    }

    const childPath = findProcessPathById(id, node.children || []);

    if (childPath.length > 0) {
      return [node, ...childPath];
    }
  }

  return [];
}

/**
 * Árbol del menú "Ajustes" (módulo de administración). Lo pinta el mismo `siaf-process-menu-tree`
 * que el menú de procesos, con otros textos. En el taller no hay módulo de administración: las hojas
 * van como «Próximamente» y no navegan.
 */
export const ADMIN_MENU_TREE: ProcessMenuNode[] = [
  {
    id: 'administracion',
    label: 'Administración',
    expanded: true,
    children: [
      {
        id: 'usuarios-accesos',
        label: 'Usuarios y accesos',
        expanded: true,
        children: [
          { id: 'gestion-usuarios', label: 'Gestión de usuarios', comingSoon: true },
          { id: 'perfiles-funcionales', label: 'Perfiles funcionales', comingSoon: true },
        ],
      },
      {
        id: 'organizacion',
        label: 'Organización',
        children: [
          { id: 'entidades', label: 'Entidades', comingSoon: true },
          { id: 'unidades', label: 'Unidades orgánicas', comingSoon: true },
        ],
      },
    ],
  },
];
