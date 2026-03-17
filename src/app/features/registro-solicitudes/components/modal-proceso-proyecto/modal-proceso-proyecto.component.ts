import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Proyecto, EtapaProyecto, TareaAsignada, Responsable, ProcesoSimple, OrdenCompra, FlujoNodo, FlujoAdjunto } from '../../models/solicitud.model';
import { ModalDismissDirective } from '../../../../shared/directives/modal-dismiss.directive';
import { ConfirmDeleteModalComponent, ConfirmDeleteConfig } from '../../../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { TareaFormModalComponent, Tarea } from '../../../../shared/components/tarea-form-modal/tarea-form-modal.component';
import { TabProcesoComponent } from './components/tab-proceso/tab-proceso.component';
import { TabInformacionComponent } from './components/tab-informacion/tab-informacion.component';
import { TabCostosComponent } from './components/tab-costos/tab-costos.component';

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
}

export interface ManoObraCosto {
  id: number;
  trabajador: string;
  cargo: string;
  diasTrabajando: number | null;
  costoPorDia: number | null;
  costoTotal: number;
}

export interface OtroCosto {
  id: number;
  fecha: string;
  descripcion: string;
  cantidad: number | null;
  costoUnitario: number | null;
  costoTotal: number;
  encargado: string;
}

export interface TablaCostoExtra {
  id: number;
  nombre: string;
  items: OtroCosto[];
  expandida: boolean;
}

@Component({
  selector: 'app-modal-proceso-proyecto',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalDismissDirective, ConfirmDeleteModalComponent, TareaFormModalComponent, TabProcesoComponent, TabInformacionComponent, TabCostosComponent],
  templateUrl: './modal-proceso-proyecto.component.html',
  styleUrls: ['./modal-proceso-proyecto.component.css']
})
export class ModalProcesoProyectoComponent implements OnChanges {
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

  // Navegación de tabs
  tabActiva: 'proceso' | 'informacion' | 'costos' = 'proceso';

  // Modal de actividades
  mostrarModalActividad = false;
  actividadParaEditar: Tarea | null = null;
  nodoPadreParaNuevoId: number | null = null;

  flujoNodos: FlujoNodo[] = [];
  private readonly flujoStoragePrefix = 'ayni:registro-solicitudes:flujo:';

  // Formulario de información del proyecto (tab Información)
  proyectoInfoForm = {
    nombreProyecto: '',
    cliente: '',
    representante: '',
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

  cambiarTab(nuevoTab: 'proceso' | 'informacion' | 'costos'): void {
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
    return d.toISOString().split('T')[0];
  }

  onCerrar(): void {
    // Guardar cambios de la etapa actual antes de cerrar
    if (this.etapaSeleccionada && !this.modoSoloLectura) {
      this.guardarCambiosEtapaActual();
    }
    // Persistir etapas en el proyecto al cerrar
    this.guardarEtapasEnProyecto();
    this.cerrar.emit();
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
      await new Promise(resolve => setTimeout(resolve, 500));
      // Guardar etapas antes de cancelar para preservar datos ingresados
      if (this.etapaSeleccionada) {
        this.guardarCambiosEtapaActual();
      }
      this.guardarEtapasEnProyecto();
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
    if (this.proyecto && this.todasEtapasCompletadas) {
      this.proyecto.estado = 'Completado';
      this.proyectoFinalizado = true;
      // Guardar etapas en el proyecto antes de emitir
      this.guardarEtapasEnProyecto();
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
    const responsablesFijos: Responsable[] = [
      { id: 1, nombre: 'Rolando Rodriguez Mercedes' },
      { id: 2, nombre: 'Alex Marquina Perez' },
      { id: 3, nombre: 'Darling Vigo Cotos' },
      { id: 4, nombre: 'Rodolfo Razuri Arevalo' },
      { id: 5, nombre: 'Gian Juarez Rondo' }
    ];
    const resp = responsablesFijos.find(r => r.id === responsableId)
      ?? this.responsables.find(r => r.id === responsableId);
    return resp?.nombre || 'Sin asignar';
  }

  cargarProyectoInfoForm(): void {
    if (!this.proyecto) return;
    this.proyectoInfoForm = {
      nombreProyecto: this.proyecto.nombreProyecto,
      cliente: this.proyecto.cliente,
      representante: this.proyecto.representante || '',
      ordenesCompra: (this.proyecto.ordenesCompra || []).map(o => ({ ...o })),
      costo: this.proyecto.costo,
      procesoId: this.proyecto.procesoId,
      responsableId: this.proyecto.responsableId,
      fechaInicio: this.formatDate(this.proyecto.fechaInicio),
      fechaFinalizacion: this.formatDate(this.proyecto.fechaFinalizacion),
      ubicacion: this.proyecto.ubicacion || '',
      descripcion: this.proyecto.descripcion
    };
  }

  abrirModalActividad(nodo?: FlujoNodo): void {
    this.nodoPadreParaNuevoId = null;
    this.actividadParaEditar = nodo ? this.mapearNodoATarea(nodo) : null;
    this.mostrarModalActividad = true;
  }

  abrirNuevaActividadDesdeNodo(nodoBase: FlujoNodo): void {
    this.nodoPadreParaNuevoId = nodoBase.id;
    this.actividadParaEditar = null;
    this.mostrarModalActividad = true;
  }

  abrirNuevaActividadDesdeBpmn(payload: { nombre: string; nodoOrigenId?: number }): void {
    if (!this.proyecto) return;

    const posicionInicial = this.calcularPosicionNuevoNodo(payload.nodoOrigenId);

    // Crear primero el nodo en memoria para que no se pierda al renderizar el flujo.
    const nuevoNodo: FlujoNodo = {
      id: this.obtenerSiguienteNodoId(),
      nombre: payload.nombre || 'Nueva actividad',
      tipo: 'tarea',
      posicionX: posicionInicial.x,
      posicionY: posicionInicial.y,
      responsableId: undefined,
      fechaInicio: undefined,
      fechaFin: undefined,
      descripcion: '',
      adjuntos: [],
      siguientesIds: []
    };

    if (typeof payload.nodoOrigenId === 'number') {
      const indexOrigen = this.flujoNodos.findIndex(n => n.id === payload.nodoOrigenId);
      if (indexOrigen >= 0) {
        const origen = this.flujoNodos[indexOrigen];
        this.flujoNodos[indexOrigen] = {
          ...origen,
          siguientesIds: origen.siguientesIds.includes(nuevoNodo.id)
            ? origen.siguientesIds
            : [...origen.siguientesIds, nuevoNodo.id]
        };
      }
    }

    this.flujoNodos = [...this.flujoNodos, nuevoNodo];
    this.persistirFlujoProyecto();

    this.nodoPadreParaNuevoId = null;
    this.actividadParaEditar = this.mapearNodoATarea(nuevoNodo);
    this.mostrarModalActividad = true;
  }

  onGuardarActividad(actividad: Tarea): void {
    if (!this.proyecto) return;

    const indexNodoExistente = typeof actividad.id === 'number'
      ? this.flujoNodos.findIndex(n => n.id === actividad.id)
      : -1;

    if (indexNodoExistente >= 0) {
      const nodoActual = this.flujoNodos[indexNodoExistente];
      const nodoActualizado: FlujoNodo = {
        ...nodoActual,
        nombre: actividad.nombre,
        tipo: 'tarea',
        responsableId: actividad.responsableId ? Number(actividad.responsableId) : undefined,
        fechaInicio: actividad.fechaInicio || undefined,
        fechaFin: actividad.fechaFin || undefined,
        descripcion: actividad.descripcion || '',
        adjuntos: this.mapearAdjuntosActividadANodo(actividad.archivosAdjuntos)
      };

      this.flujoNodos = this.flujoNodos.map((nodo, i) => i === indexNodoExistente ? nodoActualizado : nodo);
    } else {
      const posicionInicial = this.calcularPosicionNuevoNodo(this.nodoPadreParaNuevoId ?? undefined);
      const nuevoNodo: FlujoNodo = {
        id: this.obtenerSiguienteNodoId(),
        nombre: actividad.nombre,
        tipo: 'tarea',
        posicionX: posicionInicial.x,
        posicionY: posicionInicial.y,
        responsableId: actividad.responsableId ? Number(actividad.responsableId) : undefined,
        fechaInicio: actividad.fechaInicio || undefined,
        fechaFin: actividad.fechaFin || undefined,
        descripcion: actividad.descripcion || '',
        adjuntos: this.mapearAdjuntosActividadANodo(actividad.archivosAdjuntos),
        siguientesIds: []
      };

      if (this.nodoPadreParaNuevoId !== null) {
        const indexPadre = this.flujoNodos.findIndex(n => n.id === this.nodoPadreParaNuevoId);
        if (indexPadre >= 0) {
          const padre = this.flujoNodos[indexPadre];
          const nuevosSiguientes = padre.siguientesIds.includes(nuevoNodo.id)
            ? padre.siguientesIds
            : [...padre.siguientesIds, nuevoNodo.id];
          this.flujoNodos[indexPadre] = { ...padre, siguientesIds: nuevosSiguientes };
        }
      } else if (this.flujoNodos.length > 0) {
        const ultimo = this.flujoNodos[this.flujoNodos.length - 1];
        const siguientes = ultimo.siguientesIds.includes(nuevoNodo.id)
          ? ultimo.siguientesIds
          : [...ultimo.siguientesIds, nuevoNodo.id];
        this.flujoNodos[this.flujoNodos.length - 1] = {
          ...ultimo,
          siguientesIds: siguientes
        };
      }

      this.flujoNodos = [...this.flujoNodos, nuevoNodo];
    }

    this.persistirFlujoProyecto();
    this.mostrarModalActividad = false;
    this.actividadParaEditar = null;
    this.nodoPadreParaNuevoId = null;
  }

  onEliminarActividad(nodoId: number): void {
    if (!this.proyecto) return;

    this.flujoNodos = this.flujoNodos
      .filter(nodo => nodo.id !== nodoId)
      .map(nodo => ({
        ...nodo,
        siguientesIds: nodo.siguientesIds.filter(id => id !== nodoId)
      }));

    this.persistirFlujoProyecto();
    this.mostrarModalActividad = false;
    this.actividadParaEditar = null;
    this.nodoPadreParaNuevoId = null;
  }

  onFlujoActualizado(nodosActualizados: FlujoNodo[]): void {
    this.flujoNodos = nodosActualizados.map(nodo => ({
      ...nodo,
      siguientesIds: [...nodo.siguientesIds]
    }));
    this.persistirFlujoProyecto();
  }

  onCerrarModalActividad(): void {
    this.mostrarModalActividad = false;
    this.actividadParaEditar = null;
    this.nodoPadreParaNuevoId = null;
  }

  private prepararFlujo(): void {
    if (!this.proyecto) return;

    const flujoGuardado = this.cargarFlujoDesdeLocalStorage();
    if (flujoGuardado && flujoGuardado.nodos.length > 0) {
      this.proyecto.flujo = {
        nodos: flujoGuardado.nodos.map(nodo => ({
          ...nodo,
          siguientesIds: [...(nodo.siguientesIds || [])]
        }))
      };
    }

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
    this.flujoNodos = [...this.proyecto.flujo.nodos];
  }

  private persistirFlujoProyecto(): void {
    if (!this.proyecto) return;
    this.proyecto.flujo = {
      nodos: this.flujoNodos.map(nodo => ({
        ...nodo,
        siguientesIds: [...nodo.siguientesIds]
      }))
    };
    this.guardarFlujoEnLocalStorage(this.proyecto.flujo.nodos);
  }

  private obtenerClaveFlujoStorage(): string | null {
    if (!this.proyecto || typeof window === 'undefined') return null;
    return `${this.flujoStoragePrefix}${this.proyecto.id}`;
  }

  private guardarFlujoEnLocalStorage(nodos: FlujoNodo[]): void {
    const storageKey = this.obtenerClaveFlujoStorage();
    if (!storageKey) return;

    const serializable = nodos.map(nodo => ({
      ...nodo,
      adjuntos: (nodo.adjuntos || []).map(adjunto => ({
        nombre: adjunto.nombre,
        tipo: adjunto.tipo,
        tamano: adjunto.tamano
      })),
      siguientesIds: [...(nodo.siguientesIds || [])]
    }));

    window.localStorage.setItem(storageKey, JSON.stringify({ nodos: serializable }));
  }

  private cargarFlujoDesdeLocalStorage(): { nodos: FlujoNodo[] } | null {
    const storageKey = this.obtenerClaveFlujoStorage();
    if (!storageKey) return null;

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as { nodos?: FlujoNodo[] };
      if (!parsed?.nodos || !Array.isArray(parsed.nodos)) return null;
      return {
        nodos: parsed.nodos
          .filter(nodo => typeof nodo.id === 'number' && Array.isArray(nodo.siguientesIds))
          .map(nodo => ({
            ...nodo,
            siguientesIds: [...nodo.siguientesIds]
          }))
      };
    } catch {
      return null;
    }
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
        archivo: (a as any).archivo
      })),
      estado: 'pendiente'
    };
  }

  private mapearAdjuntosActividadANodo(adjuntos: Tarea['archivosAdjuntos']): FlujoAdjunto[] {
    return (adjuntos || []).map(adjunto => ({
      nombre: adjunto.nombre,
      tipo: adjunto.tipo,
      tamano: adjunto.tamano,
      archivo: adjunto.archivo
    }));
  }

  private obtenerSiguienteNodoId(): number {
    if (this.flujoNodos.length === 0) return 1;
    return Math.max(...this.flujoNodos.map(n => n.id)) + 1;
  }

  guardarInfoProyecto(): void {
    if (!this.proyecto || this.modoSoloLectura) return;
    this.proyecto.nombreProyecto = this.proyectoInfoForm.nombreProyecto;
    this.proyecto.cliente = this.proyectoInfoForm.cliente;
    this.proyecto.representante = this.proyectoInfoForm.representante;
    this.proyecto.ordenesCompra = this.proyectoInfoForm.ordenesCompra.filter(o => o.numero.trim()).map(o => ({ ...o }));
    this.proyecto.costo = Number(this.proyectoInfoForm.costo);
    this.proyecto.procesoId = Number(this.proyectoInfoForm.procesoId);
    this.proyecto.responsableId = Number(this.proyectoInfoForm.responsableId);
    this.proyecto.responsableNombre = this.getResponsableNombre(Number(this.proyectoInfoForm.responsableId));
    this.proyecto.fechaInicio = this.proyectoInfoForm.fechaInicio;
    this.proyecto.fechaFinalizacion = this.proyectoInfoForm.fechaFinalizacion;
    this.proyecto.ubicacion = this.proyectoInfoForm.ubicacion;
    this.proyecto.descripcion = this.proyectoInfoForm.descripcion;
    this.infoActualizada.emit({
      costo: this.proyecto.costo,
      fechaInicio: this.proyectoInfoForm.fechaInicio,
      fechaFin: this.proyectoInfoForm.fechaFinalizacion
    });
    this.cerrar.emit();
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

  get totalCostosGeneral(): number {
    return this.totalMateriales + this.totalManoObra + this.totalOtrosCostos;
  }
}
