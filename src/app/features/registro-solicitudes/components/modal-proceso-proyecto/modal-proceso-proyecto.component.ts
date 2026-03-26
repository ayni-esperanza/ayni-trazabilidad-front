import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Proyecto, EtapaProyecto, TareaAsignada, Responsable, ProcesoSimple, OrdenCompra, FlujoNodo, FlujoAdjunto } from '../../models/solicitud.model';
import { ModalDismissDirective } from '../../../../shared/directives/modal-dismiss.directive';
import { ConfirmDeleteModalComponent, ConfirmDeleteConfig } from '../../../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { TareaFormModalComponent, Tarea } from '../../../../shared/components/tarea-form-modal/tarea-form-modal.component';
import { TabProcesoComponent } from './components/tab-proceso/tab-proceso.component';
import { TabInformacionComponent } from './components/tab-informacion/tab-informacion.component';
import { TabCostosComponent } from './components/tab-costos/tab-costos.component';
import { RegistroSolicitudesService } from '../../services/registro-solicitudes.service';
import { forkJoin, Observable, of } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';

// Interfaces para Costos
export interface MaterialCosto {
  id: number;
  fecha: string;
  nroComprobante: string;
  producto: string;
  cantidad: number | null;
  costoUnitario: number | null;
  costoTotal: number;
  encargado: string;
  dependenciaActividadId?: number | null;
}

export interface ManoObraCosto {
  id: number;
  trabajador: string;
  cargo: string;
  diasTrabajando: number | null;
  costoPorDia: number | null;
  costoTotal: number;
  dependenciaActividadId?: number | null;
}

export interface OtroCosto {
  id: number;
  fecha: string;
  descripcion: string;
  cantidad: number | null;
  costoUnitario: number | null;
  costoTotal: number;
  encargado: string;
  dependenciaActividadId?: number | null;
}

export interface ActividadCostoOption {
  id: number;
  nombre: string;
}

export interface TablaCostoExtra {
  id: number;
  nombre: string;
  items: OtroCosto[];
  expandida: boolean;
}

type DocumentoResumen = {
  actividad: string;
  nombre: string;
  tipo: string;
  adjunto: FlujoAdjunto;
};

@Component({
  selector: 'app-modal-proceso-proyecto',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalDismissDirective, ConfirmDeleteModalComponent, TareaFormModalComponent, TabProcesoComponent, TabInformacionComponent, TabCostosComponent],
  templateUrl: './modal-proceso-proyecto.component.html',
  styleUrls: ['./modal-proceso-proyecto.component.css']
})
export class ModalProcesoProyectoComponent implements OnChanges {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly registroSolicitudesService = inject(RegistroSolicitudesService);

  @Input() visible = false;
  @Input() embedded = false;
  @Input() proyecto: Proyecto | null = null;
  @Input() proyectos: Proyecto[] = [];
  @Input() responsables: Responsable[] = [];
  @Input() procesos: ProcesoSimple[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @Output() cancelarProy = new EventEmitter<{motivo: string}>();
  @Output() finalizarEtapa = new EventEmitter<EtapaProyecto>();
  @Output() finalizarProy = new EventEmitter<Proyecto>();
  @Output() cambiarProyecto = new EventEmitter<number>();
  @Output() infoActualizada = new EventEmitter<{ costo: number; fechaInicio: string; fechaFin: string }>();
  @Output() proyectoActualizado = new EventEmitter<Proyecto>();



  etapas: EtapaProyecto[] = [];
  proyectoFinalizado = false;
  proyectoCancelado = false;
  infoProyectoExpandida = false;
  mostrarConfeti = false;
  confetis: { id: number; tipo: string; color: string; left: number; delay: number; duration: number }[] = [];
  etapaSeleccionada: EtapaProyecto | null = null;
  proyectoSeleccionadoId = 0;

  // Modal de cancelación
  mostrarModalCancelacion = false;
  motivoCancelacion = '';
  
  // Modal de confirmación de cancelación
  mostrarConfirmacionCancelar = false;
  cargandoCancelacion = false;
  configCancelarModal: ConfirmDeleteConfig = {};

  // Vista previa de documentos
  mostrarVistaPreviaDocumento = false;
  documentoVistaPrevia: DocumentoResumen | null = null;
  fuenteVistaPreviaDocumento = '';
  private fuenteVistaPreviaDocumentoEsBlob = false;

  // Navegación de tabs
  tabActiva: 'tablero' | 'proceso' | 'informacion' | 'costos' = 'tablero';

  // Modal de actividades
  mostrarModalActividad = false;
  actividadParaEditar: Tarea | null = null;
  nodoPadreParaNuevoId: number | null = null;
  posicionInicialNuevaActividad: { x: number; y: number } | null = null;

  flujoNodos: FlujoNodo[] = [];
  private readonly flujoStoragePrefix = 'ayni:registro-solicitudes:flujo:';
  private readonly costosStoragePrefix = 'ayni:registro-solicitudes:costos-habilitados:';
  costosHabilitados = false;

  // Formulario de información del proyecto (tab Información)
  proyectoInfoForm = {
    nombreProyecto: '',
    cliente: '',
    representante: '',
    areas: [] as string[],
    ordenesCompra: [] as OrdenCompra[],
    costo: 0,
    procesoId: 0,
    responsableId: 0,
    fechaInicio: '',
    fechaFinalizacion: '',
    ubicacion: '',
    descripcion: ''
  };

  // TODO: Backend - Cargar costos desde el servicio
  // Estos arrays se llenarán con datos del backend
  materiales: MaterialCosto[] = [];
  manoObra: ManoObraCosto[] = [];
  tablasCostosExtras: TablaCostoExtra[] = [];
  sincronizandoCostos = false;

  etapaForm = {
    presupuesto: 0,
    responsableId: 0,
    fechaInicio: '',
    fechaFinalizacion: ''
  };

  // Control de validación para etapa
  intentoFinalizarEtapa = false;
  erroresEtapa: { [key: string]: string } = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyecto'] && this.proyecto) {
      this.proyectoSeleccionadoId = this.proyecto.id;
      this.proyectoFinalizado = this.proyecto.estado === 'Completado';
      this.proyectoCancelado = this.proyecto.estado === 'Cancelado';
      // Expandir automáticamente la información cuando el proyecto está finalizado o cancelado
      this.infoProyectoExpandida = this.proyectoFinalizado || this.proyectoCancelado;
      this.generarEtapas();
      this.cargarProyectoInfoForm();
      this.prepararFlujo();
      this.cargarCostosProyecto();

      if (this.tabActiva === 'costos' && !this.costosHabilitados) {
        this.tabActiva = 'tablero';
      }
    }
  }

  get todasEtapasCompletadas(): boolean {
    return this.etapas.length > 0 && this.etapas.every(e => e.estado === 'Completado');
  }

  get modoSoloLectura(): boolean {
    return this.proyectoFinalizado || this.proyectoCancelado || this.todasEtapasCompletadas;
  }

  generarEtapas(): void {
    if (!this.proyecto) return;

    // Si el proyecto ya tiene etapas guardadas, restaurarlas
    if (this.proyecto.etapas && this.proyecto.etapas.length > 0) {
      this.etapas = this.proyecto.etapas.map(e => ({ ...e }));
      if (this.etapas.length > 0) {
        this.seleccionarEtapa(this.etapas[0]);
      }
      return;
    }

    const proceso = this.procesos.find(p => p.id === this.proyecto!.procesoId);
    
    this.etapas = proceso?.etapas.map((etapa, index) => ({
      id: index + 1,
      proyectoId: this.proyecto!.id,
      etapaId: etapa.id,
      nombre: etapa.nombre,
      orden: etapa.orden,
      presupuesto: 0,
      responsableId: 0, // Cada etapa tendrá su propio responsable
      responsableNombre: '',
      fechaInicio: '', // Cada etapa tendrá sus propias fechas
      fechaFinalizacion: '',
      estado: index === 0 ? 'En Proceso' : 'Pendiente',
      tareas: this.generarTareasEjemplo(index + 1)
    })) || [];

    if (this.etapas.length > 0) {
      this.seleccionarEtapa(this.etapas[0]);
    }
  }

  generarTareasEjemplo(etapaId: number): TareaAsignada[] {
    return [
      { id: 1, etapaProyectoId: etapaId, responsableId: 1, responsableNombre: 'Ejemplo1', tarea: 'Ejemplo1', fechaInicio: new Date(), fechaFin: new Date(), estado: 'Retrasado' },
      { id: 2, etapaProyectoId: etapaId, responsableId: 1, responsableNombre: 'Ejemplo1', tarea: 'Ejemplo1', fechaInicio: new Date(), fechaFin: new Date(), estado: 'Retrasado' },
      { id: 3, etapaProyectoId: etapaId, responsableId: 2, responsableNombre: 'Ejemplo1', tarea: 'Ejemplo1', fechaInicio: new Date(), fechaFin: new Date(), estado: 'Completado' },
      { id: 4, etapaProyectoId: etapaId, responsableId: 3, responsableNombre: 'Ejemplo1', tarea: 'Ejemplo1', fechaInicio: new Date(), fechaFin: new Date(), estado: 'Completado' },
      { id: 5, etapaProyectoId: etapaId, responsableId: 4, responsableNombre: 'Ejemplo1', tarea: 'Ejemplo1', fechaInicio: new Date(), fechaFin: new Date(), estado: 'Completado' }
    ];
  }

  seleccionarEtapa(etapa: EtapaProyecto): void {
    // Guardar los cambios de la etapa actual antes de cambiar
    if (this.etapaSeleccionada && !this.modoSoloLectura) {
      this.guardarCambiosEtapaActual();
    }

    this.etapaSeleccionada = etapa;
    this.intentoFinalizarEtapa = false;
    this.erroresEtapa = {};
    
    // Asegurar que el responsableNombre esté actualizado si hay un responsableId
    if (etapa.responsableId && etapa.responsableId > 0 && !etapa.responsableNombre) {
      etapa.responsableNombre = this.getResponsableNombre(etapa.responsableId);
    }
    
    this.etapaForm = {
      presupuesto: etapa.presupuesto,
      responsableId: etapa.responsableId,
      fechaInicio: etapa.fechaInicio ? this.formatDate(etapa.fechaInicio) : '',
      fechaFinalizacion: etapa.fechaFinalizacion ? this.formatDate(etapa.fechaFinalizacion) : ''
    };
  }

  private guardarCambiosEtapaActual(): void {
    if (this.etapaSeleccionada) {
      // Actualizar los valores de la etapa con los del formulario
      this.etapaSeleccionada.presupuesto = this.etapaForm.presupuesto;
      this.etapaSeleccionada.responsableId = Number(this.etapaForm.responsableId);
      this.etapaSeleccionada.responsableNombre = this.getResponsableNombre(Number(this.etapaForm.responsableId));
      this.etapaSeleccionada.fechaInicio = this.etapaForm.fechaInicio;
      this.etapaSeleccionada.fechaFinalizacion = this.etapaForm.fechaFinalizacion;
      
      // Actualizar también en el array de etapas para mantener sincronización
      const index = this.etapas.findIndex(e => e.id === this.etapaSeleccionada!.id);
      if (index >= 0) {
        this.etapas[index] = { ...this.etapaSeleccionada };
      }
    }
  }

  cambiarTab(nuevoTab: 'tablero' | 'proceso' | 'informacion' | 'costos'): void {
    // Guardar cambios de la etapa actual antes de cambiar tab
    if (this.tabActiva === 'proceso' && this.etapaSeleccionada && !this.modoSoloLectura) {
      this.guardarCambiosEtapaActual();
    }
    this.tabActiva = nuevoTab;
  }

  private getEtapaAnterior(): EtapaProyecto | null {
    if (!this.etapaSeleccionada) return null;
    
    const index = this.etapas.findIndex(e => e.id === this.etapaSeleccionada!.id);
    return index > 0 ? this.etapas[index - 1] : null;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  onCerrar(): void {
    if (this.sincronizandoCostos) return;

    // Guardar cambios de la etapa actual antes de cerrar
    if (this.etapaSeleccionada && !this.modoSoloLectura) {
      this.guardarCambiosEtapaActual();
    }
    // Persistir etapas en el proyecto al cerrar
    this.guardarEtapasEnProyecto();
    this.sincronizarCostosProyecto().subscribe({
      complete: () => this.cerrar.emit(),
      error: () => this.cerrar.emit()
    });
  }

  guardarCostosProyecto(): void {
    if (!this.proyecto || this.modoSoloLectura || this.sincronizandoCostos) return;

    this.sincronizarCostosProyecto().subscribe({
      next: () => this.marcarActualizacionProyecto(),
      error: (error) => console.error('Error sincronizando costos:', error)
    });
  }

  onCancelarProyecto(): void {
    this.mostrarModalCancelacion = true;
    this.motivoCancelacion = '';
    this.mostrarConfirmacionCancelar = false;
  }

  cerrarModalCancelacion(): void {
    this.mostrarModalCancelacion = false;
    this.motivoCancelacion = '';
    this.mostrarConfirmacionCancelar = false;
  }

  onSolicitarConfirmacionCancelar(): void {
    if (this.motivoCancelacion.trim()) {
      this.configCancelarModal = {
        titulo: 'Cancelar proyecto',
        mensaje: `¿Está seguro de cancelar el proyecto "${this.proyecto?.nombreProyecto}"? Motivo: ${this.motivoCancelacion}`,
        cantidadElementos: 1,
        tipoElemento: 'proyecto',
        textoConfirmar: 'Sí, cancelar proyecto'
      };
      this.mostrarConfirmacionCancelar = true;
    }
  }

  async confirmarCancelacion(): Promise<void> {
    if (!this.motivoCancelacion.trim()) return;
    
    this.cargandoCancelacion = true;
    try {
      // Guardar etapas antes de cancelar para preservar datos ingresados
      if (this.etapaSeleccionada) {
        this.guardarCambiosEtapaActual();
      }
      this.guardarEtapasEnProyecto();
      this.marcarActualizacionProyecto();
      this.cancelarProy.emit({ motivo: this.motivoCancelacion });
      this.mostrarConfirmacionCancelar = false;
      this.mostrarModalCancelacion = false;
      this.motivoCancelacion = '';
    } finally {
      this.cargandoCancelacion = false;
    }
  }

  onCancelarConfirmacionCancelar(): void {
    this.mostrarConfirmacionCancelar = false;
  }

  onFinalizarEtapa(): void {
    this.intentoFinalizarEtapa = true;
    
    if (!this.validarEtapa()) return;

    if (this.etapaSeleccionada) {
      // Actualizar todos los campos de la etapa con valores independientes
      this.etapaSeleccionada.presupuesto = this.etapaForm.presupuesto;
      this.etapaSeleccionada.responsableId = Number(this.etapaForm.responsableId);
      this.etapaSeleccionada.responsableNombre = this.getResponsableNombre(Number(this.etapaForm.responsableId));
      this.etapaSeleccionada.fechaInicio = this.etapaForm.fechaInicio;
      this.etapaSeleccionada.fechaFinalizacion = this.etapaForm.fechaFinalizacion;
      this.etapaSeleccionada.estado = 'Completado';

      // Guardar etapas en el proyecto para persistir los datos
      this.guardarEtapasEnProyecto();
      this.marcarActualizacionProyecto();

      this.finalizarEtapa.emit(this.etapaSeleccionada);

      // Avanzar a siguiente etapa
      const index = this.etapas.findIndex(e => e.id === this.etapaSeleccionada!.id);
      if (index + 1 < this.etapas.length) {
        this.etapas[index + 1].estado = 'En Proceso';
        this.seleccionarEtapa(this.etapas[index + 1]);
      }
    }
  }

  validarEtapa(): boolean {
    this.erroresEtapa = {};

    if (!this.etapaForm.responsableId || Number(this.etapaForm.responsableId) === 0) {
      this.erroresEtapa['responsableId'] = 'Debe seleccionar un responsable';
    }
    if (!this.etapaForm.fechaInicio) {
      this.erroresEtapa['fechaInicio'] = 'La fecha de inicio es requerida';
    } else {
      const fechaInicioEtapa = new Date(this.etapaForm.fechaInicio);
      const fechaInicioProyecto = new Date(this.proyecto!.fechaInicio);
      
      if (fechaInicioEtapa < fechaInicioProyecto) {
        this.erroresEtapa['fechaInicio'] = 'La fecha de inicio no puede ser anterior al inicio del proyecto';
      }

      // Validar que no sea anterior a la fecha de fin de la etapa anterior
      const etapaAnterior = this.getEtapaAnterior();
      if (etapaAnterior && etapaAnterior.fechaFinalizacion) {
        const fechaFinAnterior = new Date(etapaAnterior.fechaFinalizacion);
        if (fechaInicioEtapa < fechaFinAnterior) {
          this.erroresEtapa['fechaInicio'] = 'La fecha de inicio no puede ser anterior al fin de la etapa anterior';
        }
      }
    }
    
    if (!this.etapaForm.fechaFinalizacion) {
      this.erroresEtapa['fechaFinalizacion'] = 'La fecha de finalización es requerida';
    } else {
      const fechaFinEtapa = new Date(this.etapaForm.fechaFinalizacion);
      const fechaFinProyecto = new Date(this.proyecto!.fechaFinalizacion);
      
      if (fechaFinEtapa > fechaFinProyecto) {
        this.erroresEtapa['fechaFinalizacion'] = 'La fecha de finalización no puede ser posterior al fin del proyecto';
      }
      
      if (this.etapaForm.fechaInicio && 
          new Date(this.etapaForm.fechaFinalizacion) < new Date(this.etapaForm.fechaInicio)) {
        this.erroresEtapa['fechaFinalizacion'] = 'La fecha de finalización debe ser posterior a la de inicio';
      }
    }

    return Object.keys(this.erroresEtapa).length === 0;
  }

  tieneErrorEtapa(campo: string): boolean {
    return this.intentoFinalizarEtapa && !!this.erroresEtapa[campo];
  }

  onCambiarProyecto(): void {
    this.cambiarProyecto.emit(Number(this.proyectoSeleccionadoId));
  }

  onFinalizarProyecto(): void {
    if (this.proyecto && !this.proyectoFinalizado && !this.proyectoCancelado) {
      this.proyecto.estado = 'Completado';
      this.proyectoFinalizado = true;
      // Guardar etapas en el proyecto antes de emitir
      this.guardarEtapasEnProyecto();
      this.marcarActualizacionProyecto();
      this.lanzarConfeti();
      this.finalizarProy.emit(this.proyecto);
    }
  }

  private guardarEtapasEnProyecto(): void {
    if (this.proyecto) {
      this.proyecto.etapas = this.etapas.map(e => ({ ...e }));
    }
  }

  lanzarConfeti(): void {
    const tipos = ['circle', 'square', 'triangle', 'star', 'ribbon'];
    const colores = [
      '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
    ];
    
    this.confetis = [];
    for (let i = 0; i < 60; i++) {
      this.confetis.push({
        id: i,
        tipo: tipos[Math.floor(Math.random() * tipos.length)],
        color: colores[Math.floor(Math.random() * colores.length)],
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2
      });
    }
    
    this.mostrarConfeti = true;
    setTimeout(() => {
      this.mostrarConfeti = false;
      this.confetis = [];
    }, 4500);
  }

  getResponsableNombre(responsableId: number): string {
    const resp = this.responsables.find(r => r.id === responsableId);
    return resp?.nombre || 'Sin asignar';
  }

  cargarProyectoInfoForm(): void {
    if (!this.proyecto) return;
    this.proyectoInfoForm = {
      nombreProyecto: this.proyecto.nombreProyecto,
      cliente: this.proyecto.cliente,
      representante: this.proyecto.representante || '',
      areas: [...(this.proyecto.areas || [])],
      ordenesCompra: (this.proyecto.ordenesCompra || []).map(o => ({
        ...o,
        tipo: this.normalizarTipoOrdenCompra(o.tipo),
        numeroLicitacion: o.numeroLicitacion || '',
        numeroSolicitud: o.numeroSolicitud || ''
      })),
      costo: this.proyecto.costo,
      procesoId: this.proyecto.procesoId,
      responsableId: this.proyecto.responsableId,
      fechaInicio: this.formatDate(this.proyecto.fechaInicio),
      fechaFinalizacion: this.formatDate(this.proyecto.fechaFinalizacion),
      ubicacion: this.proyecto.ubicacion || '',
      descripcion: this.proyecto.descripcion
    };
  }

  private normalizarTipoOrdenCompra(tipo?: string): string {
    const valor = (tipo || '').trim().toLowerCase();

    if (!valor) return 'SUMINISTRO';
    if (valor.includes('serv')) return 'SERVICIO';
    if (valor.includes('sumin') || valor.includes('material') || valor.includes('equipo')) return 'SUMINISTRO';

    return 'OTROS';
  }

  abrirModalActividad(nodo?: FlujoNodo): void {
    this.nodoPadreParaNuevoId = null;
    this.posicionInicialNuevaActividad = null;
    this.actividadParaEditar = nodo ? this.mapearNodoATarea(nodo) : null;
    this.mostrarModalActividad = true;
  }

  abrirNuevaActividadDesdeNodo(nodoBase: FlujoNodo): void {
    this.nodoPadreParaNuevoId = nodoBase.id;
    this.posicionInicialNuevaActividad = this.calcularPosicionNuevoNodo(nodoBase.id);
    this.actividadParaEditar = {
      nombre: 'Nueva actividad',
      responsableId: '',
      fechaInicio: '',
      fechaFin: undefined,
      descripcion: '',
      archivosAdjuntos: [],
      estado: 'Pendiente'
    };
    this.mostrarModalActividad = true;
  }

  abrirNuevaActividadDesdeBpmn(payload: { nombre: string; nodoOrigenId?: number }): void {
    this.nodoPadreParaNuevoId = typeof payload.nodoOrigenId === 'number' ? payload.nodoOrigenId : null;
    this.posicionInicialNuevaActividad = this.calcularPosicionNuevoNodo(this.nodoPadreParaNuevoId ?? undefined);
    this.actividadParaEditar = {
      nombre: payload.nombre || 'Nueva actividad',
      responsableId: '',
      fechaInicio: '',
      fechaFin: undefined,
      descripcion: '',
      archivosAdjuntos: [],
      estado: 'Pendiente'
    };
    this.mostrarModalActividad = true;
  }

  onGuardarActividad(actividad: Tarea): void {
    if (!this.proyecto) return;

    const fechaActualizacion = new Date().toISOString();
    const responsableId = actividad.responsableId ? Number(actividad.responsableId) : undefined;
    const responsableNombre = this.resolveResponsableNombre(responsableId);

    const indexNodoExistente = typeof actividad.id === 'number'
      ? this.flujoNodos.findIndex(n => n.id === actividad.id)
      : -1;

    if (indexNodoExistente >= 0) {
      const nodoActual = this.flujoNodos[indexNodoExistente];
      const nodoActualizado: FlujoNodo = {
        ...nodoActual,
        nombre: actividad.nombre,
        tipo: 'tarea',
        estadoActividad: nodoActual.estadoActividad || 'Pendiente',
        fechaCambioEstado: nodoActual.fechaCambioEstado || new Date().toISOString(),
        responsableId,
        responsableNombre,
        fechaInicio: this.toApiDateTime(actividad.fechaInicio) || this.toApiDateTime(nodoActual.fechaInicio) || fechaActualizacion,
        fechaFin: this.toApiDateOnly(actividad.fechaFin),
        descripcion: actividad.descripcion || '',
        adjuntos: this.mapearAdjuntosActividadANodo(actividad.archivosAdjuntos)
      };

      this.registroSolicitudesService.actualizarActividad(
        this.proyecto.id,
        nodoActualizado.id,
        this.mapearNodoAActividadRequest(nodoActualizado)
      ).subscribe({
        next: (actualizadoDesdeApi) => {
          this.flujoNodos = this.flujoNodos.map((nodo, i) => i === indexNodoExistente ? actualizadoDesdeApi : nodo);
          this.persistirFlujoProyecto();
          this.cerrarEditorActividad();
        },
        error: (error) => console.error('Error actualizando actividad:', error)
      });
    } else {
      const posicionInicial = this.posicionInicialNuevaActividad || this.calcularPosicionNuevoNodo(this.nodoPadreParaNuevoId ?? undefined);
      const nuevoNodo: FlujoNodo = {
        id: this.obtenerSiguienteNodoId(),
        nombre: actividad.nombre,
        tipo: 'tarea',
        posicionX: posicionInicial.x,
        posicionY: posicionInicial.y,
        estadoActividad: 'Pendiente',
        fechaCambioEstado: new Date().toISOString(),
        responsableId,
        responsableNombre,
        fechaInicio: this.toApiDateTime(actividad.fechaInicio) || fechaActualizacion,
        fechaFin: this.toApiDateOnly(actividad.fechaFin),
        descripcion: actividad.descripcion || '',
        adjuntos: this.mapearAdjuntosActividadANodo(actividad.archivosAdjuntos),
        siguientesIds: []
      };

      this.registroSolicitudesService.crearActividad(this.proyecto.id, {
        ...this.mapearNodoAActividadRequest(nuevoNodo),
        nodoOrigenId: this.nodoPadreParaNuevoId ?? undefined
      }).subscribe({
        next: (creadaDesdeApi) => {
          if (this.nodoPadreParaNuevoId !== null) {
            const indexPadre = this.flujoNodos.findIndex(n => n.id === this.nodoPadreParaNuevoId);
            if (indexPadre >= 0) {
              const padre = this.flujoNodos[indexPadre];
              this.flujoNodos[indexPadre] = {
                ...padre,
                siguientesIds: padre.siguientesIds.includes(creadaDesdeApi.id)
                  ? padre.siguientesIds
                  : [...padre.siguientesIds, creadaDesdeApi.id]
              };
            }
          }

          this.flujoNodos = [...this.flujoNodos, creadaDesdeApi];
          this.persistirFlujoProyecto();
          this.cerrarEditorActividad();
        },
        error: (error) => console.error('Error creando actividad:', error)
      });
    }
  }

  onEliminarActividad(nodoId: number): void {
    if (!this.proyecto) return;

    this.registroSolicitudesService.eliminarActividad(this.proyecto.id, nodoId).subscribe({
      next: () => {
        this.flujoNodos = this.flujoNodos
          .filter(nodo => nodo.id !== nodoId)
          .map(nodo => ({
            ...nodo,
            siguientesIds: nodo.siguientesIds.filter(id => id !== nodoId)
          }));
        this.persistirFlujoProyecto();
        this.cerrarEditorActividad();
      },
      error: (error) => console.error('Error eliminando actividad:', error)
    });
  }

  onFlujoActualizado(nodosActualizados: FlujoNodo[]): void {
    if (!this.proyecto) return;

    const normalizados = nodosActualizados.map(nodo => ({
      ...nodo,
      estadoActividad: nodo.tipo === 'tarea' ? (nodo.estadoActividad || 'Pendiente') : undefined,
      fechaCambioEstado: nodo.fechaCambioEstado,
      siguientesIds: [...nodo.siguientesIds]
    }));

    this.registroSolicitudesService.sincronizarActividades(this.proyecto.id, normalizados).subscribe({
      next: (nodosSincronizados) => {
        this.flujoNodos = nodosSincronizados;
        this.persistirFlujoProyecto();
      },
      error: (error) => {
        console.error('Error sincronizando flujo:', error);
        this.flujoNodos = normalizados;
        this.persistirFlujoProyecto();
      }
    });
  }

  onCerrarModalActividad(): void {
    this.cerrarEditorActividad();
  }

  private cerrarEditorActividad(): void {
    this.mostrarModalActividad = false;
    this.actividadParaEditar = null;
    this.nodoPadreParaNuevoId = null;
    this.posicionInicialNuevaActividad = null;
  }

  private mapearNodoAActividadRequest(nodo: FlujoNodo): {
    id?: number;
    nombre: string;
    tipo: 'inicio' | 'tarea';
    estadoActividad?: string;
    fechaCambioEstado?: string;
    responsableId?: number;
    responsableNombre?: string;
    fechaInicio?: string;
    fechaFin?: string;
    descripcion?: string;
    nodoOrigenId?: number;
    adjuntos: Array<{ nombre: string; tipo: string; tamano: number; dataUrl?: string }>;
    siguientesIds: number[];
  } {
    return {
      id: nodo.id,
      nombre: nodo.nombre,
      tipo: nodo.tipo,
      estadoActividad: nodo.estadoActividad,
      fechaCambioEstado: nodo.fechaCambioEstado,
      responsableId: nodo.responsableId,
      responsableNombre: nodo.responsableNombre || this.resolveResponsableNombre(nodo.responsableId),
      fechaInicio: nodo.fechaInicio,
      fechaFin: nodo.fechaFin,
      descripcion: nodo.descripcion,
      adjuntos: (nodo.adjuntos || []).map((adjunto) => ({
        nombre: adjunto.nombre,
        tipo: adjunto.tipo,
        tamano: adjunto.tamano,
        dataUrl: adjunto.dataUrl
      })),
      siguientesIds: nodo.siguientesIds || []
    };
  }

  private toApiDateOnly(value?: Date | string): string | undefined {
    if (!value) return undefined;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      const raw = String(value);
      if (raw.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
        return raw.substring(0, 10);
      }
      return undefined;
    }

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private toApiDateTime(value?: Date | string): string | undefined {
    if (!value) return undefined;

    const raw = String(value).trim();
    if (!raw) return undefined;

    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
      const normalized = raw.replace(' ', 'T');
      return normalized.length === 16 ? `${normalized}:00` : normalized;
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
      return raw.length === 16 ? `${raw}:00` : raw;
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return date.toISOString().slice(0, 19);
  }

  private resolveResponsableNombre(responsableId?: number): string | undefined {
    if (!responsableId) return undefined;
    return this.responsables.find(r => r.id === responsableId)?.nombre;
  }

  private sincronizarOrdenesCompraProyecto(ordenes: OrdenCompra[]) {
    if (!this.proyecto) return of(null);

    return this.registroSolicitudesService.obtenerOrdenesCompra(this.proyecto.id).pipe(
      switchMap((existentes) => {
        const operaciones: Observable<unknown>[] = [];
        const idsLocales = new Set((ordenes || []).map(o => Number(o.id || 0)).filter(id => id > 0));

        for (const orden of ordenes || []) {
          const payload = {
            numero: orden.numero,
            fecha: orden.fecha,
            tipo: orden.tipo,
            numeroLicitacion: orden.numeroLicitacion,
            numeroSolicitud: orden.numeroSolicitud,
            total: Number(orden.total || 0)
          };

          if (orden.id) {
            operaciones.push(this.registroSolicitudesService.actualizarOrdenCompra(this.proyecto!.id, orden.id, payload));
          } else {
            operaciones.push(this.registroSolicitudesService.crearOrdenCompra(this.proyecto!.id, payload));
          }
        }

        for (const existente of existentes || []) {
          const idExistente = Number(existente.id || 0);
          if (idExistente > 0 && !idsLocales.has(idExistente)) {
            operaciones.push(this.registroSolicitudesService.eliminarOrdenCompra(this.proyecto!.id, idExistente));
          }
        }

        return operaciones.length ? forkJoin(operaciones) : of([]);
      }),
      map(() => null)
    );
  }

  private prepararFlujo(): void {
    if (!this.proyecto) return;

    if (!this.proyecto.flujo || this.proyecto.flujo.nodos.length === 0) {
      this.proyecto.flujo = {
        nodos: [
          {
            id: 1,
            nombre: 'Inicio',
            tipo: 'inicio',
            siguientesIds: []
          }
        ]
      };
    }
    this.flujoNodos = this.proyecto.flujo.nodos.map(nodo => ({
      ...nodo,
      estadoActividad: nodo.tipo === 'tarea' ? (nodo.estadoActividad || 'Pendiente') : undefined,
      fechaCambioEstado: nodo.fechaCambioEstado,
      siguientesIds: [...(nodo.siguientesIds || [])]
    }));
  }

  private persistirFlujoProyecto(): void {
    if (!this.proyecto) return;
    this.proyecto.flujo = {
      nodos: this.flujoNodos.map(nodo => ({
        ...nodo,
        siguientesIds: [...nodo.siguientesIds]
      }))
    };
  }

  private calcularPosicionNuevoNodo(nodoPadreId?: number): { x: number; y: number } {
    const fallback = { x: 240, y: 102 };
    if (this.flujoNodos.length === 0) return fallback;

    const separacionHorizontal = 220;
    const separacionVertical = 120;

    if (typeof nodoPadreId === 'number') {
      const padre = this.flujoNodos.find(n => n.id === nodoPadreId);
      if (padre) {
        const baseX = typeof padre.posicionX === 'number' ? padre.posicionX : fallback.x;
        const baseY = typeof padre.posicionY === 'number' ? padre.posicionY : fallback.y;
        const hijosExistentes = this.flujoNodos.filter(n => padre.siguientesIds.includes(n.id));
        const offset = hijosExistentes.length;

        return {
          x: baseX + separacionHorizontal,
          y: baseY + offset * separacionVertical
        };
      }
    }

    const tareas = this.flujoNodos.filter(n => n.tipo !== 'inicio');
    if (tareas.length === 0) {
      const inicio = this.flujoNodos.find(n => n.tipo === 'inicio');
      return {
        x: (inicio?.posicionX ?? 105) + 135,
        y: inicio?.posicionY ?? 102
      };
    }

    const ultimo = tareas[tareas.length - 1];
    return {
      x: (ultimo.posicionX ?? fallback.x) + separacionHorizontal,
      y: ultimo.posicionY ?? fallback.y
    };
  }

  private mapearNodoATarea(nodo: FlujoNodo): Tarea {
    return {
      id: nodo.id,
      nombre: nodo.nombre,
      responsableId: nodo.responsableId ? String(nodo.responsableId) : '',
      fechaInicio: nodo.fechaInicio || '',
      fechaFin: nodo.fechaFin || undefined,
      descripcion: nodo.descripcion || '',
      archivosAdjuntos: (nodo.adjuntos || []).map(a => ({
        nombre: a.nombre,
        tipo: a.tipo,
        tamano: a.tamano,
        dataUrl: a.dataUrl,
        archivo: (a as any).archivo
      })),
      estado: nodo.estadoActividad || 'Pendiente'
    };
  }

  private mapearAdjuntosActividadANodo(adjuntos: Tarea['archivosAdjuntos']): FlujoAdjunto[] {
    return (adjuntos || []).map(adjunto => ({
      nombre: adjunto.nombre,
      tipo: adjunto.tipo,
      tamano: adjunto.tamano,
      dataUrl: adjunto.dataUrl,
      archivo: adjunto.archivo
    }));
  }

  private obtenerSiguienteNodoId(): number {
    if (this.flujoNodos.length === 0) return 1;
    return Math.max(...this.flujoNodos.map(n => n.id)) + 1;
  }

  guardarInfoProyecto(): void {
    if (!this.proyecto || this.modoSoloLectura) return;

    const ordenesActualizadas = this.proyectoInfoForm.ordenesCompra
      .filter(o => o.numero.trim())
      .map(o => ({ ...o }));

    this.proyecto.nombreProyecto = this.proyectoInfoForm.nombreProyecto;
    this.proyecto.cliente = this.proyectoInfoForm.cliente;
    this.proyecto.representante = this.proyectoInfoForm.representante;
    this.proyecto.areas = [...(this.proyectoInfoForm.areas || [])];
    this.proyecto.ordenesCompra = ordenesActualizadas;
    this.proyecto.costo = Number(this.proyectoInfoForm.costo);
    this.proyecto.procesoId = Number(this.proyectoInfoForm.procesoId);
    this.proyecto.responsableId = Number(this.proyectoInfoForm.responsableId);
    this.proyecto.responsableNombre = this.getResponsableNombre(Number(this.proyectoInfoForm.responsableId));
    this.proyecto.fechaInicio = this.proyectoInfoForm.fechaInicio;
    this.proyecto.fechaFinalizacion = this.formatDate(new Date());
    this.proyecto.ubicacion = this.proyectoInfoForm.ubicacion;
    this.proyecto.descripcion = this.proyectoInfoForm.descripcion;
    this.sincronizarOrdenesCompraProyecto(ordenesActualizadas).subscribe({
      next: () => {
        this.marcarActualizacionProyecto();
        this.infoActualizada.emit({
          costo: this.proyecto!.costo,
          fechaInicio: this.proyectoInfoForm.fechaInicio,
          fechaFin: this.formatDate(this.proyecto!.fechaFinalizacion)
        });

        if (this.embedded) {
          this.tabActiva = 'tablero';
          return;
        }

        this.cerrar.emit();
      },
      error: (error) => {
        console.error('Error sincronizando ordenes de compra:', error);
      }
    });
  }

  // ========== Métodos para Costos (delegados a TabCostosComponent) ==========


  get totalMateriales(): number {
    return this.materiales.reduce((sum, m) => sum + m.costoTotal, 0);
  }

  get totalManoObra(): number {
    return this.manoObra.reduce((sum, m) => sum + m.costoTotal, 0);
  }

  get totalOtrosCostos(): number {
    return this.tablasCostosExtras.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.costoTotal, 0), 0);
  }

  get otrosCostosItems(): OtroCosto[] {
    return this.tablasCostosExtras.flatMap(tabla => tabla.items);
  }

  get totalCostosGeneral(): number {
    return this.totalMateriales + this.totalManoObra + this.totalOtrosCostos;
  }

  get tieneDatosCostos(): boolean {
    return this.materiales.length > 0 || this.manoObra.length > 0 || this.tablasCostosExtras.length > 0 || this.totalCostosGeneral > 0;
  }

  habilitarSeccionCostos(): void {
    this.costosHabilitados = true;
    this.tabActiva = 'costos';
    this.guardarEstadoCostos();
    this.marcarActualizacionProyecto();
  }

  get flujoTimelineResumen(): FlujoNodo[] {
    if (this.flujoNodos.length <= 1) return this.flujoNodos.filter(n => n.tipo !== 'inicio');

    const porId = new Map(this.flujoNodos.map(n => [n.id, n]));
    const inicio = this.flujoNodos.find(n => n.tipo === 'inicio');
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
    for (const nodo of this.flujoNodos) {
      if (!visitados.has(nodo.id)) visitar(nodo);
    }

    return ordenados.filter(n => n.tipo !== 'inicio');
  }

  get actividadesDisponiblesCostos(): ActividadCostoOption[] {
    return this.flujoNodos
      .filter(nodo => nodo.tipo === 'tarea')
      .map(nodo => ({
        id: nodo.id,
        nombre: nodo.nombre || `Actividad ${nodo.id}`
      }));
  }

  get totalAdjuntosResumen(): number {
    return this.flujoNodos.reduce((acc, nodo) => acc + (nodo.adjuntos?.length || 0), 0);
  }

  get documentosActividadResumen(): DocumentoResumen[] {
    const docs: DocumentoResumen[] = [];
    for (const nodo of this.flujoNodos) {
      for (const adjunto of nodo.adjuntos || []) {
        docs.push({ actividad: nodo.nombre, nombre: adjunto.nombre, tipo: adjunto.tipo, adjunto });
      }
    }
    return docs;
  }

  puedeDescargarDocumento(doc: DocumentoResumen): boolean {
    return !!doc?.adjunto?.archivo || !!doc?.adjunto?.dataUrl;
  }

  descargarDocumento(doc: DocumentoResumen): void {
    const { adjunto } = doc;
    if (adjunto.archivo) {
      const enlace = document.createElement('a');
      const url = window.URL.createObjectURL(adjunto.archivo);
      enlace.href = url;
      enlace.download = adjunto.nombre || 'documento';
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      window.URL.revokeObjectURL(url);
      return;
    }

    if (adjunto.dataUrl) {
      const enlace = document.createElement('a');
      enlace.href = adjunto.dataUrl;
      enlace.download = adjunto.nombre || 'documento';
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      return;
    }

    const contenido = [
      'Documento no disponible para descarga binaria en esta sesion',
      '',
      `Nombre: ${doc.nombre || 'documento'}`,
      `Tipo: ${doc.tipo || 'desconocido'}`,
      `Actividad: ${doc.actividad || 'sin actividad'}`,
      '',
      'Vuelve a adjuntar este archivo para habilitar descarga real y vista previa completa.'
    ].join('\n');
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const enlace = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    enlace.href = url;
    enlace.download = `${(doc.nombre || 'documento').replace(/\.[^.]+$/, '')}-info.txt`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    window.URL.revokeObjectURL(url);
  }

  esVistaPreviaSoportadaDocumento(doc: DocumentoResumen): boolean {
    if (!this.puedeDescargarDocumento(doc)) return false;

    const mime = (doc.tipo || '').toLowerCase();
    if (mime.startsWith('image/') || mime === 'application/pdf') return true;

    const nombre = (doc.nombre || '').toLowerCase();
    return nombre.endsWith('.pdf') || nombre.endsWith('.png') || nombre.endsWith('.jpg') || nombre.endsWith('.jpeg') || nombre.endsWith('.webp') || nombre.endsWith('.gif');
  }

  esPdfDocumento(doc: DocumentoResumen | null): boolean {
    if (!doc) return false;
    const mime = (doc.tipo || '').toLowerCase();
    if (mime === 'application/pdf') return true;
    return (doc.nombre || '').toLowerCase().endsWith('.pdf');
  }

  abrirVistaPreviaDocumento(doc: DocumentoResumen): void {
    if (!this.esVistaPreviaSoportadaDocumento(doc)) return;

    this.liberarFuenteVistaPreviaDocumento();

    if (doc.adjunto.dataUrl) {
      this.fuenteVistaPreviaDocumento = doc.adjunto.dataUrl;
      this.fuenteVistaPreviaDocumentoEsBlob = false;
    } else if (doc.adjunto.archivo) {
      this.fuenteVistaPreviaDocumento = URL.createObjectURL(doc.adjunto.archivo);
      this.fuenteVistaPreviaDocumentoEsBlob = true;
    } else {
      if (this.esPdfDocumento(doc)) {
        this.fuenteVistaPreviaDocumento = 'data:text/html;charset=utf-8,' + encodeURIComponent(`
          <html><body style="margin:0;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100%;background:#f3f4f6;color:#374151;">
            <div style="text-align:center;max-width:560px;padding:24px;">
              <h3 style="margin:0 0 10px 0;">Vista previa no disponible</h3>
              <p style="margin:0;">El archivo "${doc.nombre}" no tiene contenido binario en esta sesión. Vuelve a adjuntarlo para visualizar el PDF.</p>
            </div>
          </body></html>
        `);
      } else {
        this.fuenteVistaPreviaDocumento = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle" fill="#374151" font-size="28" font-family="Arial">Vista previa no disponible</text><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#6b7280" font-size="18" font-family="Arial">Adjunta nuevamente ${doc.nombre} para ver la imagen</text></svg>`);
      }
      this.fuenteVistaPreviaDocumentoEsBlob = false;
    }

    this.documentoVistaPrevia = doc;
    this.mostrarVistaPreviaDocumento = true;
  }

  cerrarVistaPreviaDocumento(): void {
    this.liberarFuenteVistaPreviaDocumento();
    this.fuenteVistaPreviaDocumento = '';
    this.fuenteVistaPreviaDocumentoEsBlob = false;
    this.documentoVistaPrevia = null;
    this.mostrarVistaPreviaDocumento = false;
  }

  obtenerFuenteVistaPreviaDocumentoImagen(): string {
    return this.fuenteVistaPreviaDocumento;
  }

  obtenerFuenteVistaPreviaDocumentoPdf(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.fuenteVistaPreviaDocumento);
  }

  descargarTodosDocumentosResumen(): void {
    if (typeof window === 'undefined') return;

    const sinContenido: string[] = [];
    let descargados = 0;

    for (const nodo of this.flujoNodos) {
      for (const adjunto of nodo.adjuntos || []) {
        const posibleArchivo = (adjunto as any).archivo;
        if (posibleArchivo instanceof Blob) {
          const enlace = document.createElement('a');
          const url = window.URL.createObjectURL(posibleArchivo);
          enlace.href = url;
          enlace.download = adjunto.nombre || 'documento';
          document.body.appendChild(enlace);
          enlace.click();
          document.body.removeChild(enlace);
          window.URL.revokeObjectURL(url);
          descargados += 1;
        } else if (adjunto.dataUrl) {
          const enlace = document.createElement('a');
          enlace.href = adjunto.dataUrl;
          enlace.download = adjunto.nombre || 'documento';
          document.body.appendChild(enlace);
          enlace.click();
          document.body.removeChild(enlace);
          descargados += 1;
        } else {
          sinContenido.push(`${adjunto.nombre || 'documento'} | Actividad: ${nodo.nombre}`);
        }
      }
    }

    if (sinContenido.length > 0) {
      const reporte = [
        'Documentos sin contenido descargable en esta sesion',
        '',
        ...sinContenido,
      ].join('\n');
      const blob = new Blob([reporte], { type: 'text/plain;charset=utf-8' });
      const enlace = document.createElement('a');
      const url = window.URL.createObjectURL(blob);
      enlace.href = url;
      enlace.download = 'documentos_no_disponibles.txt';
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      window.URL.revokeObjectURL(url);
    }

    if (descargados === 0 && sinContenido.length === 0) {
      return;
    }
  }

  formatDateResumen(value?: string | Date): string {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-PE');
  }

  private cargarCostosProyecto(): void {
    if (!this.proyecto) return;

    forkJoin({
      materiales: this.registroSolicitudesService.obtenerCostosMateriales(this.proyecto.id),
      manoObra: this.registroSolicitudesService.obtenerCostosManoObra(this.proyecto.id),
      adicionales: this.registroSolicitudesService.obtenerCostosAdicionales(this.proyecto.id)
    }).subscribe({
      next: ({ materiales, manoObra, adicionales }) => {
        this.materiales = (materiales || []).map((item) => ({
          id: item.id,
          fecha: item.fecha || this.formatDate(new Date()),
          nroComprobante: item.nroComprobante || '',
          producto: item.producto || '',
          cantidad: Number(item.cantidad || 0),
          costoUnitario: Number(item.costoUnitario || 0),
          costoTotal: Number(item.costoTotal || 0),
          encargado: item.encargado || '',
          dependenciaActividadId: item.dependenciaActividadId ?? null
        }));

        this.manoObra = (manoObra || []).map((item) => ({
          id: item.id,
          trabajador: item.trabajador || '',
          cargo: item.cargo || '',
          diasTrabajando: Number(item.diasTrabajando || 0),
          costoPorDia: Number(item.costoPorDia || 0),
          costoTotal: Number(item.costoTotal || 0),
          dependenciaActividadId: item.dependenciaActividadId ?? null
        }));

        this.tablasCostosExtras = this.agruparAdicionalesPorCategoria(adicionales || []);
        this.inicializarSeccionCostos();
      },
      error: () => {
        this.materiales = [];
        this.manoObra = [];
        this.tablasCostosExtras = [];
        this.inicializarSeccionCostos();
      }
    });
  }

  private agruparAdicionalesPorCategoria(adicionales: Array<{
    id: number;
    fecha?: string;
    categoria: string;
    descripcion?: string;
    cantidad: number;
    costoUnitario: number;
    costoTotal: number;
    encargado?: string;
    dependenciaActividadId?: number | null;
  }>): TablaCostoExtra[] {
    const porCategoria = new Map<string, OtroCosto[]>();

    for (const item of adicionales) {
      const categoria = (item.categoria || 'OTROS').trim() || 'OTROS';
      const lista = porCategoria.get(categoria) || [];
      lista.push({
        id: item.id,
        fecha: item.fecha || this.formatDate(new Date()),
        descripcion: item.descripcion || '',
        cantidad: Number(item.cantidad || 0),
        costoUnitario: Number(item.costoUnitario || 0),
        costoTotal: Number(item.costoTotal || 0),
        encargado: item.encargado || '',
        dependenciaActividadId: item.dependenciaActividadId ?? null
      });
      porCategoria.set(categoria, lista);
    }

    return Array.from(porCategoria.entries()).map(([nombre, items], index) => ({
      id: index + 1,
      nombre,
      items,
      expandida: true
    }));
  }

  private sincronizarCostosProyecto(): Observable<unknown> {
    if (!this.proyecto || this.sincronizandoCostos) return of(null);

    this.sincronizandoCostos = true;

    const proyectoId = this.proyecto.id;
    const localesMateriales = this.materiales.map((item) => ({ ...item }));
    const localesManoObra = this.manoObra.map((item) => ({ ...item }));
    const localesAdicionales = this.tablasCostosExtras.flatMap((tabla) =>
      tabla.items.map((item) => ({ ...item, categoria: tabla.nombre }))
    );

    return forkJoin({
      existentesMateriales: this.registroSolicitudesService.obtenerCostosMateriales(proyectoId),
      existentesManoObra: this.registroSolicitudesService.obtenerCostosManoObra(proyectoId),
      existentesAdicionales: this.registroSolicitudesService.obtenerCostosAdicionales(proyectoId)
    }).pipe(
      switchMap(({ existentesMateriales, existentesManoObra, existentesAdicionales }) => {
        const operaciones: Observable<unknown>[] = [];

        const materialesValidos = localesMateriales.filter((item) => this.esMaterialValido(item));
        const manoObraValida = localesManoObra.filter((item) => this.esManoObraValida(item));
        const adicionalesValidos = localesAdicionales.filter((item) => this.esAdicionalValido(item));

        const materialesIdsLocales = new Set(localesMateriales.map((item) => item.id));
        const materialesIdsExistentes = new Set((existentesMateriales || []).map((item) => item.id));

        for (const item of materialesValidos) {
          const payload = {
            id: item.id,
            fecha: item.fecha,
            nroComprobante: item.nroComprobante?.trim() || '',
            producto: item.producto?.trim(),
            cantidad: Number(item.cantidad || 0),
            costoUnitario: Number(item.costoUnitario || 0),
            costoTotal: Number(item.costoTotal || 0),
            encargado: item.encargado?.trim() || '',
            dependenciaActividadId: item.dependenciaActividadId
          };

          if (materialesIdsExistentes.has(item.id)) {
            operaciones.push(this.registroSolicitudesService.actualizarCostoMaterial(proyectoId, payload));
          } else {
            operaciones.push(this.registroSolicitudesService.crearCostoMaterial(proyectoId, payload));
          }
        }

        for (const item of existentesMateriales || []) {
          if (!materialesIdsLocales.has(item.id)) {
            operaciones.push(this.registroSolicitudesService.eliminarCostoMaterial(proyectoId, item.id));
          }
        }

        const manoObraIdsLocales = new Set(localesManoObra.map((item) => item.id));
        const manoObraIdsExistentes = new Set((existentesManoObra || []).map((item) => item.id));

        for (const item of manoObraValida) {
          const payload = {
            id: item.id,
            trabajador: item.trabajador?.trim(),
            cargo: item.cargo?.trim() || '',
            diasTrabajando: Number(item.diasTrabajando || 0),
            costoPorDia: Number(item.costoPorDia || 0),
            costoTotal: Number(item.costoTotal || 0),
            dependenciaActividadId: item.dependenciaActividadId
          };

          if (manoObraIdsExistentes.has(item.id)) {
            operaciones.push(this.registroSolicitudesService.actualizarCostoManoObra(proyectoId, payload));
          } else {
            operaciones.push(this.registroSolicitudesService.crearCostoManoObra(proyectoId, payload));
          }
        }

        for (const item of existentesManoObra || []) {
          if (!manoObraIdsLocales.has(item.id)) {
            operaciones.push(this.registroSolicitudesService.eliminarCostoManoObra(proyectoId, item.id));
          }
        }

        const adicionalesIdsLocales = new Set(localesAdicionales.map((item) => item.id));
        const adicionalesIdsExistentes = new Set((existentesAdicionales || []).map((item) => item.id));

        for (const item of adicionalesValidos) {
          const payload = {
            id: item.id,
            fecha: item.fecha,
            categoria: item.categoria?.trim(),
            descripcion: item.descripcion?.trim() || '',
            cantidad: Number(item.cantidad || 0),
            costoUnitario: Number(item.costoUnitario || 0),
            costoTotal: Number(item.costoTotal || 0),
            encargado: item.encargado?.trim() || '',
            dependenciaActividadId: item.dependenciaActividadId
          };

          if (adicionalesIdsExistentes.has(item.id)) {
            operaciones.push(this.registroSolicitudesService.actualizarCostoAdicional(proyectoId, payload));
          } else {
            operaciones.push(this.registroSolicitudesService.crearCostoAdicional(proyectoId, payload));
          }
        }

        for (const item of existentesAdicionales || []) {
          if (!adicionalesIdsLocales.has(item.id)) {
            operaciones.push(this.registroSolicitudesService.eliminarCostoAdicional(proyectoId, item.id));
          }
        }

        return operaciones.length ? forkJoin(operaciones) : of([]);
      }),
      map(() => null),
      finalize(() => {
        this.sincronizandoCostos = false;
      })
    );
  }

  private inicializarSeccionCostos(): void {
    const storageKey = this.obtenerClaveCostosStorage();
    const costosGuardados = storageKey ? window.localStorage.getItem(storageKey) === '1' : false;
    this.costosHabilitados = costosGuardados || this.tieneDatosCostos;
  }

  private guardarEstadoCostos(): void {
    const storageKey = this.obtenerClaveCostosStorage();
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, this.costosHabilitados ? '1' : '0');
  }

  private obtenerClaveCostosStorage(): string | null {
    if (!this.proyecto || typeof window === 'undefined') return null;
    return `${this.costosStoragePrefix}${this.proyecto.id}`;
  }

  private liberarFuenteVistaPreviaDocumento(): void {
    if (this.fuenteVistaPreviaDocumento && this.fuenteVistaPreviaDocumentoEsBlob) {
      URL.revokeObjectURL(this.fuenteVistaPreviaDocumento);
    }
  }

  private marcarActualizacionProyecto(): void {
    if (!this.proyecto) return;

    this.proyecto.fechaFinalizacion = this.formatDate(new Date());
    this.proyectoActualizado.emit({ ...this.proyecto });
  }

  private esMaterialValido(item: MaterialCosto): boolean {
    return !!item?.producto?.trim()
      && Number(item.cantidad || 0) > 0
      && Number(item.costoUnitario || 0) > 0;
  }

  private esManoObraValida(item: ManoObraCosto): boolean {
    return !!item?.trabajador?.trim()
      && Number(item.diasTrabajando || 0) > 0
      && Number(item.costoPorDia || 0) > 0;
  }

  private esAdicionalValido(item: OtroCosto & { categoria?: string }): boolean {
    return !!item?.categoria?.trim()
      && Number(item.cantidad || 0) > 0
      && Number(item.costoUnitario || 0) > 0;
  }

}
