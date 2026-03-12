import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { RegistroSolicitudesService } from './services/registro-solicitudes.service';
import { ModalNuevaSolicitudComponent } from './components/modal-nueva-solicitud/modal-nueva-solicitud.component';
import { ModalIniciarProyectoComponent } from './components/modal-iniciar-proyecto/modal-iniciar-proyecto.component';
import { ModalProcesoProyectoComponent } from './components/modal-proceso-proyecto/modal-proceso-proyecto.component';
import { Solicitud, Proyecto, EtapaProyecto, Responsable, ProcesoSimple } from './models/solicitud.model';
import { PaginacionComponent, PaginacionConfig, CambioPaginaEvent } from '../../shared/components/paginacion/paginacion.component';
import { ConfirmDeleteModalComponent, ConfirmDeleteConfig } from '../../shared/components/confirm-delete-modal/confirm-delete-modal.component';

@Component({
  selector: 'app-registro-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalNuevaSolicitudComponent, ModalIniciarProyectoComponent, ModalProcesoProyectoComponent, PaginacionComponent, ConfirmDeleteModalComponent],
  templateUrl: './registro-solicitudes.component.html',
  styleUrls: ['./registro-solicitudes.component.css']
})
export class RegistroSolicitudesComponent implements OnInit {
  
  // Estados de las modales
  showNuevaSolicitudModal = false;
  showIniciarProyectoModal = false;
  showProcesoProyectoModal = false;
  showResumenCancelacionInicioModal = false;
  resumenCancelacionActual: import('./models/solicitud.model').DatosCancelacionInicio | null = null;

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
    pendientes: 0,
    enProceso: 0,
    completadas: 0
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
      
      // Eliminar cada solicitud vía API
      const eliminaciones = idsAEliminar.map(id => 
        this.solicitudesService.eliminarSolicitud(id).toPromise()
      );
      await Promise.all(eliminaciones);
      
      // Recargar datos desde el backend
      this.cargarSolicitudes();
      
      // Limpiar selección
      this.solicitudesSeleccionadas.clear();
      this.mostrarConfirmacionEliminar = false;
      
    } catch (error) {
      console.error('Error al eliminar solicitudes:', error);
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
      pendientes: this.solicitudesFiltradas.filter(s => s.estado === 'Pendiente').length,
      enProceso: this.solicitudesFiltradas.filter(s => s.estado === 'En Proceso').length,
      completadas: this.solicitudesFiltradas.filter(s => s.estado === 'Completado').length
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
    // Cargar datos de referencia en paralelo
    forkJoin({
      responsables: this.solicitudesService.obtenerResponsables(),
      procesos: this.solicitudesService.obtenerProcesos(),
    }).subscribe({
      next: (data) => {
        this.responsables = data.responsables;
        this.procesos = data.procesos;
      },
      error: (err) => console.error('Error cargando datos de referencia:', err)
    });

    // Cargar solicitudes y proyectos
    this.cargarSolicitudes();
    this.cargarProyectos();
  }

  cargarSolicitudes(): void {
    this.solicitudesService.obtenerSolicitudes({ page: 0, size: 100 }).subscribe({
      next: (response) => {
        this.solicitudes = response.content;
        this.aplicarFiltros();
      },
      error: (err) => console.error('Error cargando solicitudes:', err)
    });
  }

  cargarProyectos(): void {
    this.solicitudesService.obtenerProyectos({ page: 0, size: 100 }).subscribe({
      next: (response) => {
        this.proyectos = response.content;
      },
      error: (err) => console.error('Error cargando proyectos:', err)
    });
  }

  // Modal Nueva Solicitud
  abrirNuevaSolicitud(): void { this.showNuevaSolicitudModal = true; }
  cerrarNuevaSolicitud(): void { this.showNuevaSolicitudModal = false; }

  onGuardarSolicitud(data: Partial<Solicitud>): void {
    this.solicitudesService.crearSolicitud(data).subscribe({
      next: (solicitud: any) => {
        // Recargar solicitudes desde el backend
        this.cargarSolicitudes();
        this.solicitudActual = solicitud;
        this.showNuevaSolicitudModal = false;
        this.showIniciarProyectoModal = true;
      },
      error: (err) => console.error('Error creando solicitud:', err)
    });
  }

  // Modal Iniciar Proyecto
  cerrarIniciarProyecto(): void { this.showIniciarProyectoModal = false; }

  onCancelarProyecto(data: { proyecto: Record<string, any>; actividades: any[]; ordenesCompra: any[]; motivo: string; responsableNombre: string; procesoNombre: string }): void {
    if (this.solicitudActual) {
      this.solicitudActual.estado = 'Cancelado';
      this.solicitudActual.datosCancelacionInicio = data;
      const i = this.solicitudes.findIndex(s => s.id === this.solicitudActual!.id);
      if (i !== -1) this.solicitudes[i] = { ...this.solicitudActual };
    }
    this.aplicarFiltros();
    this.showIniciarProyectoModal = false;
  }

  onIniciarProyecto(data: Partial<Proyecto>): void {
    const responsable = this.responsables.find(r => r.id === Number(data.responsableId));
    const proceso = this.procesos.find(p => p.id === Number(data.procesoId));
    const proyecto: Proyecto = {
      id: this.proyectos.length + 1, solicitudId: this.solicitudActual?.id || 0, nombreProyecto: data.nombreProyecto!,
      cliente: data.cliente!, representante: data.representante, costo: data.costo!, ordenesCompra: data.ordenesCompra,
      responsableId: Number(data.responsableId), responsableNombre: responsable?.nombre,
      descripcion: data.descripcion!, fechaInicio: new Date(data.fechaInicio!), fechaFinalizacion: new Date(data.fechaFinalizacion!),
      procesoId: Number(data.procesoId), procesoNombre: proceso?.nombre, ubicacion: data.ubicacion, estado: 'En Proceso', etapaActual: 1
    };
    this.proyectos.push(proyecto);
    if (this.solicitudActual) {
      this.solicitudActual.estado = 'En Proceso';
      this.solicitudActual.fechaInicio = data.fechaInicio;
      this.solicitudActual.fechaFin = data.fechaFinalizacion;
      this.solicitudActual.costo = data.costo!;
      const i = this.solicitudes.findIndex(s => s.id === this.solicitudActual!.id);
      if (i !== -1) this.solicitudes[i] = this.solicitudActual;
    }
    this.aplicarFiltros();
    this.proyectoActual = proyecto;
    this.showIniciarProyectoModal = false;
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
    if (proyecto) { this.proyectoActual = proyecto; this.showProcesoProyectoModal = true; }
    else if (solicitud.estado === 'Cancelado' && solicitud.datosCancelacionInicio) {
      this.resumenCancelacionActual = solicitud.datosCancelacionInicio;
      this.showResumenCancelacionInicioModal = true;
    }
    else if (solicitud.estado === 'Pendiente') { this.solicitudActual = solicitud; this.showIniciarProyectoModal = true; }
  }

  abrirIniciarProyecto(solicitud: Solicitud): void {
    this.solicitudActual = solicitud;
    this.showIniciarProyectoModal = true;
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
}
