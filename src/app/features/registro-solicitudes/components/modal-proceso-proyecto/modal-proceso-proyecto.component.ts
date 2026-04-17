import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { Proyecto, EtapaProyecto, TareaAsignada, Responsable, ProcesoSimple, OrdenCompra, FlujoNodo, FlujoAdjunto, ComentarioAdicionalActividad } from '../../models/solicitud.model';
import { ModalDismissDirective } from '../../../../shared/directives/modal-dismiss.directive';
import { ConfirmDeleteModalComponent, ConfirmDeleteConfig } from '../../../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { ConfirmFinalizeModalComponent, ConfirmFinalizeConfig } from '../../../../shared/components/confirm-finalize-modal/confirm-finalize-modal.component';
import { TareaFormModalComponent, Tarea } from '../../../../shared/components/tarea-form-modal/tarea-form-modal.component';
import { TabProcesoComponent } from './components/tab-proceso/tab-proceso.component';
import { TabTableroGeneralComponent } from './components/tab-tablerogeneral/tab-tablerogeneral.component';
import { TabInformacionComponent } from './components/tab-informacion/tab-informacion.component';
import { TabCostosComponent } from './components/tab-costos/tab-costos.component';
import { AdjuntosPreviewService } from '../../../../shared/services/adjuntos-preview.service';
import { DocumentoResumen } from './models/documento-resumen.model';
import { CostoCategoriaAdicionalApi, RegistroSolicitudesService } from '../../services/registro-solicitudes.service';
import { HttpService } from '../../../../core/services/http.service';
import { forkJoin, Observable, of } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

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
  categoriaId?: number;
  nombre: string;
  items: OtroCosto[];
  expandida: boolean;
}

@Component({
  selector: 'app-modal-proceso-proyecto',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalDismissDirective, ConfirmDeleteModalComponent, ConfirmFinalizeModalComponent, TareaFormModalComponent, TabProcesoComponent, TabTableroGeneralComponent, TabInformacionComponent, TabCostosComponent],
  templateUrl: './modal-proceso-proyecto.component.html',
  styleUrls: ['./modal-proceso-proyecto.component.css']
})
export class ModalProcesoProyectoComponent implements OnChanges {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly registroSolicitudesService = inject(RegistroSolicitudesService);
  private readonly httpClient = inject(HttpClient);
  private readonly httpService = inject(HttpService);
  private readonly adjuntosPreviewService = inject(AdjuntosPreviewService);

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
  guardandoInfo = false;
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

  // Modal de confirmación de finalización
  mostrarConfirmacionFinalizar = false;
  cargandoFinalizacion = false;
  configFinalizarModal: ConfirmFinalizeConfig = {};

  // Vista previa de documentos
  mostrarVistaPreviaDocumento = false;
  documentoVistaPrevia: DocumentoResumen | null = null;
  fuenteVistaPreviaDocumento = '';
  htmlVistaPreviaDocumento: SafeHtml | null = null;
  cargandoVistaPreviaDocumento = false;
  private fuenteVistaPreviaDocumentoEsBlob = false;

  // Navegación de tabs
  tabActiva: 'tablero' | 'proceso' | 'informacion' | 'costos' = 'tablero';

  // Modal de actividades
  mostrarModalActividad = false;
  actividadParaEditar: Tarea | null = null;
  nodoPadreParaNuevoId: number | null = null;
  posicionInicialNuevaActividad: { x: number; y: number } | null = null;
  bloqueoEdicionActividades = false;

  flujoNodos: FlujoNodo[] = [];
  private readonly flujoStoragePrefix = 'ayni:registro-solicitudes:flujo:';
  private readonly costosStoragePrefix = 'ayni:registro-solicitudes:costos-habilitados:';
  costosHabilitados = false;
  private snapshotInfoBase = '';
  private snapshotCostosBase = '';

  // Formulario de información del proyecto (tab Información)
  proyectoInfoForm = {
    nombreProyecto: '',
    cliente: '',
    representante: '',
    areas: [] as string[],
    ordenesCompra: [] as OrdenCompra[],
    comentariosAdicionalesActividad: [] as ComentarioAdicionalActividad[],
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
      this.proyectoFinalizado = this.proyecto.estado === 'Completado' || this.proyecto.estado === 'Finalizado';
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
    return [];
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
    if (!this.proyecto || this.proyectoFinalizado || this.proyectoCancelado) return;

    this.configFinalizarModal = {
      titulo: 'Finalizar proyecto',
      mensaje: `¿Está seguro de finalizar el proyecto "${this.proyecto.nombreProyecto}"? Esta acción marcará el proyecto como completado.`,
      textoConfirmar: 'Sí, finalizar proyecto'
    };

    this.mostrarConfirmacionFinalizar = true;
  }

  confirmarFinalizacion(): void {
    if (!this.proyecto || this.proyectoFinalizado || this.proyectoCancelado) return;

    this.cargandoFinalizacion = true;
    try {
      this.proyecto.estado = 'Completado';
      this.proyectoFinalizado = true;
      // Guardar etapas en el proyecto antes de emitir
      this.guardarEtapasEnProyecto();
      this.marcarActualizacionProyecto();
      this.lanzarConfeti();
      this.finalizarProy.emit(this.proyecto);
      this.mostrarConfirmacionFinalizar = false;
    } finally {
      this.cargandoFinalizacion = false;
    }
  }

  onCancelarConfirmacionFinalizar(): void {
    this.mostrarConfirmacionFinalizar = false;
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
      ordenesCompra: this.deduplicarOrdenesCompra((this.proyecto.ordenesCompra || []).map(o => ({
        ...o,
        tipo: this.normalizarTipoOrdenCompra(o.tipo),
        numeroLicitacion: o.numeroLicitacion || '',
        numeroSolicitud: o.numeroSolicitud || ''
      }))),
      comentariosAdicionalesActividad: (this.proyecto.comentariosAdicionalesActividad || []).map(comentario => ({
        ...comentario,
        texto: (comentario.texto || comentario.descripcion || '').trim(),
        adjuntos: (comentario.adjuntos || []).map(adjunto => ({ ...adjunto }))
      })),
      costo: this.proyecto.costo,
      procesoId: this.proyecto.procesoId,
      responsableId: this.proyecto.responsableId,
      fechaInicio: this.formatDate(this.proyecto.fechaInicio),
      fechaFinalizacion: this.formatDate(this.proyecto.fechaFinalizacion),
      ubicacion: this.proyecto.ubicacion || '',
      descripcion: this.proyecto.descripcion
    };

    this.snapshotInfoBase = this.crearSnapshotInformacionActual();
  }

  private normalizarTipoOrdenCompra(tipo?: string): string {
    const valor = (tipo || '').trim().toLowerCase();

    if (!valor) return 'SUMINISTRO';
    if (valor.includes('serv')) return 'SERVICIO';
    if (valor.includes('sumin') || valor.includes('material') || valor.includes('equipo')) return 'SUMINISTRO';

    return 'OTROS';
  }

  private deduplicarOrdenesCompra(ordenes: OrdenCompra[]): OrdenCompra[] {
    const porClave = new Map<string, OrdenCompra>();

    for (const orden of ordenes || []) {
      const id = Number(orden.id || 0);
      const numero = (orden.numero || '').trim();
      const fecha = (orden.fecha || '').trim();
      const tipo = this.normalizarTipoOrdenCompra(orden.tipo);
      const licitacion = (orden.numeroLicitacion || '').trim();
      const solicitud = (orden.numeroSolicitud || '').trim();
      const total = Number(orden.total || 0);

      const clave = id > 0
        ? `id:${id}`
        : `raw:${numero}|${fecha}|${tipo}|${licitacion}|${solicitud}|${total}`;

      if (!porClave.has(clave)) {
        porClave.set(clave, {
          ...orden,
          id: id > 0 ? id : undefined,
          numero,
          fecha,
          tipo,
          numeroLicitacion: licitacion,
          numeroSolicitud: solicitud,
          total,
          adjuntos: (orden.adjuntos || []).map((adjunto) => ({ ...adjunto }))
        });
      }
    }

    return Array.from(porClave.values());
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
      nombre: '',
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
    if (!this.proyecto) return;

    // No crear nodo aún: la actividad se agrega al flujo recién al guardar en la modal.
    this.nodoPadreParaNuevoId = typeof payload.nodoOrigenId === 'number' ? payload.nodoOrigenId : null;
    this.posicionInicialNuevaActividad = this.calcularPosicionNuevoNodo(this.nodoPadreParaNuevoId ?? undefined);
    const nombreInicial = (payload.nombre || '').trim();
    this.actividadParaEditar = {
      nombre: /^nueva actividad$/i.test(nombreInicial) ? '' : nombreInicial,
      responsableId: '',
      fechaInicio: '',
      fechaFin: undefined,
      descripcion: '',
      archivosAdjuntos: [],
      estado: 'Pendiente'
    };
    this.mostrarModalActividad = true;
  }

  async onGuardarActividad(actividad: Tarea): Promise<void> {
    if (!this.proyecto) return;

    const fechaActualizacion = this.formatLocalDateTime(new Date());
    const responsableId = actividad.responsableId ? Number(actividad.responsableId) : undefined;
    const responsableNombre = this.resolveResponsableNombre(responsableId);

    const indexNodoExistente = typeof actividad.id === 'number'
      ? this.flujoNodos.findIndex(n => n.id === actividad.id)
      : -1;

    if (indexNodoExistente >= 0) {
      const nodoActual = this.flujoNodos[indexNodoExistente];
      const adjuntosSubidos = await this.subirAdjuntosPendientesActividad(actividad.archivosAdjuntos, nodoActual.id);
      if (!adjuntosSubidos) return;
      const nodoActualizado: FlujoNodo = {
        ...nodoActual,
        nombre: actividad.nombre,
        tipo: 'tarea',
        estadoActividad: nodoActual.estadoActividad || 'Pendiente',
        fechaCambioEstado: nodoActual.fechaCambioEstado || this.formatLocalDateTime(new Date()),
        responsableId,
        responsableNombre,
        fechaInicio: this.toApiDateTime(actividad.fechaInicio) || this.toApiDateTime(nodoActual.fechaInicio) || fechaActualizacion,
        fechaFin: this.toApiDateOnly(actividad.fechaFin),
        descripcion: actividad.descripcion || '',
        adjuntos: this.mapearAdjuntosActividadANodo(adjuntosSubidos)
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
      const adjuntosSubidos = await this.subirAdjuntosPendientesActividad(actividad.archivosAdjuntos);
      if (!adjuntosSubidos) return;
      const nuevoNodo: FlujoNodo = {
        id: this.obtenerSiguienteNodoId(),
        nombre: actividad.nombre,
        tipo: 'tarea',
        posicionX: posicionInicial.x,
        posicionY: posicionInicial.y,
        estadoActividad: 'Pendiente',
        fechaCambioEstado: this.formatLocalDateTime(new Date()),
        responsableId,
        responsableNombre,
        fechaInicio: this.toApiDateTime(actividad.fechaInicio) || fechaActualizacion,
        fechaFin: this.toApiDateOnly(actividad.fechaFin),
        descripcion: actividad.descripcion || '',
        adjuntos: this.mapearAdjuntosActividadANodo(adjuntosSubidos),
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
      tipoActividad: nodo.tipoActividad,
      estadoActividad: nodo.tipo === 'tarea' ? (nodo.estadoActividad || 'Pendiente') : undefined,
      fechaCambioEstado: nodo.fechaCambioEstado,
      siguientesIds: [...nodo.siguientesIds]
    }));

    this.registroSolicitudesService.sincronizarActividades(this.proyecto.id, normalizados).subscribe({
      next: (nodosSincronizados) => {
        this.flujoNodos = nodosSincronizados;
        this.persistirFlujoProyecto();
        this.marcarActualizacionProyecto();
      },
      error: (error) => {
        console.error('Error sincronizando flujo:', error);
        this.flujoNodos = normalizados;
        this.persistirFlujoProyecto();
        this.marcarActualizacionProyecto();
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
    tipoActividad?: string;
    estadoActividad?: string;
    fechaCambioEstado?: string;
    responsableId?: number;
    responsableNombre?: string;
    fechaInicio?: string;
    fechaFin?: string;
    descripcion?: string;
    nodoOrigenId?: number;
    adjuntos: Array<{ nombre: string; tipo: string; tamano: number; objectKey?: string; dataUrl?: string }>;
    siguientesIds: number[];
  } {
    return {
      id: nodo.id,
      nombre: nodo.nombre,
      tipo: nodo.tipo,
      tipoActividad: nodo.tipoActividad,
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
        objectKey: adjunto.objectKey,
        dataUrl: adjunto.objectKey ? undefined : adjunto.dataUrl
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

    return this.formatLocalDateTime(date);
  }

  private formatLocalDateTime(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  }

  private resolveResponsableNombre(responsableId?: number): string | undefined {
    if (!responsableId) return undefined;
    return this.responsables.find(r => r.id === responsableId)?.nombre;
  }

  private sincronizarOrdenesCompraProyecto(ordenes: OrdenCompra[]): Observable<OrdenCompra[]> {
    if (!this.proyecto) return of([]);

    const ordenesNormalizadas = this.normalizarOrdenesCompraLocales(ordenes || []);

    const payload = ordenesNormalizadas.map((orden) => ({
      numero: orden.numero,
      fecha: orden.fecha,
      tipo: orden.tipo,
      numeroLicitacion: orden.numeroLicitacion,
      numeroSolicitud: orden.numeroSolicitud,
      total: Number(orden.total || 0),
      adjuntos: (orden.adjuntos || []).map((adjunto) => ({
        nombre: adjunto.nombre,
        tipo: adjunto.tipo,
        tamano: Number(adjunto.tamano || 0),
        objectKey: adjunto.objectKey,
        dataUrl: adjunto.objectKey ? undefined : (adjunto.dataUrl || adjunto.url)
      }))
    }));

    return this.registroSolicitudesService.reemplazarOrdenesCompra(this.proyecto.id, payload).pipe(
      map((items) => (items || []).map((orden) => ({
        id: orden.id,
        numero: orden.numero || '',
        fecha: orden.fecha || '',
        tipo: this.normalizarTipoOrdenCompra(orden.tipo),
        numeroLicitacion: orden.numeroLicitacion || '',
        numeroSolicitud: orden.numeroSolicitud || '',
        total: Number(orden.total || 0),
        adjuntos: (orden.adjuntos || []).map((adjunto) => ({ ...adjunto }))
      })))
    );
  }

  private normalizarOrdenesCompraLocales(ordenes: OrdenCompra[]): OrdenCompra[] {
    const porClave = new Map<string, OrdenCompra>();

    for (const orden of ordenes) {
      const numero = (orden.numero || '').trim();
      if (!numero) continue;

      const fecha = (orden.fecha || '').trim();
      const tipo = this.normalizarTipoOrdenCompra(orden.tipo);
      const numeroLicitacion = (orden.numeroLicitacion || '').trim();
      const numeroSolicitud = (orden.numeroSolicitud || '').trim();
      const total = Number(orden.total || 0);
      const id = Number(orden.id || 0);

      const clave = id > 0
        ? `id:${id}`
        : `new:${numero}|${fecha}|${tipo}|${numeroLicitacion}|${numeroSolicitud}|${total}`;

      if (!porClave.has(clave)) {
        porClave.set(clave, {
          id: id > 0 ? id : undefined,
          numero,
          fecha,
          tipo,
          numeroLicitacion,
          numeroSolicitud,
          total,
          adjuntos: (orden.adjuntos || []).map((adjunto) => ({ ...adjunto }))
        });
      }
    }

    return Array.from(porClave.values());
  }

  onBloqueoEdicionActividadesChange(estado: boolean): void {
    this.bloqueoEdicionActividades = estado;
  }

  onComentariosAdicionalesActividadChange(comentarios: ComentarioAdicionalActividad[]): void {
    this.proyectoInfoForm.comentariosAdicionalesActividad = [...(comentarios || [])];

    if (!this.proyecto || this.modoSoloLectura) return;

    this.proyecto.comentariosAdicionalesActividad = [...this.proyectoInfoForm.comentariosAdicionalesActividad];
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
        objectKey: a.objectKey,
        dataUrl: a.dataUrl,
        url: (a as any).url,
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
      objectKey: adjunto.objectKey,
      dataUrl: adjunto.dataUrl,
      url: adjunto.url || adjunto.dataUrl,
      archivo: adjunto.archivo
    }));
  }

  private async subirAdjuntosPendientesActividad(adjuntos: Tarea['archivosAdjuntos'], actividadId?: number): Promise<Tarea['archivosAdjuntos'] | null> {
    if (!this.proyecto?.id || !(adjuntos || []).length) {
      return adjuntos || [];
    }

    const resultado: Tarea['archivosAdjuntos'] = [];
    try {
      for (const adjunto of adjuntos || []) {
        if (!adjunto.archivo || adjunto.objectKey) {
          resultado.push(adjunto);
          continue;
        }

        const subida = await firstValueFrom(
          this.registroSolicitudesService.subirAdjuntoActividad(
            adjunto.archivo,
            this.proyecto.id,
            actividadId,
            'actividad'
          )
        );

        resultado.push({
          nombre: adjunto.nombre,
          tipo: adjunto.tipo,
          tamano: Number(adjunto.tamano || adjunto.archivo.size || 0),
          objectKey: subida.objectKey,
          dataUrl: adjunto.dataUrl || subida.publicUrl,
          url: subida.publicUrl
        });
      }
    } catch (error) {
      console.error('Error subiendo adjuntos de actividad:', error);
      return null;
    }

    return resultado;
  }

  private async subirAdjuntosPendientesOrdenesCompra(ordenes: OrdenCompra[]): Promise<OrdenCompra[] | null> {
    if (!this.proyecto?.id) {
      return ordenes || [];
    }

    const resultado: OrdenCompra[] = [];

    try {
      for (const orden of ordenes || []) {
        const adjuntosSubidos: FlujoAdjunto[] = [];

        for (const adjunto of orden.adjuntos || []) {
          if (!adjunto.archivo || adjunto.objectKey) {
            adjuntosSubidos.push({ ...adjunto });
            continue;
          }

          const subida = await firstValueFrom(
            this.registroSolicitudesService.subirAdjuntoActividad(
              adjunto.archivo,
              this.proyecto.id,
              undefined,
              'orden-compra'
            )
          );

          adjuntosSubidos.push({
            nombre: adjunto.nombre,
            tipo: adjunto.tipo,
            tamano: Number(adjunto.tamano || adjunto.archivo.size || 0),
            objectKey: subida.objectKey,
            dataUrl: adjunto.dataUrl || subida.publicUrl,
            url: subida.publicUrl
          });
        }

        resultado.push({
          ...orden,
          adjuntos: adjuntosSubidos
        });
      }
    } catch (error) {
      console.error('Error subiendo adjuntos de orden de compra:', error);
      return null;
    }

    return resultado;
  }

  private obtenerSiguienteNodoId(): number {
    if (this.flujoNodos.length === 0) return 1;
    return Math.max(...this.flujoNodos.map(n => n.id)) + 1;
  }

  async guardarInfoProyecto(): Promise<void> {
    if (!this.proyecto || this.proyectoCancelado || this.guardandoInfo) return;

    this.guardandoInfo = true;

    const ordenesSubidas = await this.subirAdjuntosPendientesOrdenesCompra(this.proyectoInfoForm.ordenesCompra || []);
    if (ordenesSubidas === null) {
      this.guardandoInfo = false;
      return;
    }

    const ordenesActualizadas = this.normalizarOrdenesCompraLocales(ordenesSubidas);

    this.proyecto.nombreProyecto = this.proyectoInfoForm.nombreProyecto;
    this.proyecto.cliente = this.proyectoInfoForm.cliente;
    this.proyecto.representante = this.proyectoInfoForm.representante;
    this.proyecto.areas = [...(this.proyectoInfoForm.areas || [])];
    this.proyecto.ordenesCompra = ordenesActualizadas;
    this.proyecto.comentariosAdicionalesActividad = (this.proyectoInfoForm.comentariosAdicionalesActividad || [])
      .filter(comentario => comentario.actividadId > 0 && ((comentario.texto || '').trim().length > 0 || (comentario.adjuntos || []).length > 0))
      .map(comentario => ({
        ...comentario,
        descripcion: comentario.texto,
        adjuntos: (comentario.adjuntos || []).map(adjunto => ({ ...adjunto }))
      }));
    this.proyecto.costo = Number(this.proyectoInfoForm.costo);
    this.proyecto.procesoId = Number(this.proyectoInfoForm.procesoId);
    this.proyecto.responsableId = Number(this.proyectoInfoForm.responsableId);
    this.proyecto.responsableNombre = this.getResponsableNombre(Number(this.proyectoInfoForm.responsableId));
    this.proyecto.fechaInicio = this.proyectoInfoForm.fechaInicio;
    this.proyecto.fechaFinalizacion = this.proyectoInfoForm.fechaFinalizacion || this.proyecto.fechaFinalizacion;
    this.proyecto.ubicacion = this.proyectoInfoForm.ubicacion;
    this.proyecto.descripcion = this.proyectoInfoForm.descripcion;
    this.proyectoInfoForm.ordenesCompra = [...ordenesActualizadas];
    this.sincronizarOrdenesCompraProyecto(ordenesActualizadas).subscribe({
      next: (ordenesPersistidas) => {
        this.proyectoInfoForm.ordenesCompra = [...ordenesPersistidas];
        this.proyecto!.ordenesCompra = [...ordenesPersistidas];
        this.snapshotInfoBase = this.crearSnapshotInformacionActual();
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
      },
      complete: () => {
        this.guardandoInfo = false;
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
    return this.documentosActividadResumen.length;
  }

  get documentosActividadResumen(): DocumentoResumen[] {
    const docs: DocumentoResumen[] = [];

    for (const nodo of this.flujoNodos) {
      for (const adjunto of nodo.adjuntos || []) {
        docs.push({
          actividad: nodo.nombre,
          origen: 'Actividad',
          nombre: adjunto.nombre,
          tipo: adjunto.tipo,
          adjunto
        });
      }
    }

    for (const comentario of this.proyectoInfoForm.comentariosAdicionalesActividad || []) {
      const actividad = this.flujoNodos.find((nodo) => nodo.id === comentario.actividadId)?.nombre || `Actividad ${comentario.actividadId}`;
      for (const adjunto of comentario.adjuntos || []) {
        docs.push({
          actividad,
          origen: 'Comentario',
          nombre: adjunto.nombre,
          tipo: adjunto.tipo,
          adjunto
        });
      }
    }

    return docs;
  }

  getComentariosActividadResumen(actividadId: number): ComentarioAdicionalActividad[] {
    return (this.proyectoInfoForm.comentariosAdicionalesActividad || []).filter((comentario) => Number(comentario.actividadId) === Number(actividadId));
  }

  puedeDescargarDocumento(doc: DocumentoResumen): boolean {
    return !!doc?.adjunto?.objectKey || !!this.adjuntosPreviewService.getAdjuntoUrl(this.mapearDocumentoAdjunto(doc));
  }

  async descargarDocumento(doc: DocumentoResumen): Promise<void> {
    const blobAdjunto = await this.resolverBlobAdjunto(doc.adjunto);
    if (blobAdjunto) {
      await this.adjuntosPreviewService.descargarAdjunto({
        nombre: doc.nombre,
        tipo: doc.tipo,
        archivo: new File([blobAdjunto], doc.nombre || 'documento', { type: doc.tipo || blobAdjunto.type || 'application/octet-stream' })
      });
      return;
    }

    const fuente = await this.resolverFuenteAdjunto(doc.adjunto);
    if (fuente) {
      await this.adjuntosPreviewService.descargarAdjunto({
        nombre: doc.nombre,
        tipo: doc.tipo,
        url: fuente.url
      });
      if (fuente.revokeObjectUrl) {
        window.URL.revokeObjectURL(fuente.url);
      }
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
    const blobInfo = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const enlace = document.createElement('a');
    const url = window.URL.createObjectURL(blobInfo);
    enlace.href = url;
    enlace.download = `${(doc.nombre || 'documento').replace(/\.[^.]+$/, '')}-info.txt`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    window.URL.revokeObjectURL(url);
  }

  esVistaPreviaSoportadaDocumento(doc: DocumentoResumen): boolean {
    if (!this.puedeDescargarDocumento(doc)) return false;
    if (doc.adjunto?.objectKey) return true;
    return this.adjuntosPreviewService.puedeVistaPrevia(this.mapearDocumentoAdjunto(doc));
  }

  esPdfDocumento(doc: DocumentoResumen | null): boolean {
    if (!doc) return false;
    return this.adjuntosPreviewService.esPdf(this.mapearDocumentoAdjunto(doc));
  }

  esImagenDocumento(doc: DocumentoResumen | null): boolean {
    if (!doc) return false;
    return this.adjuntosPreviewService.esImagen(this.mapearDocumentoAdjunto(doc));
  }

  esDocumentoOffice(doc: DocumentoResumen | null): boolean {
    if (!doc) return false;
    return this.adjuntosPreviewService.esOffice(this.mapearDocumentoAdjunto(doc));
  }

  async abrirVistaPreviaDocumento(doc: DocumentoResumen): Promise<void> {
    this.liberarFuenteVistaPreviaDocumento();
    this.htmlVistaPreviaDocumento = null;
    this.cargandoVistaPreviaDocumento = false;

    if (this.esDocumentoOffice(doc)) {
      this.documentoVistaPrevia = doc;
      this.mostrarVistaPreviaDocumento = true;
      this.cargandoVistaPreviaDocumento = true;

      try {
        const blob = await this.resolverBlobAdjunto(doc.adjunto);
        if (!blob) {
          this.htmlVistaPreviaDocumento = this.sanitizer.bypassSecurityTrustHtml(
            this.adjuntosPreviewService.generarMensajePreviewHtml('No se pudo cargar el documento para vista previa.')
          );
          return;
        }

        const html = await this.adjuntosPreviewService.generarHtmlPreviewOffice({
          nombre: doc.nombre,
          tipo: doc.tipo,
          archivo: new File([blob], doc.nombre || 'documento', { type: doc.tipo || blob.type || 'application/octet-stream' })
        });

        this.htmlVistaPreviaDocumento = this.sanitizer.bypassSecurityTrustHtml(html);
      } catch (error) {
        console.error('Error generando vista previa Office:', error);
        this.htmlVistaPreviaDocumento = this.sanitizer.bypassSecurityTrustHtml(
          this.adjuntosPreviewService.generarMensajePreviewHtml('No se pudo generar la vista previa del archivo.')
        );
      } finally {
        this.cargandoVistaPreviaDocumento = false;
      }
      return;
    }

    if (!this.esVistaPreviaSoportadaDocumento(doc)) {
      this.fuenteVistaPreviaDocumento = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle" fill="#374151" font-size="26" font-family="Arial">Vista previa no disponible para este tipo de archivo</text><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#6b7280" font-size="17" font-family="Arial">Usa el botón descargar para abrirlo con su aplicación</text></svg>`);
      this.fuenteVistaPreviaDocumentoEsBlob = false;
      this.documentoVistaPrevia = doc;
      this.mostrarVistaPreviaDocumento = true;
      return;
    }

    const fuente = await this.resolverFuenteAdjunto(doc.adjunto);
    if (fuente) {
      this.fuenteVistaPreviaDocumento = fuente.url;
      this.fuenteVistaPreviaDocumentoEsBlob = fuente.revokeObjectUrl;
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

  async abrirVistaPreviaAdjuntoFlujo(adjunto: FlujoAdjunto): Promise<void> {
    const doc: DocumentoResumen = {
      actividad: 'Flujo de proyecto',
      origen: 'Actividad',
      nombre: adjunto?.nombre || 'Documento adjunto',
      tipo: adjunto?.tipo || 'Archivo',
      adjunto
    };

    await this.abrirVistaPreviaDocumento(doc);
  }

  async abrirVistaPreviaDesdeModalActividad(adjunto: {
    nombre: string;
    tipo: string;
    tamano: number;
    objectKey?: string;
    archivo?: File;
    dataUrl?: string;
    url?: string;
  }): Promise<void> {
    const doc: DocumentoResumen = {
      actividad: this.actividadParaEditar?.nombre || 'Actividad',
      origen: 'Actividad',
      nombre: adjunto?.nombre || 'Documento adjunto',
      tipo: adjunto?.tipo || 'Archivo',
      adjunto: {
        nombre: adjunto?.nombre || 'Documento adjunto',
        tipo: adjunto?.tipo || 'application/octet-stream',
        tamano: Number(adjunto?.tamano || 0),
        objectKey: adjunto?.objectKey,
        archivo: adjunto?.archivo,
        dataUrl: adjunto?.dataUrl,
        url: adjunto?.url
      }
    };

    await this.abrirVistaPreviaDocumento(doc);
  }

  cerrarVistaPreviaDocumento(): void {
    this.liberarFuenteVistaPreviaDocumento();
    this.fuenteVistaPreviaDocumento = '';
    this.htmlVistaPreviaDocumento = null;
    this.cargandoVistaPreviaDocumento = false;
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

  obtenerHtmlVistaPreviaDocumento(): SafeHtml {
    return this.htmlVistaPreviaDocumento || this.sanitizer.bypassSecurityTrustHtml(
      this.adjuntosPreviewService.generarMensajePreviewHtml('Sin contenido para vista previa.')
    );
  }

  async descargarTodosDocumentosResumen(): Promise<void> {
    if (typeof window === 'undefined') return;

    const sinContenido: string[] = [];
    let descargados = 0;

    for (const doc of this.documentosActividadResumen) {
      const { adjunto } = doc;
      const blob = await this.resolverBlobAdjunto(adjunto);
      if (blob) {
        await this.adjuntosPreviewService.descargarAdjunto({
          nombre: adjunto.nombre,
          tipo: adjunto.tipo,
          archivo: new File([blob], adjunto.nombre || 'documento', { type: adjunto.tipo || blob.type || 'application/octet-stream' })
        });
        descargados += 1;
      } else {
        const fuente = await this.resolverFuenteAdjunto(adjunto);
        if (fuente) {
          await this.adjuntosPreviewService.descargarAdjunto({
            nombre: adjunto.nombre,
            tipo: adjunto.tipo,
            url: fuente.url
          });
          if (fuente.revokeObjectUrl) {
            window.URL.revokeObjectURL(fuente.url);
          }
          descargados += 1;
        } else {
          sinContenido.push(`${adjunto.nombre || 'documento'} | ${doc.origen} | Actividad: ${doc.actividad}`);
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
      adicionales: this.registroSolicitudesService.obtenerCostosAdicionales(this.proyecto.id),
      categoriasPersistidas: this.registroSolicitudesService.obtenerCategoriasAdicionales(this.proyecto.id)
    }).subscribe({
      next: ({ materiales, manoObra, adicionales, categoriasPersistidas }) => {
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

        this.tablasCostosExtras = this.agruparAdicionalesPorCategoria(adicionales || [], categoriasPersistidas || []);
        this.inicializarSeccionCostos();
        this.snapshotCostosBase = this.crearSnapshotCostosActual();
      },
      error: () => {
        this.materiales = [];
        this.manoObra = [];
        this.tablasCostosExtras = [];
        this.inicializarSeccionCostos();
        this.snapshotCostosBase = this.crearSnapshotCostosActual();
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
  }>, categoriasPersistidas: CostoCategoriaAdicionalApi[]): TablaCostoExtra[] {
    const tablas: TablaCostoExtra[] = [];
    const porNombreNormalizado = new Map<string, TablaCostoExtra>();

    for (const categoria of categoriasPersistidas || []) {
      const nombre = (categoria.nombre || '').trim();
      if (!nombre) continue;

      const tabla: TablaCostoExtra = {
        id: this.obtenerSiguienteIdTablaLocal(tablas),
        categoriaId: categoria.id,
        nombre,
        items: [],
        expandida: true
      };

      tablas.push(tabla);
      porNombreNormalizado.set(nombre.toLowerCase(), tabla);
    }

    for (const item of adicionales) {
      const categoria = (item.categoria || 'OTROS').trim() || 'OTROS';
      const claveCategoria = categoria.toLowerCase();
      let tabla = porNombreNormalizado.get(claveCategoria);

      if (!tabla) {
        tabla = {
          id: this.obtenerSiguienteIdTablaLocal(tablas),
          nombre: categoria,
          items: [],
          expandida: true
        };
        tablas.push(tabla);
        porNombreNormalizado.set(claveCategoria, tabla);
      }

      tabla.items.push({
        id: item.id,
        fecha: item.fecha || this.formatDate(new Date()),
        descripcion: item.descripcion || '',
        cantidad: Number(item.cantidad || 0),
        costoUnitario: Number(item.costoUnitario || 0),
        costoTotal: Number(item.costoTotal || 0),
        encargado: item.encargado || '',
        dependenciaActividadId: item.dependenciaActividadId ?? null
      });
    }

    return tablas.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  onAgregarCategoriaCostos(nombreCategoria: string): void {
    if (!this.proyecto || this.modoSoloLectura) return;

    const nombre = (nombreCategoria || '').trim();
    if (!nombre) return;

    const existente = this.tablasCostosExtras.find((tabla) => tabla.nombre.trim().toLowerCase() === nombre.toLowerCase());
    if (existente) {
      existente.expandida = true;
      return;
    }

    this.registroSolicitudesService.crearCategoriaAdicional(this.proyecto.id, nombre).subscribe({
      next: (categoria) => {
        this.tablasCostosExtras = [
          ...this.tablasCostosExtras,
          {
            id: this.obtenerSiguienteIdTablaLocal(this.tablasCostosExtras),
            categoriaId: categoria.id,
            nombre: categoria.nombre,
            items: [],
            expandida: true
          }
        ].sort((a, b) => a.nombre.localeCompare(b.nombre));
      },
      error: (error) => console.error('Error creando categoría adicional:', error)
    });
  }

  onEliminarCategoriaCostos(tabla: TablaCostoExtra): void {
    if (!this.proyecto || this.modoSoloLectura) return;

    const nombre = (tabla.nombre || '').trim().toLowerCase();
    this.tablasCostosExtras = this.tablasCostosExtras.filter((item) => item.id !== tabla.id);

    if (!tabla.categoriaId) {
      return;
    }

    this.registroSolicitudesService.eliminarCategoriaAdicional(this.proyecto.id, tabla.categoriaId).subscribe({
      error: (error) => {
        console.error('Error eliminando categoría adicional:', error);
        const existeRestaurada = this.tablasCostosExtras.some((item) => item.nombre.trim().toLowerCase() === nombre);
        if (!existeRestaurada) {
          this.tablasCostosExtras = [...this.tablasCostosExtras, tabla].sort((a, b) => a.nombre.localeCompare(b.nombre));
        }
      }
    });
  }

  private obtenerSiguienteIdTablaLocal(tablas: TablaCostoExtra[]): number {
    if (!tablas.length) return 1;
    return Math.max(...tablas.map((tabla) => tabla.id)) + 1;
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

    return this.asegurarCategoriasCostosPersistidas(proyectoId).pipe(
      switchMap(() => forkJoin({
        existentesMateriales: this.registroSolicitudesService.obtenerCostosMateriales(proyectoId),
        existentesManoObra: this.registroSolicitudesService.obtenerCostosManoObra(proyectoId),
        existentesAdicionales: this.registroSolicitudesService.obtenerCostosAdicionales(proyectoId)
      })),
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
      map(() => {
        this.snapshotCostosBase = this.crearSnapshotCostosActual();
        return null;
      }),
      finalize(() => {
        this.sincronizandoCostos = false;
      })
    );
  }

  private asegurarCategoriasCostosPersistidas(proyectoId: number): Observable<void> {
    const porNombre = new Map<string, TablaCostoExtra>();

    for (const tabla of this.tablasCostosExtras || []) {
      const nombre = (tabla.nombre || '').trim();
      if (!nombre) continue;
      const clave = nombre.toLowerCase();
      if (!porNombre.has(clave)) {
        porNombre.set(clave, tabla);
      }
    }

    if (!porNombre.size) {
      return of(void 0);
    }
    return this.registroSolicitudesService.obtenerCategoriasAdicionales(proyectoId).pipe(
      switchMap((persistidas) => {
        const porNombrePersistido = new Map<string, CostoCategoriaAdicionalApi>();
        for (const categoria of persistidas || []) {
          const nombre = (categoria.nombre || '').trim();
          if (!nombre) continue;
          porNombrePersistido.set(nombre.toLowerCase(), categoria);
        }

        for (const tabla of this.tablasCostosExtras || []) {
          const nombre = (tabla.nombre || '').trim().toLowerCase();
          const existente = porNombrePersistido.get(nombre);
          if (existente) {
            tabla.categoriaId = existente.id;
          }
        }

        const pendientesCrear: Array<{ tabla: TablaCostoExtra; nombre: string }> = [];
        for (const [clave, tabla] of porNombre.entries()) {
          if (!porNombrePersistido.has(clave)) {
            pendientesCrear.push({ tabla, nombre: tabla.nombre.trim() });
          }
        }

        if (!pendientesCrear.length) {
          return of([] as Array<{ tablaId: number; categoria: CostoCategoriaAdicionalApi }>);
        }

        return forkJoin(
          pendientesCrear.map((pendiente) =>
            this.registroSolicitudesService.crearCategoriaAdicional(proyectoId, pendiente.nombre).pipe(
              map((categoria) => ({ tablaId: pendiente.tabla.id, categoria }))
            )
          )
        );
      }),
      map((creadas) => {
        for (const creada of creadas || []) {
          const tabla = this.tablasCostosExtras.find((item) => item.id === creada.tablaId);
          if (tabla) {
            tabla.categoriaId = creada.categoria.id;
            tabla.nombre = creada.categoria.nombre;
          }
        }
        return void 0;
      })
    );
  }

  private crearIndiceAdjuntosOrdenCompra(ordenes: OrdenCompra[]): Map<string, FlujoAdjunto[]> {
    const indice = new Map<string, FlujoAdjunto[]>();

    for (const orden of ordenes || []) {
      const clave = this.generarClaveOrdenCompra(orden);
      indice.set(clave, (orden.adjuntos || []).map((adjunto) => ({ ...adjunto })));
    }

    return indice;
  }

  private generarClaveOrdenCompra(orden: OrdenCompra): string {
    return [
      (orden.numero || '').trim(),
      (orden.fecha || '').trim(),
      this.normalizarTipoOrdenCompra(orden.tipo),
      (orden.numeroLicitacion || '').trim(),
      (orden.numeroSolicitud || '').trim(),
      Number(orden.total || 0).toFixed(2)
    ].join('|');
  }

  get hayCambiosInformacion(): boolean {
    return this.crearSnapshotInformacionActual() !== this.snapshotInfoBase;
  }

  get hayCambiosCostos(): boolean {
    return this.crearSnapshotCostosActual() !== this.snapshotCostosBase;
  }

  tieneCambiosInformacion(): boolean {
    return this.hayCambiosInformacion;
  }

  tieneCambiosCostos(): boolean {
    return this.hayCambiosCostos;
  }

  private crearSnapshotInformacionActual(): string {
    const ordenes = (this.proyectoInfoForm.ordenesCompra || [])
      .filter((o) => (o.numero || '').trim())
      .map((o) => ({
        id: Number(o.id || 0),
        numero: (o.numero || '').trim(),
        fecha: o.fecha || '',
        tipo: this.normalizarTipoOrdenCompra(o.tipo),
        numeroLicitacion: (o.numeroLicitacion || '').trim(),
        numeroSolicitud: (o.numeroSolicitud || '').trim(),
        total: Number(o.total || 0),
        adjuntos: (o.adjuntos || []).map((adjunto) => ({
          nombre: (adjunto.nombre || '').trim(),
          tipo: (adjunto.tipo || '').trim(),
          tamano: Number(adjunto.tamano || 0),
          objectKey: (adjunto.objectKey || '').trim(),
          dataUrl: adjunto.objectKey ? '' : ((adjunto.dataUrl || adjunto.url || '') as string).trim()
        }))
      }));

    const payload = {
      nombreProyecto: (this.proyectoInfoForm.nombreProyecto || '').trim(),
      cliente: (this.proyectoInfoForm.cliente || '').trim(),
      representante: (this.proyectoInfoForm.representante || '').trim(),
      areas: [...(this.proyectoInfoForm.areas || [])].map((a) => (a || '').trim()).sort(),
      ordenesCompra: ordenes,
      costo: Number(this.proyectoInfoForm.costo || 0),
      procesoId: Number(this.proyectoInfoForm.procesoId || 0),
      responsableId: Number(this.proyectoInfoForm.responsableId || 0),
      fechaInicio: this.proyectoInfoForm.fechaInicio || '',
      ubicacion: (this.proyectoInfoForm.ubicacion || '').trim(),
      descripcion: (this.proyectoInfoForm.descripcion || '').trim()
    };

    return JSON.stringify(payload);
  }

  private crearSnapshotCostosActual(): string {
    const materiales = (this.materiales || []).map((item) => ({
      id: Number(item.id || 0),
      fecha: item.fecha || '',
      nroComprobante: (item.nroComprobante || '').trim(),
      producto: (item.producto || '').trim(),
      cantidad: Number(item.cantidad || 0),
      costoUnitario: Number(item.costoUnitario || 0),
      costoTotal: Number(item.costoTotal || 0),
      encargado: (item.encargado || '').trim(),
      dependenciaActividadId: item.dependenciaActividadId ?? null
    }));

    const manoObra = (this.manoObra || []).map((item) => ({
      id: Number(item.id || 0),
      trabajador: (item.trabajador || '').trim(),
      cargo: (item.cargo || '').trim(),
      diasTrabajando: Number(item.diasTrabajando || 0),
      costoPorDia: Number(item.costoPorDia || 0),
      costoTotal: Number(item.costoTotal || 0),
      dependenciaActividadId: item.dependenciaActividadId ?? null
    }));

    const extras = (this.tablasCostosExtras || []).map((tabla) => ({
      id: Number(tabla.id || 0),
      nombre: (tabla.nombre || '').trim(),
      items: (tabla.items || []).map((item) => ({
        id: Number(item.id || 0),
        fecha: item.fecha || '',
        descripcion: (item.descripcion || '').trim(),
        cantidad: Number(item.cantidad || 0),
        costoUnitario: Number(item.costoUnitario || 0),
        costoTotal: Number(item.costoTotal || 0),
        encargado: (item.encargado || '').trim(),
        dependenciaActividadId: item.dependenciaActividadId ?? null
      }))
    }));

    return JSON.stringify({ materiales, manoObra, extras });
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

  private async resolverFuenteAdjunto(adjunto: FlujoAdjunto): Promise<{ url: string; revokeObjectUrl: boolean } | null> {
    if (adjunto.archivo instanceof Blob) {
      return {
        url: window.URL.createObjectURL(adjunto.archivo),
        revokeObjectUrl: true
      };
    }

    const fuente = this.adjuntosPreviewService.getAdjuntoUrl({
      nombre: adjunto.nombre,
      tipo: adjunto.tipo,
      dataUrl: adjunto.dataUrl,
      url: (adjunto as any).url
    }) || '';
    if (!fuente) {
      if (adjunto.objectKey) {
        const blob = await this.resolverBlobPorObjectKey(adjunto.objectKey);
        if (blob) {
          return {
            url: window.URL.createObjectURL(blob),
            revokeObjectUrl: true
          };
        }
      }
      return null;
    }

    if (/^data:/i.test(fuente) || fuente.startsWith('blob:')) {
      return { url: fuente, revokeObjectUrl: false };
    }

    try {
      const blob = await firstValueFrom(this.httpClient.get(fuente, { responseType: 'blob' }));
      return {
        url: window.URL.createObjectURL(blob),
        revokeObjectUrl: true
      };
    } catch (error) {
      console.error('No se pudo resolver adjunto remoto para vista/descarga:', error);
      if (/^https?:\/\//i.test(fuente) || fuente.startsWith('/')) {
        return { url: fuente, revokeObjectUrl: false };
      }
      return { url: `/${fuente.replace(/^\/+/, '')}`, revokeObjectUrl: false };
    }
  }

  private async resolverBlobAdjunto(adjunto: FlujoAdjunto): Promise<Blob | null> {
    if (adjunto.objectKey) {
      const desdeObjectKey = await this.resolverBlobPorObjectKey(adjunto.objectKey);
      if (desdeObjectKey) return desdeObjectKey;
    }

    try {
      return await this.adjuntosPreviewService.obtenerBlob({
        nombre: adjunto.nombre,
        tipo: adjunto.tipo,
        archivo: adjunto.archivo,
        dataUrl: adjunto.dataUrl,
        url: (adjunto as any).url
      });
    } catch (error) {
      console.error('No se pudo descargar el adjunto como blob:', error);
      return null;
    }
  }

  private async resolverBlobPorObjectKey(objectKey: string): Promise<Blob | null> {
    const key = (objectKey || '').trim();
    if (!key) return null;

    const encodedKey = encodeURIComponent(key);
    const endpoints = [
      `/v1/storage/download?objectKey=${encodedKey}`,
      `/v1/storage/download/${encodedKey}`,
      `/v1/storage/file/${encodedKey}`,
      `/v1/storage/${encodedKey}`
    ];

    for (const endpoint of endpoints) {
      try {
        return await firstValueFrom(this.httpService.downloadFile(endpoint));
      } catch {
        // Probar siguiente endpoint compatible.
      }
    }

    return null;
  }

  private mapearDocumentoAdjunto(doc: DocumentoResumen | null): { nombre?: string; tipo?: string; archivo?: File; dataUrl?: string; url?: string } {
    if (!doc) return {};

    return {
      nombre: doc.nombre,
      tipo: doc.tipo,
      archivo: doc.adjunto?.archivo,
      dataUrl: doc.adjunto?.dataUrl,
      url: (doc.adjunto as any)?.url
    };
  }

  private marcarActualizacionProyecto(): void {
    if (!this.proyecto) return;

    this.proyecto.fechaActualizacion = new Date();
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
