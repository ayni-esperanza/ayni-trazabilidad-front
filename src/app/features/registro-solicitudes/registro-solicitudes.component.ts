import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistroSolicitudesService } from './services/registro-solicitudes.service';
import { ModalNuevaSolicitudComponent } from './components/modal-nueva-solicitud/modal-nueva-solicitud.component';
import { ModalProcesoProyectoComponent } from './components/modal-proceso-proyecto/modal-proceso-proyecto.component';
import { Solicitud, Proyecto, EtapaProyecto, Responsable, ProcesoSimple, FlujoNodo } from './models/solicitud.model';
import { PaginacionComponent, PaginacionConfig, CambioPaginaEvent } from '../../shared/components/paginacion/paginacion.component';
import { ConfirmDeleteModalComponent, ConfirmDeleteConfig } from '../../shared/components/confirm-delete-modal/confirm-delete-modal.component';

@Component({
  selector: 'app-registro-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalNuevaSolicitudComponent, ModalProcesoProyectoComponent, PaginacionComponent, ConfirmDeleteModalComponent],
  templateUrl: './registro-solicitudes.component.html',
  styleUrls: ['./registro-solicitudes.component.css']
})
export class RegistroSolicitudesComponent implements OnInit {
  
  // Estados de las modales
  showNuevaSolicitudModal = false;
  showProcesoProyectoModal = false;

  // Listas de datos
  solicitudes: Solicitud[] = [];
  solicitudesFiltradas: Solicitud[] = [];
  proyectos: Proyecto[] = [];
  responsables: Responsable[] = [];
  procesos: ProcesoSimple[] = [];

  // Filtros
  busqueda = '';
  estadoFiltro = '';
  responsableFiltro = '';

  // Paginación
  paginacionConfig: PaginacionConfig = {
    paginaActual: 0,
    porPagina: 100,
    totalElementos: 0,
    totalPaginas: 0
  };

  // Datos temporales
  solicitudActual: Solicitud | null = null;
  proyectoActual: Proyecto | null = null;

  // Estadísticas dinámicas
  estadisticas = {
    total: 0,
    enProceso: 0,
    completadas: 0,
    canceladas: 0
  };

  // Selección múltiple
  solicitudesSeleccionadas: Set<number> = new Set();
  mostrarConfirmacionEliminar = false;
  cargandoEliminacion = false;
  configEliminarModal: ConfirmDeleteConfig = {};

  constructor(private solicitudesService: RegistroSolicitudesService) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
    this.aplicarFiltros();
  }

  // ==================== SELECCIÓN MÚLTIPLE ====================

  toggleSeleccion(id: number, event: Event): void {
    event.stopPropagation();
    if (this.solicitudesSeleccionadas.has(id)) {
      this.solicitudesSeleccionadas.delete(id);
    } else {
      this.solicitudesSeleccionadas.add(id);
    }
  }

  toggleSeleccionTodos(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.solicitudesPaginadas.forEach(s => {
        if (s.id) this.solicitudesSeleccionadas.add(s.id);
      });
    } else {
      this.solicitudesPaginadas.forEach(s => {
        if (s.id) this.solicitudesSeleccionadas.delete(s.id);
      });
    }
  }

  estaSeleccionado(id: number | undefined): boolean {
    return id ? this.solicitudesSeleccionadas.has(id) : false;
  }

  get todosPaginadosSeleccionados(): boolean {
    return this.solicitudesPaginadas.length > 0 && 
           this.solicitudesPaginadas.every(s => s.id && this.solicitudesSeleccionadas.has(s.id));
  }

  get algunosPaginadosSeleccionados(): boolean {
    return this.solicitudesPaginadas.some(s => s.id && this.solicitudesSeleccionadas.has(s.id)) &&
           !this.todosPaginadosSeleccionados;
  }

  iniciarEliminarSeleccionados(): void {
    if (this.solicitudesSeleccionadas.size > 0) {
      this.configEliminarModal = {
        titulo: 'Eliminar solicitudes',
        cantidadElementos: this.solicitudesSeleccionadas.size,
        tipoElemento: this.solicitudesSeleccionadas.size === 1 ? 'solicitud' : 'solicitudes',
        textoConfirmar: 'Eliminar'
      };
      this.mostrarConfirmacionEliminar = true;
    }
  }

  async confirmarEliminarSeleccionados(): Promise<void> {
    this.cargandoEliminacion = true;
    
    try {
      const idsAEliminar = Array.from(this.solicitudesSeleccionadas);
      
      // TODO: Implementar llamada al backend
      // await this.solicitudesService.eliminarMasivo(idsAEliminar);
      
      // Simulación de llamada al backend (remover cuando se integre)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Eliminar localmente (esto se reemplazará con actualización desde backend)
      this.solicitudes = this.solicitudes.filter(s => !this.solicitudesSeleccionadas.has(s.id!));
      this.aplicarFiltros();
      
      // Limpiar selección
      this.solicitudesSeleccionadas.clear();
      this.mostrarConfirmacionEliminar = false;
      
      console.log('Solicitudes eliminadas exitosamente:', idsAEliminar);
      // TODO: Mostrar notificación de éxito
      
    } catch (error) {
      console.error('Error al eliminar solicitudes:', error);
      // TODO: Mostrar notificación de error
    } finally {
      this.cargandoEliminacion = false;
    }
  }

  cancelarEliminarSeleccionados(): void {
    this.mostrarConfirmacionEliminar = false;
  }

  // ==================== FILTROS Y PAGINACIÓN ====================

  aplicarFiltros(): void {
    let resultado = [...this.solicitudes];

    // Filtro de búsqueda
    if (this.busqueda.trim()) {
      const termino = this.busqueda.toLowerCase();
      resultado = resultado.filter(s => 
        s.nombreProyecto.toLowerCase().includes(termino) ||
        s.cliente.toLowerCase().includes(termino) ||
        (s.responsableNombre || '').toLowerCase().includes(termino)
      );
    }

    // Filtro de estado
    if (this.estadoFiltro) {
      resultado = resultado.filter(s => s.estado === this.estadoFiltro);
    }

    // Filtro de responsable
    if (this.responsableFiltro) {
      resultado = resultado.filter(s => s.responsableId?.toString() === this.responsableFiltro);
    }

    this.solicitudesFiltradas = resultado;
    this.actualizarPaginacion();
    this.calcularEstadisticas();
  }

  actualizarPaginacion(): void {
    this.paginacionConfig.totalElementos = this.solicitudesFiltradas.length;
    this.paginacionConfig.totalPaginas = Math.ceil(
      this.solicitudesFiltradas.length / this.paginacionConfig.porPagina
    );
  }

  calcularEstadisticas(): void {
    this.estadisticas = {
      total: this.solicitudesFiltradas.length,
      enProceso: this.solicitudesFiltradas.filter(s => s.estado === 'En Proceso').length,
      completadas: this.solicitudesFiltradas.filter(s => s.estado === 'Completado').length,
      canceladas: this.solicitudesFiltradas.filter(s => s.estado === 'Cancelado').length
    };
  }

  tieneFiltrosActivos(): boolean {
    return !!(this.busqueda.trim() || this.estadoFiltro || this.responsableFiltro);
  }

  get solicitudesPaginadas(): Solicitud[] {
    const inicio = this.paginacionConfig.paginaActual * this.paginacionConfig.porPagina;
    const fin = inicio + this.paginacionConfig.porPagina;
    return this.solicitudesFiltradas.slice(inicio, fin);
  }

  onCambioPagina(event: CambioPaginaEvent): void {
    this.paginacionConfig.paginaActual = event.pagina;
    this.paginacionConfig.porPagina = event.porPagina;
    this.actualizarPaginacion();
  }

  onBuscar(): void {
    this.paginacionConfig.paginaActual = 0;
    this.aplicarFiltros();
  }

  onFiltrarEstado(): void {
    this.paginacionConfig.paginaActual = 0;
    this.aplicarFiltros();
  }

  onFiltrarResponsable(): void {
    this.paginacionConfig.paginaActual = 0;
    this.aplicarFiltros();
  }

  onCambioTamano(nuevoTamano: number): void {
    this.paginacionConfig.porPagina = nuevoTamano;
    this.paginacionConfig.paginaActual = 0;
    this.aplicarFiltros();
  }

  cargarDatosIniciales(): void {
    this.responsables = [
      { id: 1, nombre: 'Rolando Rodriguez Mercedes', cargo: 'Responsable de Proyecto' },
      { id: 2, nombre: 'Alex Marquina Perez', cargo: 'Responsable de Proyecto' },
      { id: 3, nombre: 'Darling Vigo Cotos', cargo: 'Responsable de Proyecto' },
      { id: 4, nombre: 'Rodolfo Razuri Arevalo', cargo: 'Responsable de Proyecto' },
      { id: 5, nombre: 'Gian Juarez Rondo', cargo: 'Responsable de Proyecto' }
    ];

    this.procesos = [
      { id: 1, nombre: 'Proceso de Desarrollo', etapas: [
        { id: 1, nombre: 'Análisis', orden: 1 }, { id: 2, nombre: 'Diseño', orden: 2 },
        { id: 3, nombre: 'Desarrollo', orden: 3 }, { id: 4, nombre: 'Pruebas', orden: 4 }
      ]},
      { id: 2, nombre: 'Proceso de Consultoría', etapas: [
        { id: 5, nombre: 'Diagnóstico', orden: 1 }, { id: 6, nombre: 'Propuesta', orden: 2 }, { id: 7, nombre: 'Implementación', orden: 3 }
      ]},
      { id: 3, nombre: 'Proceso de Auditoría', etapas: [
        { id: 8, nombre: 'Planificación', orden: 1 }, { id: 9, nombre: 'Ejecución', orden: 2 },
        { id: 10, nombre: 'Informe', orden: 3 }, { id: 11, nombre: 'Seguimiento', orden: 4 }
      ]}
    ];

    this.solicitudes = [
      { id: 1, nombreProyecto: 'Línea de Producción Textil', cliente: 'Textiles del Norte SAC', representante: 'Roberto Sánchez', costo: 85000, responsableId: 1, responsableNombre: 'Rolando Rodriguez Mercedes', descripcion: 'Diseño e implementación de línea automatizada de producción textil', fechaInicio: new Date('2026-02-01'), fechaFin: new Date('2026-07-30'), estado: 'En Proceso' },
      { id: 2, nombreProyecto: 'Sistema de Ventilación Industrial', cliente: 'Minera Las Rocas SA', representante: 'Laura Mendoza', costo: 62000, responsableId: 2, responsableNombre: 'Alex Marquina Perez', descripcion: 'Instalación de sistema de ventilación para planta industrial', fechaInicio: new Date('2026-01-15'), fechaFin: new Date('2026-06-15'), estado: 'En Proceso' },
      { id: 3, nombreProyecto: 'Mantenimiento Predictivo Maquinaria', cliente: 'Industrias Metal SAC', representante: 'Pedro Torres', costo: 38000, responsableId: 3, responsableNombre: 'Darling Vigo Cotos', descripcion: 'Programa de mantenimiento predictivo para equipos industriales', fechaInicio: new Date('2025-11-01'), fechaFin: new Date('2026-01-31'), estado: 'Completado' }
    ];

    this.proyectos = [
      {
        id: 1,
        solicitudId: 1,
        nombreProyecto: 'Línea de Producción Textil',
        cliente: 'Textiles del Norte SAC',
        representante: 'Roberto Sánchez',
        costo: 85000,
        ordenesCompra: [
          { numero: 'OC-TEX-001', tipo: 'Materiales', fecha: '2026-02-06', total: 18500 },
          { numero: 'OC-TEX-002', tipo: 'Servicios', fecha: '2026-02-18', total: 22300 }
        ],
        responsableId: 1,
        responsableNombre: 'Rolando Rodriguez Mercedes',
        descripcion: '<p>Diseño e implementación de línea automatizada de producción textil para aumentar capacidad y reducir tiempos operativos.</p>',
        ubicacion: 'Lima, Ate',
        fechaInicio: new Date('2026-02-01'),
        fechaFinalizacion: new Date('2026-07-30'),
        procesoId: 1,
        procesoNombre: 'Proceso de Desarrollo',
        estado: 'En Proceso',
        etapaActual: 2,
        flujo: {
          nodos: [
            { id: 1, nombre: 'Inicio', tipo: 'inicio', siguientesIds: [2] },
            {
              id: 2,
              nombre: 'Levantamiento de requerimientos',
              tipo: 'tarea',
              responsableId: 1,
              fechaInicio: '2026-02-03',
              fechaFin: '2026-02-12',
              descripcion: 'Reuniones con cliente y validación de alcance técnico.',
              adjuntos: [
                { nombre: 'Acta-levantamiento.pdf', tipo: 'pdf', tamano: 542130 },
                { nombre: 'Plano-inicial.dwg', tipo: 'dwg', tamano: 1830240 }
              ],
              siguientesIds: [3]
            },
            {
              id: 3,
              nombre: 'Diseño de solución',
              tipo: 'tarea',
              responsableId: 4,
              fechaInicio: '2026-02-13',
              fechaFin: '2026-03-01',
              descripcion: 'Definición de layout y componentes críticos.',
              adjuntos: [
                { nombre: 'Diseno-general.pdf', tipo: 'pdf', tamano: 722410 }
              ],
              siguientesIds: [4]
            },
            {
              id: 4,
              nombre: 'Instalación y pruebas iniciales',
              tipo: 'tarea',
              responsableId: 5,
              fechaInicio: '2026-03-05',
              fechaFin: '2026-03-20',
              descripcion: 'Montaje en planta y pruebas funcionales base.',
              siguientesIds: []
            }
          ]
        }
      },
      {
        id: 2,
        solicitudId: 2,
        nombreProyecto: 'Sistema de Ventilación Industrial',
        cliente: 'Minera Las Rocas SA',
        representante: 'Laura Mendoza',
        costo: 62000,
        ordenesCompra: [
          { numero: 'OC-MIN-015', tipo: 'Equipos', fecha: '2026-01-17', total: 31800 }
        ],
        responsableId: 2,
        responsableNombre: 'Alex Marquina Perez',
        descripcion: '<p>Instalación de sistema de ventilación industrial con extractores de aire de alta capacidad para zonas de operación crítica.</p>',
        ubicacion: 'Cajamarca, Hualgayoc',
        fechaInicio: new Date('2026-01-15'),
        fechaFinalizacion: new Date('2026-06-15'),
        procesoId: 2,
        procesoNombre: 'Proceso de Consultoría',
        estado: 'En Proceso',
        etapaActual: 1,
        flujo: {
          nodos: [
            { id: 1, nombre: 'Inicio', tipo: 'inicio', siguientesIds: [2] },
            {
              id: 2,
              nombre: 'Relevamiento técnico',
              tipo: 'tarea',
              responsableId: 2,
              fechaInicio: '2026-01-20',
              fechaFin: '2026-01-28',
              descripcion: 'Inspección de ductos y medición de caudales existentes.',
              adjuntos: [
                { nombre: 'Informe-campo.docx', tipo: 'docx', tamano: 268410 }
              ],
              siguientesIds: [3]
            },
            {
              id: 3,
              nombre: 'Propuesta técnica y presupuesto',
              tipo: 'tarea',
              responsableId: 3,
              fechaInicio: '2026-01-30',
              fechaFin: '2026-02-08',
              descripcion: 'Definición de equipos, costos y cronograma de implementación.',
              siguientesIds: [4]
            },
            {
              id: 4,
              nombre: 'Ejecución de instalación',
              tipo: 'tarea',
              responsableId: 2,
              fechaInicio: '2026-02-10',
              fechaFin: '2026-03-15',
              descripcion: 'Instalación y validación operativa por etapas.',
              adjuntos: [
                { nombre: 'Checklist-instalacion.xlsx', tipo: 'xlsx', tamano: 143800 }
              ],
              siguientesIds: []
            }
          ]
        }
      },
      {
        id: 3,
        solicitudId: 3,
        nombreProyecto: 'Mantenimiento Predictivo Maquinaria',
        cliente: 'Industrias Metal SAC',
        representante: 'Pedro Torres',
        costo: 0,
        ordenesCompra: [],
        responsableId: 3,
        responsableNombre: 'Darling Vigo Cotos',
        descripcion: '',
        ubicacion: '',
        fechaInicio: '',
        fechaFinalizacion: '',
        procesoId: 0,
        procesoNombre: '',
        estado: 'Completado',
        etapaActual: 0,
        flujo: { nodos: [] }
      }
    ];

    this.aplicarFiltros();
  }

  // Modal Nueva Solicitud
  abrirNuevaSolicitud(): void { this.showNuevaSolicitudModal = true; }
  cerrarNuevaSolicitud(): void { this.showNuevaSolicitudModal = false; }

  onGuardarSolicitud(data: Partial<Solicitud>): void {
    const responsable = this.responsables.find(r => r.id === Number(data.responsableId));
    const solicitud: Solicitud = {
      id: this.solicitudes.length + 1, nombreProyecto: data.nombreProyecto!, cliente: data.cliente!,
      representante: data.representante, costo: data.costo!, responsableId: Number(data.responsableId), responsableNombre: responsable?.nombre,
      descripcion: data.descripcion!, fechaSolicitud: new Date(),
      fechaInicio: data.fechaInicio, fechaFin: data.fechaFin, ubicacion: data.ubicacion, estado: 'En Proceso'
    };
    this.solicitudes.push(solicitud);
    this.aplicarFiltros(); // Actualizar la lista filtrada para mostrar la nueva solicitud
    this.solicitudActual = solicitud;
    this.showNuevaSolicitudModal = false;
    this.proyectoActual = this.crearProyectoDesdeSolicitud(solicitud);
    this.showProcesoProyectoModal = true;
  }

  // Modal Proceso Proyecto
  cerrarProcesoProyecto(): void { this.showProcesoProyectoModal = false; }

  onCancelarProyectoDesdeModal(evento: {motivo: string}): void {
    if (this.proyectoActual) {
      const pi = this.proyectos.findIndex(p => p.id === this.proyectoActual!.id);
      if (pi !== -1) {
        this.proyectos[pi].estado = 'Cancelado';
        this.proyectos[pi].motivoCancelacion = evento.motivo;
      }
      const si = this.solicitudes.findIndex(s => s.id === this.proyectoActual!.solicitudId);
      if (si !== -1) this.solicitudes[si].estado = 'Cancelado';
      // Actualizar el proyecto actual para que se refleje en el modal
      this.proyectoActual = { ...this.proyectoActual, estado: 'Cancelado', motivoCancelacion: evento.motivo };
    }
    this.aplicarFiltros();
  }

  onFinalizarEtapa(etapa: EtapaProyecto): void { console.log('Etapa finalizada:', etapa); }

  onFinalizarProyecto(proyecto: Proyecto): void {
    console.log('Proyecto finalizado:', proyecto);
    // Actualizar el proyecto en la lista
    const index = this.proyectos.findIndex(p => p.id === proyecto.id);
    if (index >= 0) {
      this.proyectos[index] = { ...proyecto, estado: 'Completado' };
    }
    // Actualizar estado de la solicitud asociada
    const solicitud = this.solicitudes.find(s => s.id === proyecto.solicitudId);
    if (solicitud) {
      solicitud.estado = 'Completado';
    }
    this.aplicarFiltros();
  }

  onInfoProyectoActualizada(info: { costo: number; fechaInicio: string; fechaFin: string }): void {
    if (this.solicitudActual) {
      this.solicitudActual.costo = info.costo;
      this.solicitudActual.fechaInicio = info.fechaInicio;
      this.solicitudActual.fechaFin = info.fechaFin;
      const i = this.solicitudes.findIndex(s => s.id === this.solicitudActual!.id);
      if (i !== -1) this.solicitudes[i] = { ...this.solicitudActual };
      this.aplicarFiltros();
    }
  }

  onCambiarProyecto(proyectoId: number): void {
    const proyecto = this.proyectos.find(p => p.id === proyectoId);
    if (proyecto) this.proyectoActual = proyecto;
  }

  // Acciones desde tabla
  abrirProcesoDesdeTabla(solicitud: Solicitud): void {
    const proyecto = this.proyectos.find(p => p.solicitudId === solicitud.id);
    if (proyecto) {
      this.proyectoActual = proyecto;
      this.showProcesoProyectoModal = true;
      return;
    }
    this.solicitudActual = solicitud;
    this.proyectoActual = this.crearProyectoDesdeSolicitud(solicitud);
    this.showProcesoProyectoModal = true;
  }

  // Helpers
  getSolicitudesPorEstado(estado: string): number { return this.solicitudes.filter(s => s.estado === estado).length; }

  getEstadoClass(estado: string): string {
    const classes: Record<string, string> = {
      'Completado': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      'En Proceso': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      'Cancelado': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    };
    return classes[estado] || 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
  }

  getFlujoNodos(solicitudId: number | undefined): FlujoNodo[] {
    if (!solicitudId) return [];
    const proyecto = this.proyectos.find(p => p.solicitudId === solicitudId);
    return proyecto?.flujo?.nodos || [];
  }

  getFlujoTimeline(solicitudId: number | undefined): FlujoNodo[] {
    const nodos = this.getFlujoNodos(solicitudId);
    if (nodos.length <= 1) return nodos;

    const porId = new Map(nodos.map(n => [n.id, n]));
    const inicio = nodos.find(n => n.tipo === 'inicio');
    const visitados = new Set<number>();
    const ordenados: FlujoNodo[] = [];

    const visitar = (nodo: FlujoNodo): void => {
      if (visitados.has(nodo.id)) return;
      visitados.add(nodo.id);
      ordenados.push(nodo);
      for (const siguienteId of nodo.siguientesIds) {
        const siguiente = porId.get(siguienteId);
        if (siguiente) visitar(siguiente);
      }
    };

    if (inicio) visitar(inicio);
    for (const nodo of nodos) {
      if (!visitados.has(nodo.id)) visitar(nodo);
    }

    return ordenados;
  }

  getSiguientesNombres(nodos: FlujoNodo[], nodo: FlujoNodo): string {
    if (!nodo.siguientesIds.length) return 'Sin conexiones';
    const nombres = nodo.siguientesIds
      .map(id => nodos.find(n => n.id === id)?.nombre)
      .filter((nombre): nombre is string => !!nombre);
    return nombres.length ? nombres.join(', ') : 'Sin conexiones';
  }

  getResponsableNombre(responsableId: number): string {
    const responsable = this.responsables.find(r => r.id === responsableId);
    return responsable?.nombre || 'Sin asignar';
  }

  private crearProyectoDesdeSolicitud(solicitud: Solicitud): Proyecto {
    const existente = this.proyectos.find(p => p.solicitudId === solicitud.id);
    if (existente) return existente;
    const proyecto: Proyecto = {
      id: this.proyectos.length + 1,
      solicitudId: solicitud.id,
      nombreProyecto: solicitud.nombreProyecto,
      cliente: solicitud.cliente,
      representante: solicitud.representante,
      costo: solicitud.costo,
      ordenesCompra: [],
      responsableId: solicitud.responsableId,
      responsableNombre: solicitud.responsableNombre,
      descripcion: solicitud.descripcion,
      fechaInicio: solicitud.fechaInicio || '',
      fechaFinalizacion: solicitud.fechaFin || '',
      procesoId: 0,
      procesoNombre: '',
      ubicacion: solicitud.ubicacion,
      estado: 'En Proceso',
      etapaActual: 1,
      flujo: { nodos: [{ id: 1, nombre: 'Inicio', tipo: 'inicio', siguientesIds: [] }] }
    };
    this.proyectos.push(proyecto);
    solicitud.estado = 'En Proceso';
    this.aplicarFiltros();
    return proyecto;
  }
}
