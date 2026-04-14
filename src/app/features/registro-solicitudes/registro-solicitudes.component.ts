import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { AdjuntosPreviewService } from '../../shared/services/adjuntos-preview.service';
import { RegistroSolicitudesService } from './services/registro-solicitudes.service';
import { ModalNuevaSolicitudComponent } from './components/modal-nueva-solicitud/modal-nueva-solicitud.component';
import { ModalProcesoProyectoComponent } from './components/modal-proceso-proyecto/modal-proceso-proyecto.component';
import { Solicitud, Proyecto, EtapaProyecto, Responsable, ProcesoSimple, FlujoNodo, FlujoAdjunto, ComentarioAdicionalActividad, EstadoTarea, OrdenCompra } from './models/solicitud.model';
import { PaginacionComponent, PaginacionConfig, CambioPaginaEvent } from '../../shared/components/paginacion/paginacion.component';
import { ConfirmDeleteModalComponent, ConfirmDeleteConfig } from '../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { forkJoin } from 'rxjs';

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
  mostrarFiltroFechas = false;

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
  private readonly proyectosConFlujoSolicitado = new Set<number>();
  mostrarVistaPreviaAdjuntoTimeline = false;
  adjuntoVistaPreviaTimelineNombre = '';
  fuenteVistaPreviaAdjuntoTimeline = '';
  htmlVistaPreviaAdjuntoTimeline: SafeHtml | null = null;
  cargandoVistaPreviaAdjuntoTimeline = false;
  private fuenteVistaPreviaAdjuntoTimelineEsBlob = false;
  private adjuntoVistaPreviaTimelineEsPdf = false;
  private adjuntoVistaPreviaTimelineEsOffice = false;

  constructor(
    private solicitudesService: RegistroSolicitudesService,
    private readonly sanitizer: DomSanitizer,
    private readonly adjuntosPreviewService: AdjuntosPreviewService
  ) {}

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

  toggleFiltroFechas(): void {
    this.mostrarFiltroFechas = !this.mostrarFiltroFechas;
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
      solicitudes: this.solicitudesService.obtenerSolicitudes(),
      proyectos: this.solicitudesService.obtenerProyectos()
    }).subscribe({
      next: ({ responsables, solicitudes, proyectos }) => {
        this.responsables = responsables || [];
        this.procesos = [];
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

    this.solicitudesService.cancelarProyecto(this.proyectoActual.id, evento.motivo).subscribe({
      next: (proyectoCancelado) => this.sincronizarProyectoEnMemoria(proyectoCancelado),
      error: (error) => console.error('Error al cancelar proyecto:', error)
    });
  }

  onFinalizarEtapa(etapa: EtapaProyecto): void {
    if (!this.proyectoActual) return;

    const etapas = this.proyectoActual.etapas || [];
    const index = etapas.findIndex((e) => e.id === etapa.id);
    if (index >= 0) {
      etapas[index] = { ...etapa, estado: 'Completado' };
    } else {
      etapas.push({ ...etapa, estado: 'Completado' });
    }

    this.proyectoActual = { ...this.proyectoActual, etapas: [...etapas] };
    this.onProyectoActualizado(this.proyectoActual);
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
    if (proyecto) {
      this.cargarFlujoProyecto(proyecto.id);
    }
    return proyecto?.flujo?.nodos || [];
  }

  getFlujoTimeline(solicitudId: number | undefined): FlujoNodo[] {
    const nodos = this.getFlujoNodos(solicitudId).filter((nodo) => nodo.tipo !== 'inicio');
    const proyecto = this.proyectos.find((item) => item.solicitudId === solicitudId);
    const nodosOrdenCompra = this.mapearOrdenesCompraTimeline(proyecto?.ordenesCompra || []);

    return [...nodos, ...nodosOrdenCompra].sort((a, b) => {
      const fechaA = this.getTimelineNodeSortValue(a);
      const fechaB = this.getTimelineNodeSortValue(b);

      if (fechaA !== fechaB) {
        return fechaB - fechaA;
      }

      return Math.abs(Number(b.id || 0)) - Math.abs(Number(a.id || 0));
    });
  }

  esNodoOrdenCompraTimeline(nodo: FlujoNodo): boolean {
    return !!(nodo as any)?.esOrdenCompra;
  }

  getSiguientesNombres(nodos: FlujoNodo[], nodo: FlujoNodo): string {
    if (!nodo.siguientesIds.length) return 'Sin conexiones';
    const nombres = nodo.siguientesIds
      .map(id => nodos.find(n => n.id === id)?.nombre)
      .filter((nombre): nombre is string => !!nombre);
    return nombres.length ? nombres.join(', ') : 'Sin conexiones';
  }

  getComentariosActividadTimeline(solicitudId: number | undefined, actividadId: number): ComentarioAdicionalActividad[] {
    if (!solicitudId || !actividadId) return [];
    if (actividadId < 0) return [];

    const proyecto = this.proyectos.find((p) => p.solicitudId === solicitudId);
    return (proyecto?.comentariosAdicionalesActividad || [])
      .filter((comentario) => comentario.actividadId === actividadId)
      .sort((a, b) => {
        const fechaA = this.toDate(a.fechaComentario)?.getTime() || 0;
        const fechaB = this.toDate(b.fechaComentario)?.getTime() || 0;

        if (fechaA !== fechaB) {
          return fechaB - fechaA;
        }

        return b.id - a.id;
      });
  }

  getComentariosPreviosActividadTimeline(solicitudId: number | undefined, actividadId: number): ComentarioAdicionalActividad[] {
    const comentarios = this.getComentariosActividadTimeline(solicitudId, actividadId);
    if (!this.esProyectoCompletadoTimeline(solicitudId)) {
      return comentarios;
    }

    return this.esActividadSeguimientoTimelinePorId(solicitudId, actividadId) ? [] : comentarios;
  }

  getComentariosSeguimientoActividadTimeline(solicitudId: number | undefined, actividadId: number): ComentarioAdicionalActividad[] {
    if (!this.esProyectoCompletadoTimeline(solicitudId)) {
      return [];
    }

    return this.esActividadSeguimientoTimelinePorId(solicitudId, actividadId)
      ? this.getComentariosActividadTimeline(solicitudId, actividadId)
      : [];
  }

  esComentarioSeguimientoActividadTimeline(solicitudId: number | undefined, comentario: ComentarioAdicionalActividad): boolean {
    return this.esActividadSeguimientoTimelinePorId(solicitudId, Number(comentario?.actividadId));
  }

  mostrarDivisorSeguimientoComentarioTimeline(
    solicitudId: number | undefined,
    nodo: FlujoNodo,
    index: number
  ): boolean {
    if (!this.esProyectoCompletadoTimeline(solicitudId)) return false;
    return this.esActividadSeguimientoTimeline(solicitudId, nodo) && index === 0;
  }

  esProyectoCompletadoTimeline(solicitudId: number | undefined): boolean {
    if (!solicitudId) return false;
    const proyecto = this.proyectos.find((item) => item.solicitudId === solicitudId);
    return proyecto?.estado === 'Completado' || proyecto?.estado === 'Finalizado';
  }

  getAdjuntoUrl(adjunto: FlujoAdjunto): string | null {
    return this.adjuntosPreviewService.getAdjuntoUrl({
      nombre: adjunto?.nombre,
      tipo: (adjunto as any)?.tipo,
      dataUrl: adjunto?.dataUrl,
      url: (adjunto as any)?.url
    });
  }

  puedeVistaPreviaAdjuntoTimeline(adjunto: FlujoAdjunto): boolean {
    return this.adjuntosPreviewService.puedeVistaPrevia({
      nombre: adjunto?.nombre,
      tipo: (adjunto as any)?.tipo,
      dataUrl: adjunto?.dataUrl,
      url: (adjunto as any)?.url
    });
  }

  async verAdjuntoTimeline(adjunto: FlujoAdjunto): Promise<void> {
    if (!this.puedeVistaPreviaAdjuntoTimeline(adjunto)) return;

    this.cerrarVistaPreviaAdjuntoTimeline();
    this.cargandoVistaPreviaAdjuntoTimeline = false;
    this.htmlVistaPreviaAdjuntoTimeline = null;

    const fuente = this.getAdjuntoUrl(adjunto);
    if (!fuente) return;

    this.adjuntoVistaPreviaTimelineNombre = this.adjuntosPreviewService.getNombre({
      nombre: adjunto?.nombre,
      dataUrl: adjunto?.dataUrl,
      url: (adjunto as any)?.url
    });

    if (this.esAdjuntoOfficeTimeline(adjunto)) {
      this.adjuntoVistaPreviaTimelineEsOffice = true;
      this.mostrarVistaPreviaAdjuntoTimeline = true;
      this.cargandoVistaPreviaAdjuntoTimeline = true;

      try {
        const html = await this.adjuntosPreviewService.generarHtmlPreviewOffice({
          nombre: adjunto?.nombre,
          tipo: (adjunto as any)?.tipo,
          dataUrl: adjunto?.dataUrl,
          url: (adjunto as any)?.url
        });
        this.htmlVistaPreviaAdjuntoTimeline = this.sanitizer.bypassSecurityTrustHtml(html);
      } catch (error) {
        console.error('Error generando vista previa Office en timeline:', error);
        this.htmlVistaPreviaAdjuntoTimeline = this.sanitizer.bypassSecurityTrustHtml(
          this.adjuntosPreviewService.generarMensajePreviewHtml('No se pudo generar la vista previa del archivo.')
        );
      } finally {
        this.cargandoVistaPreviaAdjuntoTimeline = false;
      }
      return;
    }

    this.fuenteVistaPreviaAdjuntoTimeline = fuente;
    this.adjuntoVistaPreviaTimelineEsPdf = this.esAdjuntoPdfTimeline(adjunto);
    this.adjuntoVistaPreviaTimelineEsOffice = false;
    this.fuenteVistaPreviaAdjuntoTimelineEsBlob = false;
    this.mostrarVistaPreviaAdjuntoTimeline = true;
  }

  async descargarAdjuntoTimeline(adjunto: FlujoAdjunto): Promise<void> {
    await this.adjuntosPreviewService.descargarAdjunto({
      nombre: adjunto?.nombre,
      tipo: (adjunto as any)?.tipo,
      dataUrl: adjunto?.dataUrl,
      url: (adjunto as any)?.url
    });
  }

  obtenerFuenteVistaPreviaAdjuntoTimelinePdf(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.fuenteVistaPreviaAdjuntoTimeline);
  }

  obtenerFuenteVistaPreviaAdjuntoTimelineImagen(): string {
    return this.fuenteVistaPreviaAdjuntoTimeline;
  }

  obtenerHtmlVistaPreviaAdjuntoTimeline(): SafeHtml {
    return this.htmlVistaPreviaAdjuntoTimeline || this.sanitizer.bypassSecurityTrustHtml(
      this.adjuntosPreviewService.generarMensajePreviewHtml('Sin contenido para vista previa.')
    );
  }

  esPdfVistaPreviaAdjuntoTimeline(): boolean {
    return this.adjuntoVistaPreviaTimelineEsPdf;
  }

  esOfficeVistaPreviaAdjuntoTimeline(): boolean {
    return this.adjuntoVistaPreviaTimelineEsOffice;
  }

  cerrarVistaPreviaAdjuntoTimeline(): void {
    if (this.fuenteVistaPreviaAdjuntoTimelineEsBlob && this.fuenteVistaPreviaAdjuntoTimeline) {
      URL.revokeObjectURL(this.fuenteVistaPreviaAdjuntoTimeline);
    }
    this.mostrarVistaPreviaAdjuntoTimeline = false;
    this.adjuntoVistaPreviaTimelineNombre = '';
    this.fuenteVistaPreviaAdjuntoTimeline = '';
    this.htmlVistaPreviaAdjuntoTimeline = null;
    this.cargandoVistaPreviaAdjuntoTimeline = false;
    this.fuenteVistaPreviaAdjuntoTimelineEsBlob = false;
    this.adjuntoVistaPreviaTimelineEsPdf = false;
    this.adjuntoVistaPreviaTimelineEsOffice = false;
  }

  getEstadoTareaTimeline(nodo: FlujoNodo): EstadoTarea {
    if (this.esNodoOrdenCompraTimeline(nodo)) {
      return 'Completado';
    }
    return (nodo.estadoActividad || 'Pendiente') as EstadoTarea;
  }

  getEstadoTareaClass(estado: EstadoTarea): string {
    const clases: Record<EstadoTarea, string> = {
      Pendiente: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
      'En Proceso': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      Completado: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      Cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      Retrasado: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    };
    return clases[estado] || clases.Pendiente;
  }

  formatDateStandar(value?: string | Date): string {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{2}[-/]\d{2}[-/]\d{4}/.test(value)) {
      return value.replace(/\//g, '-');
    }
    
    let date: Date;
    if (typeof value === 'string') {
      const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
      if (isDateOnly) {
        const parts = value.split('-');
        date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else {
        date = new Date(value);
      }
    } else {
      date = value;
    }
    
    if (Number.isNaN(date.getTime())) return String(value);
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  }

  getRangoFechasTareaTimeline(nodo: FlujoNodo): string {
    const inicio = (nodo.fechaInicio || '').toString().trim();
    if (this.esNodoOrdenCompraTimeline(nodo)) {
      return inicio ? `Fecha OC: ${this.formatDateStandar(inicio)}` : 'Fecha OC no registrada';
    }
    if (inicio) return this.formatDateStandar(inicio);
    return 'Sin fecha asignada';
  }

  esActividadSeguimientoTimeline(solicitudId: number | undefined, nodo: FlujoNodo): boolean {
    if (!solicitudId || this.esNodoOrdenCompraTimeline(nodo)) return false;
    return this.esTipoActividadSeguimiento(nodo?.tipoActividad);
  }

  mostrarSeparadorActividadesSeguimientoTimeline(
    solicitudId: number | undefined,
    nodo: FlujoNodo,
    index: number,
    lista: FlujoNodo[]
  ): boolean {
    // La lista está ordenada de más reciente a más antiguo
    if (this.esActividadSeguimientoTimeline(solicitudId, nodo)) return false;
    if (index === 0) return false;

    const anterior = lista[index - 1];
    return this.esActividadSeguimientoTimeline(solicitudId, anterior);
  }

  private esActividadSeguimientoTimelinePorId(solicitudId: number | undefined, actividadId: number): boolean {
    if (!solicitudId) return false;
    const nodo = this.getFlujoNodos(solicitudId).find((item) => Number(item.id) === Number(actividadId));
    if (!nodo) return false;
    return this.esActividadSeguimientoTimeline(solicitudId, nodo);
  }

  private esTipoActividadSeguimiento(tipo?: string): boolean {
    return String(tipo || '').trim().toUpperCase() === 'SEGUIMIENTO';
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
    this.solicitudesService.iniciarProyecto(solicitud).subscribe({
      next: (proyectoCreado) => {
        this.sincronizarProyectoEnMemoria(proyectoCreado);
        this.proyectoActual = proyectoCreado;
        this.solicitudActual = this.solicitudes.find(s => s.id === proyectoCreado.solicitudId) || solicitud;
        if (abrirModal) {
          this.showProcesoProyectoModal = true;
        }
      },
      error: (error) => {
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
        estado: this.mapEstadoProyectoASolicitud(proyectoActualizado.estado),
        fechaActualizacion: this.toDate(proyectoActualizado.fechaActualizacion)
      };
      this.solicitudActual = this.solicitudes[indexSolicitud];
    }

    if (this.proyectoActual?.id === proyectoActualizado.id) {
      this.proyectoActual = { ...proyectoActualizado };
    }

    this.aplicarFiltros();
  }

  private cargarFlujoProyecto(proyectoId: number): void {
    if (this.proyectosConFlujoSolicitado.has(proyectoId)) return;

    this.proyectosConFlujoSolicitado.add(proyectoId);
    this.solicitudesService.obtenerProyectoPorId(proyectoId).subscribe({
      next: (proyectoDetallado) => {
        const indexProyecto = this.proyectos.findIndex((p) => p.id === proyectoId);
        if (indexProyecto !== -1) {
          this.proyectos[indexProyecto] = {
            ...this.proyectos[indexProyecto],
            ...proyectoDetallado
          };
        }

        if (this.proyectoActual?.id === proyectoId) {
          this.proyectoActual = {
            ...this.proyectoActual,
            ...proyectoDetallado
          };
        }
      },
      error: () => {
        // Permite reintentar automáticamente en próximos ciclos de render.
        this.proyectosConFlujoSolicitado.delete(proyectoId);
      }
    });
  }

  private mapEstadoProyectoASolicitud(estado: Proyecto['estado']): Solicitud['estado'] {
    if (estado === 'Cancelado') return 'Cancelado';
    if (estado === 'Completado' || estado === 'Finalizado') return 'Completado';
    return 'En Proceso';
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


  private mapearOrdenesCompraTimeline(ordenes: OrdenCompra[]): FlujoNodo[] {
    return (ordenes || [])
      .map((orden, index) => {
        const numero = (orden.numero || '').trim();
        const fecha = (orden.fecha || '').trim();
        const tipo = (orden.tipo || 'OTROS').trim();
        const numeroLicitacion = (orden.numeroLicitacion || '').trim();
        const numeroSolicitud = (orden.numeroSolicitud || '').trim();
        const total = Number(orden.total || 0);

        if (!numero && !fecha && total <= 0) return null;

        const identificador = Number(orden.id || 0) > 0
          ? Number(orden.id || 0)
          : (index + 1);

        const descripcion = [
          `Orden de compra: ${numero || '-'}`,
          `Tipo: ${tipo || 'OTROS'}`,
          `N° licitacion: ${numeroLicitacion || '-'}`,
          `N° solicitud: ${numeroSolicitud || '-'}`,
          `Total sin IGV: S/ ${total.toFixed(2)}`
        ].join(' | ');

        return {
          id: -(100000 + identificador),
          nombre: `Orden de compra ${numero || `#${index + 1}`}`,
          tipo: 'tarea' as const,
          estadoActividad: 'Completado' as EstadoTarea,
          fechaInicio: fecha || undefined,
          fechaFin: fecha || undefined,
          fechaCambioEstado: fecha || undefined,
          responsableNombre: 'Compras',
          descripcion,
          adjuntos: (orden.adjuntos || []).map((adjunto) => ({ ...adjunto })),
          siguientesIds: [],
          esOrdenCompra: true
        } as FlujoNodo;
      })
      .filter((nodo): nodo is FlujoNodo => !!nodo);
  }

  private getTimelineNodeSortValue(nodo: FlujoNodo): number {
    const fecha = this.getTimelineDateValue(nodo.fechaCambioEstado || nodo.fechaInicio);
    if (fecha && !Number.isNaN(fecha)) return fecha;
    return Math.abs(Number(nodo.id || 0));
  }

  private getTimelineDateValue(value?: Date | string): number {
    if (!value) return 0;

    if (value instanceof Date) {
      const time = value.getTime();
      return Number.isNaN(time) ? 0 : time;
    }

    const raw = String(value).trim();
    if (!raw) return 0;

    const yyyyMmDd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyyMmDd) {
      const [, y, m, d] = yyyyMmDd;
      const localDate = new Date(Number(y), Number(m) - 1, Number(d));
      const time = localDate.getTime();
      return Number.isNaN(time) ? 0 : time;
    }

    const ddMmYyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (ddMmYyyy) {
      const [, d, m, y, hh, mm, ss] = ddMmYyyy;
      const localDate = new Date(
        Number(y),
        Number(m) - 1,
        Number(d),
        Number(hh || '0'),
        Number(mm || '0'),
        Number(ss || '0')
      );
      const time = localDate.getTime();
      return Number.isNaN(time) ? 0 : time;
    }

    const yyyyMmDdLocalTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (yyyyMmDdLocalTime) {
      const [, y, m, d, hh, mm, ss] = yyyyMmDdLocalTime;
      const localDate = new Date(
        Number(y),
        Number(m) - 1,
        Number(d),
        Number(hh),
        Number(mm),
        Number(ss || '0')
      );
      const time = localDate.getTime();
      return Number.isNaN(time) ? 0 : time;
    }

    const date = new Date(raw);
    const time = date.getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  private esAdjuntoPdfTimeline(adjunto: FlujoAdjunto): boolean {
    return this.adjuntosPreviewService.esPdf({
      nombre: adjunto?.nombre,
      tipo: (adjunto as any)?.tipo,
      dataUrl: adjunto?.dataUrl,
      url: (adjunto as any)?.url
    });
  }

  private esAdjuntoImagenTimeline(adjunto: FlujoAdjunto): boolean {
    return this.adjuntosPreviewService.esImagen({
      nombre: adjunto?.nombre,
      tipo: (adjunto as any)?.tipo,
      dataUrl: adjunto?.dataUrl,
      url: (adjunto as any)?.url
    });
  }

  private esAdjuntoOfficeTimeline(adjunto: FlujoAdjunto): boolean {
    return this.adjuntosPreviewService.esOffice({
      nombre: adjunto?.nombre,
      tipo: (adjunto as any)?.tipo,
      dataUrl: adjunto?.dataUrl,
      url: (adjunto as any)?.url
    });
  }
}
