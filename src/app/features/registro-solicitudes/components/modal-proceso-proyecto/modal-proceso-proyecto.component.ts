import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Proyecto, EtapaProyecto, TareaAsignada, Responsable, ProcesoSimple } from '../../models/solicitud.model';
import { ModalDismissDirective } from '../../../../shared/directives/modal-dismiss.directive';
import { ConfirmDeleteModalComponent, ConfirmDeleteConfig } from '../../../../shared/components/confirm-delete-modal/confirm-delete-modal.component';

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
  imports: [CommonModule, FormsModule, ModalDismissDirective, ConfirmDeleteModalComponent],
  templateUrl: './modal-proceso-proyecto.component.html',
  styleUrls: ['./modal-proceso-proyecto.component.css']
})
export class ModalProcesoProyectoComponent implements OnChanges {
  @Input() visible = false;
  @Input() proyecto: Proyecto | null = null;
  @Input() proyectos: Proyecto[] = [];
  @Input() responsables: Responsable[] = [];
  @Input() procesos: ProcesoSimple[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @Output() cancelarProy = new EventEmitter<{motivo: string}>();
  @Output() finalizarEtapa = new EventEmitter<EtapaProyecto>();
  @Output() finalizarProy = new EventEmitter<Proyecto>();
  @Output() cambiarProyecto = new EventEmitter<number>();

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

  // Sección de Costos
  seccionCostosExpandida = true;
  materialesExpandida = true;
  manoObraExpandida = true;
  otrosCostosExpandida = true;

  // Navegación de tabs
  tabActiva: 'proceso' | 'costos' = 'proceso';
  subTabCostosActiva: 'materiales' | 'manoObra' | 'otrosCostos' = 'materiales';

  // TODO: Backend - Cargar costos desde el servicio
  // Estos arrays se llenarán con datos del backend
  materiales: MaterialCosto[] = [];
  manoObra: ManoObraCosto[] = [];
  tablasCostosExtras: TablaCostoExtra[] = [];
  
  nuevoNombreTablaExtra = '';

  etapaForm = {
    presupuesto: 0,
    responsableId: 0,
    fechaInicio: '',
    fechaFinalizacion: ''
  };

  // Control de visibilidad de la card de tareas
  tareasCardVisible = true;

  // Control de validación para etapa
  intentoFinalizarEtapa = false;
  erroresEtapa: { [key: string]: string } = {};
  Object = Object;  // Para usar en el template

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyecto'] && this.proyecto) {
      this.proyectoSeleccionadoId = this.proyecto.id;
      this.proyectoFinalizado = this.proyecto.estado === 'Completado';
      this.proyectoCancelado = this.proyecto.estado === 'Cancelado';
      // Expandir automáticamente la información cuando el proyecto está finalizado o cancelado
      this.infoProyectoExpandida = this.proyectoFinalizado || this.proyectoCancelado;
      this.generarEtapas();
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

  cambiarTab(nuevoTab: 'proceso' | 'costos'): void {
    // Guardar cambios de la etapa actual antes de cambiar tab
    if (this.tabActiva === 'proceso' && this.etapaSeleccionada && !this.modoSoloLectura) {
      this.guardarCambiosEtapaActual();
    }
    this.tabActiva = nuevoTab;
  }

  getMinFechaInicio(): string {
    if (!this.proyecto) return '';
    
    // La fecha mínima es la mayor entre:
    // 1. La fecha de inicio del proyecto
    // 2. La fecha de finalización de la etapa anterior (si existe)
    const fechaInicioProyecto = this.formatDate(this.proyecto.fechaInicio);
    const etapaAnterior = this.getEtapaAnterior();
    
    if (etapaAnterior && etapaAnterior.fechaFinalizacion) {
      const fechaFinAnterior = this.formatDate(etapaAnterior.fechaFinalizacion);
      return fechaFinAnterior > fechaInicioProyecto ? fechaFinAnterior : fechaInicioProyecto;
    }
    
    return fechaInicioProyecto;
  }

  getMaxFechaFin(): string {
    if (!this.proyecto) return '';
    return this.formatDate(this.proyecto.fechaFinalizacion);
  }

  private getEtapaAnterior(): EtapaProyecto | null {
    if (!this.etapaSeleccionada) return null;
    
    const index = this.etapas.findIndex(e => e.id === this.etapaSeleccionada!.id);
    return index > 0 ? this.etapas[index - 1] : null;
  }

  getTotalPresupuestoEtapas(): number {
    return this.etapas.reduce((total, etapa) => total + (etapa.presupuesto || 0), 0);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  formatDisplayDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  getEstadoIcon(tarea: TareaAsignada): string {
    return tarea.estado === 'Retrasado' ? 'warning' : tarea.estado === 'Completado' ? 'check' : '';
  }

  isRetrasado(tarea: TareaAsignada): boolean {
    return tarea.estado === 'Retrasado';
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
    const resp = this.responsables.find(r => r.id === responsableId);
    return resp?.nombre || 'Sin asignar';
  }

  // ========== Métodos para Costos ==========
  
  // Materiales
  agregarMaterial(): void {
    const nuevoId = this.materiales.length > 0 ? Math.max(...this.materiales.map(m => m.id)) + 1 : 1;
    this.materiales.push({
      id: nuevoId,
      fecha: this.formatDate(new Date()),
      nroComprobante: '',
      producto: '',
      cantidad: null,
      costoUnitario: null,
      costoTotal: 0,
      encargado: ''
    });
  }

  eliminarMaterial(id: number): void {
    this.materiales = this.materiales.filter(m => m.id !== id);
  }

  calcularCostoTotalMaterial(material: MaterialCosto): void {
    material.costoTotal = (material.cantidad || 0) * (material.costoUnitario || 0);
  }

  get totalMateriales(): number {
    return this.materiales.reduce((sum, m) => sum + m.costoTotal, 0);
  }

  // Mano de Obra
  agregarManoObra(): void {
    const nuevoId = this.manoObra.length > 0 ? Math.max(...this.manoObra.map(m => m.id)) + 1 : 1;
    this.manoObra.push({
      id: nuevoId,
      trabajador: '',
      cargo: '',
      diasTrabajando: null,
      costoPorDia: null,
      costoTotal: 0
    });
  }

  eliminarManoObra(id: number): void {
    this.manoObra = this.manoObra.filter(m => m.id !== id);
  }

  calcularCostoTotalManoObra(item: ManoObraCosto): void {
    item.costoTotal = (item.diasTrabajando || 0) * (item.costoPorDia || 0);
  }

  get totalManoObra(): number {
    return this.manoObra.reduce((sum, m) => sum + m.costoTotal, 0);
  }

  // Otros Costos (Tablas dinámicas)
  agregarTablaExtra(): void {
    if (!this.nuevoNombreTablaExtra.trim()) return;
    const nuevoId = this.tablasCostosExtras.length > 0 ? Math.max(...this.tablasCostosExtras.map(t => t.id)) + 1 : 1;
    this.tablasCostosExtras.push({
      id: nuevoId,
      nombre: this.nuevoNombreTablaExtra.trim(),
      items: [],
      expandida: true
    });
    this.nuevoNombreTablaExtra = '';
  }

  eliminarTablaExtra(id: number): void {
    this.tablasCostosExtras = this.tablasCostosExtras.filter(t => t.id !== id);
  }

  agregarItemOtroCosto(tabla: TablaCostoExtra): void {
    const nuevoId = tabla.items.length > 0 ? Math.max(...tabla.items.map(i => i.id)) + 1 : 1;
    tabla.items.push({
      id: nuevoId,
      fecha: this.formatDate(new Date()),
      descripcion: '',
      cantidad: null,
      costoUnitario: null,
      costoTotal: 0,
      encargado: ''
    });
  }

  eliminarItemOtroCosto(tabla: TablaCostoExtra, itemId: number): void {
    tabla.items = tabla.items.filter(i => i.id !== itemId);
  }

  calcularCostoTotalOtro(item: OtroCosto): void {
    item.costoTotal = (item.cantidad || 0) * (item.costoUnitario || 0);
  }

  getTotalTablaExtra(tabla: TablaCostoExtra): number {
    return tabla.items.reduce((sum, i) => sum + i.costoTotal, 0);
  }

  get totalOtrosCostos(): number {
    return this.tablasCostosExtras.reduce((sum, t) => sum + this.getTotalTablaExtra(t), 0);
  }

  get totalCostosGeneral(): number {
    return this.totalMateriales + this.totalManoObra + this.totalOtrosCostos;
  }

  // ========== Métodos para Backend Integration ==========
  
  // TODO: Llamar este método cuando se abra la modal para cargar costos existentes
  cargarCostosDesdeBackend(): void {
    // TODO: Implementar llamada al servicio
    // this.costosService.getMateriales(this.proyecto.id).subscribe(data => this.materiales = data);
    // this.costosService.getManoObra(this.proyecto.id).subscribe(data => this.manoObra = data);
    // this.costosService.getOtrosCostos(this.proyecto.id).subscribe(data => this.tablasCostosExtras = data);
  }

  // TODO: Llamar este método para guardar todos los costos
  guardarCostos(): void {
    const costosData = {
      proyectoId: this.proyecto?.id,
      materiales: this.materiales,
      manoObra: this.manoObra,
      otrosCostos: this.tablasCostosExtras
    };
    console.log('Datos a enviar al backend:', costosData);
    // TODO: Implementar llamada al servicio
    // this.costosService.guardarCostos(costosData).subscribe(...);
  }
}
