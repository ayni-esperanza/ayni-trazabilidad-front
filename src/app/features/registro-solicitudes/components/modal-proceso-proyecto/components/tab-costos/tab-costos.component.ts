import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerComponent } from '../../../../../../shared/components/date-picker/date-picker.component';
import {
  ActividadCostoOption,
  MaterialCosto,
  ManoObraCosto,
  OtroCosto,
  TablaCostoExtra
} from '../../modal-proceso-proyecto.component';

type ProyectoCostosResumen = {
  nombreProyecto?: string;
  cliente?: string;
  responsableId?: number;
  fechaInicio?: string;
  fechaFinalizacion?: string;
  ubicacion?: string;
};

type ResumenCostoItem = {
  nombre: string;
  total: number;
};

@Component({
  selector: 'app-tab-costos',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent],
  templateUrl: './tab-costos.component.html'
})
export class TabCostosComponent {
  @Input() materiales!: MaterialCosto[];
  @Input() manoObra!: ManoObraCosto[];
  @Input() tablasCostosExtras!: TablaCostoExtra[];
  @Input() proyectoInfoForm: ProyectoCostosResumen | null = null;
  @Input() proyectoId: number | null | undefined = null;
  @Input() responsableNombre = '';
  @Input() actividadesDisponibles: ActividadCostoOption[] = [];
  @Input() modoSoloLectura = false;
  @Output() costosChange = new EventEmitter<void>();
  @Output() agregarCategoria = new EventEmitter<string>();
  @Output() eliminarCategoria = new EventEmitter<TablaCostoExtra>();

  subTabCostosActiva: 'resumen' | 'materiales' | 'manoObra' | 'otrosCostos' = 'resumen';
  nuevoNombreTablaExtra = '';

  private formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  emitirCambios(): void {
    this.costosChange.emit();
  }

  agregarMaterial(): void {
    const nuevoId = this.materiales.length > 0 ? Math.max(...this.materiales.map(m => m.id)) + 1 : 1;
    this.materiales.push({
      id: nuevoId,
      fecha: this.formatDate(new Date()),
      nroComprobante: '',
      tipo: '',
      producto: '',
      cantidad: null,
      costoUnitario: null,
      costoTotal: 0,
      encargado: '',
      dependenciaActividadId: null
    });
    this.emitirCambios();
  }

  eliminarMaterial(id: number): void {
    const idx = this.materiales.findIndex(m => m.id === id);
    if (idx >= 0) {
      this.materiales.splice(idx, 1);
      this.emitirCambios();
    }
  }

  calcularCostoTotalMaterial(material: MaterialCosto): void {
    material.costoTotal = (material.cantidad || 0) * (material.costoUnitario || 0);
    this.emitirCambios();
  }

  get totalMateriales(): number {
    return this.materiales?.reduce((sum, m) => sum + m.costoTotal, 0) ?? 0;
  }

  get materialesPorTipo(): ResumenCostoItem[] {
    return this.agruparPorNombre(this.materiales || [], (item) => item.tipo || 'Sin tipo');
  }

  agregarManoObra(): void {
    const nuevoId = this.manoObra.length > 0 ? Math.max(...this.manoObra.map(m => m.id)) + 1 : 1;
    this.manoObra.push({
      id: nuevoId,
      trabajador: '',
      cargo: '',
      diasTrabajando: null,
      costoPorDia: null,
      costoTotal: 0,
      dependenciaActividadId: null
    });
    this.emitirCambios();
  }

  eliminarManoObra(id: number): void {
    const idx = this.manoObra.findIndex(m => m.id === id);
    if (idx >= 0) {
      this.manoObra.splice(idx, 1);
      this.emitirCambios();
    }
  }

  calcularCostoTotalManoObra(item: ManoObraCosto): void {
    item.costoTotal = (item.diasTrabajando || 0) * (item.costoPorDia || 0);
    this.emitirCambios();
  }

  get totalManoObra(): number {
    return this.manoObra?.reduce((sum, m) => sum + m.costoTotal, 0) ?? 0;
  }

  get manoObraPorCargo(): ResumenCostoItem[] {
    return this.agruparPorNombre(this.manoObra || [], (item) => item.cargo || 'Sin cargo');
  }

  agregarTablaExtra(): void {
    const nombre = this.nuevoNombreTablaExtra.trim();
    if (!nombre) return;

    this.agregarCategoria.emit(nombre);
    this.nuevoNombreTablaExtra = '';
  }

  eliminarTablaExtra(id: number): void {
    const tabla = this.tablasCostosExtras.find(t => t.id === id);
    if (!tabla) return;
    this.eliminarCategoria.emit(tabla);
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
      encargado: '',
      dependenciaActividadId: null
    });
    this.emitirCambios();
  }

  eliminarItemOtroCosto(tabla: TablaCostoExtra, itemId: number): void {
    const idx = tabla.items.findIndex(i => i.id === itemId);
    if (idx >= 0) {
      tabla.items.splice(idx, 1);
      this.emitirCambios();
    }
  }

  calcularCostoTotalOtro(item: OtroCosto): void {
    item.costoTotal = (item.cantidad || 0) * (item.costoUnitario || 0);
    this.emitirCambios();
  }

  getTotalTablaExtra(tabla: TablaCostoExtra): number {
    return tabla.items.reduce((sum, i) => sum + i.costoTotal, 0);
  }

  get totalOtrosCostos(): number {
    return this.tablasCostosExtras?.reduce((sum, t) => sum + this.getTotalTablaExtra(t), 0) ?? 0;
  }

  get otrosCostosPorCategoria(): ResumenCostoItem[] {
    return (this.tablasCostosExtras || [])
      .map((tabla) => ({
        nombre: (tabla.nombre || '').trim() || 'Sin categoría',
        total: this.getTotalTablaExtra(tabla)
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get totalCostosGeneral(): number {
    return this.totalMateriales + this.totalManoObra + this.totalOtrosCostos;
  }

  get fechaInicioResumen(): string {
    return this.formatearFechaResumen(this.proyectoInfoForm?.fechaInicio);
  }

  get fechaFinResumen(): string {
    return this.formatearFechaResumen(this.proyectoInfoForm?.fechaFinalizacion);
  }

  trackResumenItem(_: number, item: ResumenCostoItem): string {
    return item.nombre;
  }

  private agruparPorNombre<T extends { costoTotal: number }>(items: T[], obtenerNombre: (item: T) => string): ResumenCostoItem[] {
    const acumulado = new Map<string, number>();

    for (const item of items) {
      const nombre = (obtenerNombre(item) || '').trim() || 'Sin clasificar';
      acumulado.set(nombre, (acumulado.get(nombre) || 0) + Number(item.costoTotal || 0));
    }

    return Array.from(acumulado.entries())
      .map(([nombre, total]) => ({ nombre, total }))
      .filter((item) => item.total > 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  private formatearFechaResumen(date: Date | string | undefined): string {
    if (!date) return '';
    if (typeof date === 'string') {
      const soloFecha = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (soloFecha) {
        return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
      }
    }
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
