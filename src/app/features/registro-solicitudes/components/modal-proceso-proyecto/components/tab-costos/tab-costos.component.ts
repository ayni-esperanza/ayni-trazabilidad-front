import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerComponent } from '../../../../../../shared/components/date-picker/date-picker.component';
import {
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
  @Input() modoSoloLectura = false;

  subTabCostosActiva: 'materiales' | 'manoObra' | 'otrosCostos' = 'materiales';
  nuevoNombreTablaExtra = '';

  private formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  // --- Materiales ---

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
    const idx = this.materiales.findIndex(m => m.id === id);
    if (idx >= 0) this.materiales.splice(idx, 1);
  }

  calcularCostoTotalMaterial(material: MaterialCosto): void {
    material.costoTotal = (material.cantidad || 0) * (material.costoUnitario || 0);
  }

  get totalMateriales(): number {
    return this.materiales?.reduce((sum, m) => sum + m.costoTotal, 0) ?? 0;
  }

  // --- Mano de Obra ---

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
    const idx = this.manoObra.findIndex(m => m.id === id);
    if (idx >= 0) this.manoObra.splice(idx, 1);
  }

  calcularCostoTotalManoObra(item: ManoObraCosto): void {
    item.costoTotal = (item.diasTrabajando || 0) * (item.costoPorDia || 0);
  }

  get totalManoObra(): number {
    return this.manoObra?.reduce((sum, m) => sum + m.costoTotal, 0) ?? 0;
  }

  // --- Otros Costos (tablas dinámicas) ---

  agregarTablaExtra(): void {
    if (!this.nuevoNombreTablaExtra.trim()) return;
    const nuevoId = this.tablasCostosExtras.length > 0
      ? Math.max(...this.tablasCostosExtras.map(t => t.id)) + 1
      : 1;
    this.tablasCostosExtras.push({
      id: nuevoId,
      nombre: this.nuevoNombreTablaExtra.trim(),
      items: [],
      expandida: true
    });
    this.nuevoNombreTablaExtra = '';
  }

  eliminarTablaExtra(id: number): void {
    const idx = this.tablasCostosExtras.findIndex(t => t.id === id);
    if (idx >= 0) this.tablasCostosExtras.splice(idx, 1);
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
    const idx = tabla.items.findIndex(i => i.id === itemId);
    if (idx >= 0) tabla.items.splice(idx, 1);
  }

  calcularCostoTotalOtro(item: OtroCosto): void {
    item.costoTotal = (item.cantidad || 0) * (item.costoUnitario || 0);
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
