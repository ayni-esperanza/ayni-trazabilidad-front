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
  @Input() actividadesDisponibles: ActividadCostoOption[] = [];
  @Input() modoSoloLectura = false;
  @Output() costosChange = new EventEmitter<void>();
  @Output() agregarCategoria = new EventEmitter<string>();
  @Output() eliminarCategoria = new EventEmitter<TablaCostoExtra>();

  subTabCostosActiva: 'materiales' | 'manoObra' | 'otrosCostos' = 'materiales';
  nuevoNombreTablaExtra = '';

  private formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
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

  get totalCostosGeneral(): number {
    return this.totalMateriales + this.totalManoObra + this.totalOtrosCostos;
  }
}
