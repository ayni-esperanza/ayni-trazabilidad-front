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
  private readonly solicitudCounterKey = 'ayni:registro-solicitudes:next-solicitud-id';
  private readonly proyectoCounterKey = 'ayni:registro-solicitudes:next-proyecto-id';
  
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
  empresaFiltro = '';
  fechaDesdeFiltro = '';
  fechaHastaFiltro = '';

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

    // Filtro de empresa
    if (this.empresaFiltro) {
      resultado = resultado.filter(s => s.cliente === this.empresaFiltro);
    }

    // Filtro de responsable
    if (this.responsableFiltro) {
      resultado = resultado.filter(s => s.responsableId?.toString() === this.responsableFiltro);
    }

    // Filtro por rango de fechas de registro
    if (this.fechaDesdeFiltro || this.fechaHastaFiltro) {
      const fechaDesde = this.fechaDesdeFiltro ? this.parseDateAtStart(this.fechaDesdeFiltro) : null;
      const fechaHasta = this.fechaHastaFiltro ? this.parseDateAtEnd(this.fechaHastaFiltro) : null;

      resultado = resultado.filter(solicitud => {
        if (!solicitud.fechaSolicitud) return false;
        const fechaRegistro = new Date(solicitud.fechaSolicitud);
        if (Number.isNaN(fechaRegistro.getTime())) return false;

        if (fechaDesde && fechaRegistro < fechaDesde) return false;
        if (fechaHasta && fechaRegistro > fechaHasta) return false;
        return true;
      });
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
    return !!(
      this.busqueda.trim() ||
      this.estadoFiltro ||
      this.empresaFiltro ||
      this.responsableFiltro ||
      this.fechaDesdeFiltro ||
      this.fechaHastaFiltro
    );
  }

  get empresasDisponibles(): string[] {
    return [...new Set(this.solicitudes.map(s => s.cliente).filter(Boolean))].sort((a, b) => a.localeCompare(b));
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

  onFiltrarEmpresa(): void {
    this.paginacionConfig.paginaActual = 0;
    this.aplicarFiltros();
  }

  onFiltrarResponsable(): void {
    this.paginacionConfig.paginaActual = 0;
    this.aplicarFiltros();
  }

  onFiltrarRangoFechas(): void {
    this.paginacionConfig.paginaActual = 0;
    this.aplicarFiltros();
  }

  limpiarFiltroFechas(): void {
    this.fechaDesdeFiltro = '';
    this.fechaHastaFiltro = '';
    this.onFiltrarRangoFechas();
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
      { id: 1, nombreProyecto: 'Línea de Producción Textil', cliente: 'Textiles del Norte SAC', representante: 'Roberto Sánchez', costo: 85000, responsableId: 1, responsableNombre: 'Rolando Rodriguez Mercedes', descripcion: 'Diseño e implementación de línea automatizada de producción textil', fechaSolicitud: new Date('2026-01-27'), fechaInicio: new Date('2026-02-01'), fechaFin: new Date('2026-07-30'), estado: 'En Proceso' },
      { id: 2, nombreProyecto: 'Sistema de Ventilación Industrial', cliente: 'Minera Las Rocas SA', representante: 'Laura Mendoza', costo: 62000, responsableId: 2, responsableNombre: 'Alex Marquina Perez', descripcion: 'Instalación de sistema de ventilación para planta industrial', fechaSolicitud: new Date('2026-01-10'), fechaInicio: new Date('2026-01-15'), fechaFin: new Date('2026-06-15'), estado: 'En Proceso' },
      { id: 3, nombreProyecto: 'Mantenimiento Predictivo Maquinaria', cliente: 'Industrias Metal SAC', representante: 'Pedro Torres', costo: 38000, responsableId: 3, responsableNombre: 'Darling Vigo Cotos', descripcion: 'Programa de mantenimiento predictivo para equipos industriales', fechaSolicitud: new Date('2025-10-25'), fechaInicio: new Date('2025-11-01'), fechaFin: new Date('2026-01-31'), estado: 'Completado' }
    ];

    this.proyectos = [
      {
        id: 1,
        solicitudId: 1,
        nombreProyecto: 'Línea de Producción Textil',
        cliente: 'Textiles del Norte SAC',
        representante: 'Roberto Sánchez',
        costo: 85000,
        fechaRegistro: new Date('2026-01-27'),
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
        fechaRegistro: new Date('2026-01-10'),
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
        fechaRegistro: new Date('2025-10-25'),
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
    const solicitudId = this.obtenerSiguienteId(this.solicitudCounterKey, this.solicitudes.map(s => s.id ?? 0));
    const solicitud: Solicitud = {
      id: solicitudId, nombreProyecto: data.nombreProyecto!, cliente: data.cliente!,
      representante: data.representante, costo: data.costo!, responsableId: Number(data.responsableId), responsableNombre: responsable?.nombre,
      descripcion: data.descripcion!, fechaSolicitud: new Date(),
      fechaInicio: new Date(), fechaFin: new Date(), ubicacion: data.ubicacion, estado: 'En Proceso'
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
        this.proyectos[pi].fechaFinalizacion = new Date();
      }
      const si = this.solicitudes.findIndex(s => s.id === this.proyectoActual!.solicitudId);
      if (si !== -1) {
        this.solicitudes[si].estado = 'Cancelado';
        this.solicitudes[si].fechaFin = new Date();
      }
      // Actualizar el proyecto actual para que se refleje en el modal
      this.proyectoActual = { ...this.proyectoActual, estado: 'Cancelado', motivoCancelacion: evento.motivo, fechaFinalizacion: new Date() };
    }
    this.aplicarFiltros();
  }

  onFinalizarEtapa(etapa: EtapaProyecto): void { console.log('Etapa finalizada:', etapa); }

  onFinalizarProyecto(proyecto: Proyecto): void {
    console.log('Proyecto finalizado:', proyecto);
    // Actualizar el proyecto en la lista
    const index = this.proyectos.findIndex(p => p.id === proyecto.id);
    if (index >= 0) {
      this.proyectos[index] = { ...proyecto, estado: 'Completado', fechaFinalizacion: new Date() };
    }
    // Actualizar estado de la solicitud asociada
    const solicitud = this.solicitudes.find(s => s.id === proyecto.solicitudId);
    if (solicitud) {
      solicitud.estado = 'Completado';
      solicitud.fechaFin = new Date();
    }
    this.aplicarFiltros();
  }

  onInfoProyectoActualizada(info: { costo: number; fechaInicio: string; fechaFin: string }): void {
    if (!this.proyectoActual) return;

    this.proyectoActual.costo = info.costo;
    this.proyectoActual.fechaInicio = info.fechaInicio;
    this.proyectoActual.fechaFinalizacion = info.fechaFin || new Date();
    this.onProyectoActualizado(this.proyectoActual);
  }

  onProyectoActualizado(proyectoActualizado: Proyecto): void {
    const indexProyecto = this.proyectos.findIndex(p => p.id === proyectoActualizado.id);
    if (indexProyecto !== -1) {
      this.proyectos[indexProyecto] = { ...proyectoActualizado };
    }

    const indexSolicitud = this.solicitudes.findIndex(s => s.id === proyectoActualizado.solicitudId);
    if (indexSolicitud !== -1) {
      const solicitud = this.solicitudes[indexSolicitud];
      this.solicitudes[indexSolicitud] = {
        ...solicitud,
        nombreProyecto: proyectoActualizado.nombreProyecto,
        cliente: proyectoActualizado.cliente,
        representante: proyectoActualizado.representante,
        responsableId: proyectoActualizado.responsableId,
        responsableNombre: proyectoActualizado.responsableNombre,
        costo: proyectoActualizado.costo,
        ubicacion: proyectoActualizado.ubicacion,
        descripcion: proyectoActualizado.descripcion,
        fechaInicio: solicitud.fechaSolicitud || solicitud.fechaInicio,
        fechaFin: proyectoActualizado.fechaFinalizacion || new Date()
      };
      this.solicitudActual = this.solicitudes[indexSolicitud];
    }

    if (this.proyectoActual?.id === proyectoActualizado.id) {
      this.proyectoActual = { ...proyectoActualizado };
    }

    this.aplicarFiltros();
  }

  onCambiarProyecto(proyectoId: number): void {
    const proyecto = this.proyectos.find(p => p.id === proyectoId);
    if (proyecto) {
      this.proyectoActual = proyecto;
      const solicitud = this.solicitudes.find(s => s.id === proyecto.solicitudId);
      if (solicitud) {
        this.solicitudActual = solicitud;
      }
    }
  }

  // Acciones desde tabla
  abrirProcesoDesdeTabla(solicitud: Solicitud): void {
    this.solicitudActual = solicitud;
    const proyecto = this.proyectos.find(p => p.solicitudId === solicitud.id);
    if (proyecto) {
      this.proyectoActual = proyecto;
      this.showProcesoProyectoModal = true;
      return;
    }
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
    if (nodos.length <= 1) return nodos.filter(n => n.tipo !== 'inicio');

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

    return ordenados.filter(n => n.tipo !== 'inicio');
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
    const proyectoId = this.obtenerSiguienteId(this.proyectoCounterKey, this.proyectos.map(p => p.id));
    const proyecto: Proyecto = {
      id: proyectoId,
      solicitudId: solicitud.id,
      nombreProyecto: solicitud.nombreProyecto,
      cliente: solicitud.cliente,
      representante: solicitud.representante,
      costo: solicitud.costo,
      fechaRegistro: solicitud.fechaSolicitud || new Date(),
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
      flujo: { nodos: [] }
    };
    this.proyectos.push(proyecto);
    solicitud.estado = 'En Proceso';
    this.aplicarFiltros();
    return proyecto;
  }

  private obtenerSiguienteId(storageKey: string, idsExistentes: number[]): number {
    const maximoExistente = idsExistentes.length ? Math.max(...idsExistentes) : 0;

    if (typeof window === 'undefined') {
      return maximoExistente + 1;
    }

    const valorGuardado = Number(window.localStorage.getItem(storageKey) || '0');
    const siguienteId = Math.max(maximoExistente, Number.isFinite(valorGuardado) ? valorGuardado : 0) + 1;
    window.localStorage.setItem(storageKey, String(siguienteId));

    return siguienteId;
  }

  private parseDateAtStart(dateInput: string): Date {
    const fecha = new Date(dateInput);
    fecha.setHours(0, 0, 0, 0);
    return fecha;
  }

  private parseDateAtEnd(dateInput: string): Date {
    const fecha = new Date(dateInput);
    fecha.setHours(23, 59, 59, 999);
    return fecha;
  }
}
