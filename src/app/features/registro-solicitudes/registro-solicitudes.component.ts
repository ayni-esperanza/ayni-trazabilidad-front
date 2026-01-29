import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistroSolicitudesService } from './services/registro-solicitudes.service';
import { ModalNuevaSolicitudComponent } from './components/modal-nueva-solicitud/modal-nueva-solicitud.component';
import { ModalIniciarProyectoComponent } from './components/modal-iniciar-proyecto/modal-iniciar-proyecto.component';
import { ModalProcesoProyectoComponent } from './components/modal-proceso-proyecto/modal-proceso-proyecto.component';
import { Solicitud, Proyecto, EtapaProyecto, Responsable, ProcesoSimple } from './models/solicitud.model';
import { PaginacionComponent, PaginacionConfig, CambioPaginaEvent } from '../../shared/components/paginacion/paginacion.component';

@Component({
  selector: 'app-registro-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalNuevaSolicitudComponent, ModalIniciarProyectoComponent, ModalProcesoProyectoComponent, PaginacionComponent],
  templateUrl: './registro-solicitudes.component.html',
  styleUrls: ['./registro-solicitudes.component.css']
})
export class RegistroSolicitudesComponent implements OnInit {
  
  // Estados de las modales
  showNuevaSolicitudModal = false;
  showIniciarProyectoModal = false;
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

  // Paginación
  paginacionConfig: PaginacionConfig = {
    paginaActual: 0,
    porPagina: 10,
    totalElementos: 0,
    totalPaginas: 0
  };

  // Datos temporales
  solicitudActual: Solicitud | null = null;
  proyectoActual: Proyecto | null = null;

  constructor(private solicitudesService: RegistroSolicitudesService) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
    this.aplicarFiltros();
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

    this.solicitudesFiltradas = resultado;
    this.actualizarPaginacion();
  }

  actualizarPaginacion(): void {
    this.paginacionConfig.totalElementos = this.solicitudesFiltradas.length;
    this.paginacionConfig.totalPaginas = Math.ceil(
      this.solicitudesFiltradas.length / this.paginacionConfig.porPagina
    );
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

  onCambioTamano(nuevoTamano: number): void {
    this.paginacionConfig.porPagina = nuevoTamano;
    this.paginacionConfig.paginaActual = 0;
    this.aplicarFiltros();
  }

  cargarDatosIniciales(): void {
    this.responsables = [
      { id: 1, nombre: 'Juan Pérez', cargo: 'Gerente de Proyecto' },
      { id: 2, nombre: 'María García', cargo: 'Desarrollador Senior' },
      { id: 3, nombre: 'Carlos López', cargo: 'Analista' },
      { id: 4, nombre: 'Ana Martínez', cargo: 'QA Lead' }
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
      { id: 1, nombreProyecto: 'Sistema ERP', cliente: 'Empresa ABC', costo: 50000, responsableId: 1, responsableNombre: 'Juan Pérez', descripcion: 'Implementación ERP', estado: 'Pendiente' },
      { id: 2, nombreProyecto: 'App Móvil', cliente: 'Startup XYZ', costo: 25000, responsableId: 2, responsableNombre: 'María García', descripcion: 'Desarrollo app', estado: 'En Proceso' }
    ];

    this.proyectos = [
      { id: 1, solicitudId: 2, nombreProyecto: 'App Móvil', cliente: 'Startup XYZ', costo: 25000, responsableId: 2, responsableNombre: 'María García', descripcion: 'Desarrollo app', fechaInicio: new Date('2026-01-15'), fechaFinalizacion: new Date('2026-06-15'), procesoId: 1, procesoNombre: 'Proceso de Desarrollo', estado: 'En Proceso', etapaActual: 2 }
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
      costo: data.costo!, responsableId: Number(data.responsableId), responsableNombre: responsable?.nombre,
      descripcion: data.descripcion!, fechaSolicitud: new Date(), estado: 'Pendiente'
    };
    this.solicitudes.push(solicitud);
    this.solicitudActual = solicitud;
    this.showNuevaSolicitudModal = false;
    this.showIniciarProyectoModal = true;
  }

  // Modal Iniciar Proyecto
  cerrarIniciarProyecto(): void { this.showIniciarProyectoModal = false; }

  onCancelarProyecto(): void {
    if (this.solicitudActual) this.solicitudActual.estado = 'Cancelado';
    this.showIniciarProyectoModal = false;
  }

  onIniciarProyecto(data: Partial<Proyecto>): void {
    const responsable = this.responsables.find(r => r.id === Number(data.responsableId));
    const proceso = this.procesos.find(p => p.id === Number(data.procesoId));
    const proyecto: Proyecto = {
      id: this.proyectos.length + 1, solicitudId: this.solicitudActual?.id || 0, nombreProyecto: data.nombreProyecto!,
      cliente: data.cliente!, costo: data.costo!, responsableId: Number(data.responsableId), responsableNombre: responsable?.nombre,
      descripcion: data.descripcion!, fechaInicio: new Date(data.fechaInicio!), fechaFinalizacion: new Date(data.fechaFinalizacion!),
      procesoId: Number(data.procesoId), procesoNombre: proceso?.nombre, estado: 'En Proceso', etapaActual: 1
    };
    this.proyectos.push(proyecto);
    if (this.solicitudActual) {
      this.solicitudActual.estado = 'En Proceso';
      const i = this.solicitudes.findIndex(s => s.id === this.solicitudActual!.id);
      if (i !== -1) this.solicitudes[i] = this.solicitudActual;
    }
    this.proyectoActual = proyecto;
    this.showIniciarProyectoModal = false;
    this.showProcesoProyectoModal = true;
  }

  // Modal Proceso Proyecto
  cerrarProcesoProyecto(): void { this.showProcesoProyectoModal = false; }

  onCancelarProyectoDesdeModal(): void {
    if (this.proyectoActual) {
      const pi = this.proyectos.findIndex(p => p.id === this.proyectoActual!.id);
      if (pi !== -1) this.proyectos[pi].estado = 'Cancelado';
      const si = this.solicitudes.findIndex(s => s.id === this.proyectoActual!.solicitudId);
      if (si !== -1) this.solicitudes[si].estado = 'Cancelado';
    }
    this.showProcesoProyectoModal = false;
  }

  onFinalizarEtapa(etapa: EtapaProyecto): void { console.log('Etapa finalizada:', etapa); }

  onFinalizarProyecto(proyecto: Proyecto): void {
    console.log('Proyecto finalizado:', proyecto);
    // Actualizar el proyecto en la lista
    const index = this.proyectos.findIndex(p => p.id === proyecto.id);
    if (index >= 0) {
      this.proyectos[index] = { ...proyecto, estado: 'Finalizado' };
    }
    // Actualizar estado de la solicitud asociada
    const solicitud = this.solicitudes.find(s => s.id === proyecto.solicitudId);
    if (solicitud) {
      solicitud.estado = 'Completado';
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
