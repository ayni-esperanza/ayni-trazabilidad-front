import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistroSolicitudesService } from './services/registro-solicitudes.service';
import { ModalNuevaSolicitudComponent } from './components/modal-nueva-solicitud/modal-nueva-solicitud.component';
import { ModalProcesoProyectoComponent } from './components/modal-proceso-proyecto/modal-proceso-proyecto.component';
import { Solicitud, Proyecto, EtapaProyecto, Responsable, ProcesoSimple, FlujoNodo } from './models/solicitud.model';
import { PaginacionComponent, PaginacionConfig, CambioPaginaEvent } from '../../shared/components/paginacion/paginacion.component';
import { ConfirmDeleteModalComponent, ConfirmDeleteConfig } from '../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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

  confirmarEliminarSeleccionados(): void {
    this.cargandoEliminacion = true;

    const idsAEliminar = Array.from(this.solicitudesSeleccionadas);
    if (!idsAEliminar.length) {
      this.cargandoEliminacion = false;
      return;
    }

    forkJoin(idsAEliminar.map((id) => this.solicitudesService.eliminarSolicitud(id))).subscribe({
      next: () => {
        this.solicitudes = this.solicitudes.filter(s => !this.solicitudesSeleccionadas.has(s.id));
        this.proyectos = this.proyectos.filter(p => !this.solicitudesSeleccionadas.has(p.solicitudId));
        this.solicitudesSeleccionadas.clear();
        this.mostrarConfirmacionEliminar = false;
        this.aplicarFiltros();
      },
      error: (error) => {
        console.error('Error al eliminar solicitudes:', error);
      },
      complete: () => {
        this.cargandoEliminacion = false;
      }
    });
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
    forkJoin({
      responsables: this.solicitudesService.obtenerResponsables(),
      procesos: this.solicitudesService.obtenerProcesos(),
      solicitudes: this.solicitudesService.obtenerSolicitudes(),
      proyectos: this.solicitudesService.obtenerProyectos()
    }).subscribe({
      next: ({ responsables, procesos, solicitudes, proyectos }) => {
        this.responsables = responsables || [];
        this.procesos = procesos || [];
        this.solicitudes = solicitudes || [];
        this.proyectos = proyectos || [];
        this.aplicarFiltros();
      },
      error: (error) => {
        console.error('Error al cargar datos de registro de solicitudes:', error);
        this.responsables = [];
        this.procesos = [];
        this.solicitudes = [];
        this.proyectos = [];
        this.aplicarFiltros();
      }
    });
  }

  // Modal Nueva Solicitud
  abrirNuevaSolicitud(): void { this.showNuevaSolicitudModal = true; }
  cerrarNuevaSolicitud(): void { this.showNuevaSolicitudModal = false; }

  onGuardarSolicitud(data: Partial<Solicitud>): void {
    this.solicitudesService.crearSolicitud(data).subscribe({
      next: (solicitudCreada) => {
        this.solicitudes = [solicitudCreada, ...this.solicitudes];
        this.solicitudActual = solicitudCreada;
        this.showNuevaSolicitudModal = false;
        this.aplicarFiltros();
        this.iniciarProyectoDesdeSolicitud(solicitudCreada, true);
      },
      error: (error) => {
        console.error('Error al crear solicitud:', error);
      }
    });
  }

  // Modal Proceso Proyecto
  cerrarProcesoProyecto(): void { this.showProcesoProyectoModal = false; }

  onCancelarProyectoDesdeModal(evento: {motivo: string}): void {
    if (!this.proyectoActual) return;

    this.solicitudesService
      .actualizarProyecto(this.proyectoActual.id, { motivoCancelacion: evento.motivo })
      .pipe(switchMap(() => this.solicitudesService.cambiarEstadoProyecto(this.proyectoActual!.id, 'Cancelado')))
      .subscribe({
        next: (proyectoCancelado) => this.sincronizarProyectoEnMemoria(proyectoCancelado),
        error: (error) => console.error('Error al cancelar proyecto:', error)
      });
  }

  onFinalizarEtapa(etapa: EtapaProyecto): void {
    if (!this.proyectoActual) return;

    this.solicitudesService.completarEtapa(this.proyectoActual.id, etapa.id).subscribe({
      next: (etapaActualizada) => {
        if (!this.proyectoActual) return;
        const etapas = this.proyectoActual.etapas || [];
        const index = etapas.findIndex((e) => e.id === etapaActualizada.id);
        if (index >= 0) {
          etapas[index] = { ...etapaActualizada };
        } else {
          etapas.push(etapaActualizada);
        }
        this.proyectoActual = { ...this.proyectoActual, etapas: [...etapas] };
        this.onProyectoActualizado(this.proyectoActual);
      },
      error: (error) => console.error('Error al completar etapa:', error)
    });
  }

  onFinalizarProyecto(proyecto: Proyecto): void {
    this.solicitudesService.finalizarProyecto(proyecto.id).subscribe({
      next: (proyectoFinalizado) => this.sincronizarProyectoEnMemoria(proyectoFinalizado),
      error: (error) => console.error('Error al finalizar proyecto:', error)
    });
  }

  onInfoProyectoActualizada(info: { costo: number; fechaInicio: string; fechaFin: string }): void {
    if (!this.proyectoActual) return;

    this.proyectoActual.costo = info.costo;
    this.proyectoActual.fechaInicio = info.fechaInicio;
    this.proyectoActual.fechaFinalizacion = info.fechaFin || this.proyectoActual.fechaFinalizacion;
    this.onProyectoActualizado(this.proyectoActual);
  }

  onProyectoActualizado(proyectoActualizado: Proyecto): void {
    this.solicitudesService.actualizarProyecto(proyectoActualizado.id, proyectoActualizado).subscribe({
      next: (proyectoGuardado) => this.sincronizarProyectoEnMemoria(proyectoGuardado),
      error: (error) => console.error('Error al guardar cambios del proyecto:', error)
    });
  }

  onCambiarProyecto(proyectoId: number): void {
    this.solicitudesService.obtenerProyectoPorId(proyectoId).subscribe({
      next: (proyecto) => {
        this.sincronizarProyectoEnMemoria(proyecto);
        this.proyectoActual = proyecto;
        const solicitud = this.solicitudes.find(s => s.id === proyecto.solicitudId);
        if (solicitud) {
          this.solicitudActual = solicitud;
        }
      },
      error: (error) => console.error('Error al cambiar proyecto:', error)
    });
  }

  // Acciones desde tabla
  abrirProcesoDesdeTabla(solicitud: Solicitud): void {
    this.solicitudActual = solicitud;
    const proyecto = this.proyectos.find(p => p.solicitudId === solicitud.id);
    if (proyecto) {
      this.solicitudesService.obtenerProyectoPorId(proyecto.id).subscribe({
        next: (proyectoActualizado) => {
          this.sincronizarProyectoEnMemoria(proyectoActualizado);
          this.proyectoActual = proyectoActualizado;
          this.showProcesoProyectoModal = true;
        },
        error: () => {
          this.proyectoActual = proyecto;
          this.showProcesoProyectoModal = true;
        }
      });
      return;
    }

    this.iniciarProyectoDesdeSolicitud(solicitud, true);
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

  getFechaUltimaActualizacion(solicitud: Solicitud): Date | undefined {
    const proyecto = this.proyectos.find((p) => p.solicitudId === solicitud.id);
    const desdeProyecto = proyecto?.fechaActualizacion ? new Date(proyecto.fechaActualizacion) : undefined;
    const desdeSolicitud = solicitud.fechaActualizacion ? new Date(solicitud.fechaActualizacion) : undefined;

    if (desdeProyecto && !Number.isNaN(desdeProyecto.getTime())) {
      return desdeProyecto;
    }
    if (desdeSolicitud && !Number.isNaN(desdeSolicitud.getTime())) {
      return desdeSolicitud;
    }
    return solicitud.fechaSolicitud;
  }

  private iniciarProyectoDesdeSolicitud(solicitud: Solicitud, abrirModal = false): void {
    const procesoDefaultId = this.procesos[0]?.id;
    if (!procesoDefaultId) {
      this.solicitudesService.obtenerProcesos().subscribe({
        next: (procesos) => {
          this.procesos = procesos || [];
          if (!this.procesos.length) {
            console.warn('No hay procesos activos disponibles. La solicitud fue creada y quedo pendiente de asociacion a proyecto.');
            this.aplicarFiltros();
            return;
          }
          this.iniciarProyectoDesdeSolicitud(solicitud, abrirModal);
        },
        error: (error) => {
          console.error('Error al obtener procesos para iniciar proyecto:', error);
        }
      });
      return;
    }

    this.solicitudesService.iniciarProyecto(solicitud, procesoDefaultId).subscribe({
      next: (proyectoCreado) => {
        this.sincronizarProyectoEnMemoria(proyectoCreado);
        this.proyectoActual = proyectoCreado;
        this.solicitudActual = this.solicitudes.find(s => s.id === proyectoCreado.solicitudId) || solicitud;
        if (abrirModal) {
          this.showProcesoProyectoModal = true;
        }
      },
      error: (error) => {
        if (error?.status === 400 && String(error?.error?.message || '').toLowerCase().includes('proceso activo')) {
          this.procesos = [];
          this.iniciarProyectoDesdeSolicitud(solicitud, abrirModal);
          return;
        }
        console.error('Error al iniciar proyecto desde solicitud:', error);
      }
    });
  }

  private sincronizarProyectoEnMemoria(proyectoActualizado: Proyecto): void {
    const indexProyecto = this.proyectos.findIndex(p => p.id === proyectoActualizado.id);
    if (indexProyecto !== -1) {
      this.proyectos[indexProyecto] = { ...proyectoActualizado };
    } else {
      this.proyectos.unshift({ ...proyectoActualizado });
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
        fechaInicio: proyectoActualizado.fechaInicio || solicitud.fechaInicio,
        fechaFin: proyectoActualizado.fechaFinalizacion || solicitud.fechaFin,
        estado: proyectoActualizado.estado,
        fechaActualizacion: this.toDate(proyectoActualizado.fechaActualizacion)
      };
      this.solicitudActual = this.solicitudes[indexSolicitud];
    }

    if (this.proyectoActual?.id === proyectoActualizado.id) {
      this.proyectoActual = { ...proyectoActualizado };
    }

    this.aplicarFiltros();
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

  private toDate(value?: Date | string): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
}
