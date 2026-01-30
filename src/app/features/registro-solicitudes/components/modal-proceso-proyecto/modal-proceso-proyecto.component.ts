import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Proyecto, EtapaProyecto, TareaAsignada, Responsable, ProcesoSimple } from '../../models/solicitud.model';

// Interfaces para Costos
export interface MaterialCosto {
  id: number;
  fecha: string;
  nroComprobante: string;
  producto: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  encargado: string;
}

export interface ManoObraCosto {
  id: number;
  trabajador: string;
  cargo: string;
  diasTrabajando: number;
  costoPorDia: number;
  costoTotal: number;
}

export interface OtroCosto {
  id: number;
  fecha: string;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
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
  imports: [CommonModule, FormsModule],
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
  @Output() cancelarProy = new EventEmitter<void>();
  @Output() finalizarEtapa = new EventEmitter<EtapaProyecto>();
  @Output() finalizarProy = new EventEmitter<Proyecto>();
  @Output() cambiarProyecto = new EventEmitter<number>();

  etapas: EtapaProyecto[] = [];
  proyectoFinalizado = false;
  infoProyectoExpandida = false;
  mostrarConfeti = false;
  confetis: { id: number; tipo: string; color: string; left: number; delay: number; duration: number }[] = [];
  etapaSeleccionada: EtapaProyecto | null = null;
  proyectoSeleccionadoId = 0;

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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyecto'] && this.proyecto) {
      this.proyectoSeleccionadoId = this.proyecto.id;
      this.proyectoFinalizado = this.proyecto.estado === 'Finalizado';
      this.generarEtapas();
    }
  }

  get todasEtapasCompletadas(): boolean {
    return this.etapas.length > 0 && this.etapas.every(e => e.estado === 'Completado');
  }

  get modoSoloLectura(): boolean {
    return this.proyectoFinalizado || this.todasEtapasCompletadas;
  }

  generarEtapas(): void {
    if (!this.proyecto) return;
    const proceso = this.procesos.find(p => p.id === this.proyecto!.procesoId);
    
    this.etapas = proceso?.etapas.map((etapa, index) => ({
      id: index + 1,
      proyectoId: this.proyecto!.id,
      etapaId: etapa.id,
      nombre: etapa.nombre,
      orden: etapa.orden,
      presupuesto: 0,
      responsableId: this.proyecto!.responsableId,
      responsableNombre: this.proyecto!.responsableNombre,
      fechaInicio: this.proyecto!.fechaInicio,
      fechaFinalizacion: this.proyecto!.fechaFinalizacion,
      estado: index === 0 ? 'En Proceso' : 'Pendiente',
      tareas: this.generarTareasEjemplo(index + 1)
    })) || [];

    if (this.etapas.length > 0) {
      this.seleccionarEtapa(this.etapas[0]);
    }
  }

  generarTareasEjemplo(etapaId: number): TareaAsignada[] {
    return [
      { id: 1, etapaProyectoId: etapaId, responsableId: 1, responsableNombre: 'Ejemplo1', tarea: 'Ejemplo1', fechaInicio: new Date(), fechaFin: new Date(), estado: 'Con Retraso' },
      { id: 2, etapaProyectoId: etapaId, responsableId: 1, responsableNombre: 'Ejemplo1', tarea: 'Ejemplo1', fechaInicio: new Date(), fechaFin: new Date(), estado: 'Con Retraso' },
      { id: 3, etapaProyectoId: etapaId, responsableId: 2, responsableNombre: 'Ejemplo1', tarea: 'Ejemplo1', fechaInicio: new Date(), fechaFin: new Date(), estado: 'Completado' },
      { id: 4, etapaProyectoId: etapaId, responsableId: 3, responsableNombre: 'Ejemplo1', tarea: 'Ejemplo1', fechaInicio: new Date(), fechaFin: new Date(), estado: 'Completado' },
      { id: 5, etapaProyectoId: etapaId, responsableId: 4, responsableNombre: 'Ejemplo1', tarea: 'Ejemplo1', fechaInicio: new Date(), fechaFin: new Date(), estado: 'Completado' }
    ];
  }

  seleccionarEtapa(etapa: EtapaProyecto): void {
    this.etapaSeleccionada = etapa;
    this.etapaForm = {
      presupuesto: etapa.presupuesto,
      responsableId: etapa.responsableId,
      fechaInicio: this.formatDate(etapa.fechaInicio),
      fechaFinalizacion: this.formatDate(etapa.fechaFinalizacion)
    };
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  formatDisplayDate(date: Date | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  onCerrar(): void {
    this.cerrar.emit();
  }

  onCancelarProyecto(): void {
    this.cancelarProy.emit();
  }

  onFinalizarEtapa(): void {
    if (this.etapaSeleccionada) {
      this.etapaSeleccionada.presupuesto = this.etapaForm.presupuesto;
      this.etapaSeleccionada.responsableId = this.etapaForm.responsableId;
      this.etapaSeleccionada.estado = 'Completado';
      this.finalizarEtapa.emit(this.etapaSeleccionada);

      // Avanzar a siguiente etapa
      const index = this.etapas.findIndex(e => e.id === this.etapaSeleccionada!.id);
      if (index + 1 < this.etapas.length) {
        this.etapas[index + 1].estado = 'En Proceso';
        this.seleccionarEtapa(this.etapas[index + 1]);
      }
    }
  }

  onCambiarProyecto(): void {
    this.cambiarProyecto.emit(Number(this.proyectoSeleccionadoId));
  }

  getEstadoIcon(tarea: TareaAsignada): string {
    return tarea.estado === 'Con Retraso' ? 'warning' : tarea.estado === 'Completado' ? 'check' : '';
  }

  isConRetraso(tarea: TareaAsignada): boolean {
    return tarea.estado === 'Con Retraso';
  }

  onFinalizarProyecto(): void {
    if (this.proyecto && this.todasEtapasCompletadas) {
      this.proyecto.estado = 'Finalizado';
      this.proyectoFinalizado = true;
      this.lanzarConfeti();
      this.finalizarProy.emit(this.proyecto);
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
      cantidad: 0,
      costoUnitario: 0,
      costoTotal: 0,
      encargado: ''
    });
  }

  eliminarMaterial(id: number): void {
    this.materiales = this.materiales.filter(m => m.id !== id);
  }

  calcularCostoTotalMaterial(material: MaterialCosto): void {
    material.costoTotal = material.cantidad * material.costoUnitario;
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
      diasTrabajando: 0,
      costoPorDia: 0,
      costoTotal: 0
    });
  }

  eliminarManoObra(id: number): void {
    this.manoObra = this.manoObra.filter(m => m.id !== id);
  }

  calcularCostoTotalManoObra(item: ManoObraCosto): void {
    item.costoTotal = item.diasTrabajando * item.costoPorDia;
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
      cantidad: 0,
      costoUnitario: 0,
      costoTotal: 0,
      encargado: ''
    });
  }

  eliminarItemOtroCosto(tabla: TablaCostoExtra, itemId: number): void {
    tabla.items = tabla.items.filter(i => i.id !== itemId);
  }

  calcularCostoTotalOtro(item: OtroCosto): void {
    item.costoTotal = item.cantidad * item.costoUnitario;
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
