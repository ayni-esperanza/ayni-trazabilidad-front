import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
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
export class TabCostosComponent implements OnChanges {
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
  catalogoActivo: 'tipoMaterial' | 'cargoManoObra' | null = null;
  nuevoNombreTablaExtra = '';
  nuevoTipoMaterial = '';
  nuevoCargoManoObra = '';
  opcionesTipoMaterial: string[] = [];
  opcionesCargoManoObra: string[] = [];
  tipoMaterialEnEdicion: string | null = null;
  nuevoNombreTipoMaterialEdicion = '';
  cargoManoObraEnEdicion: string | null = null;
  nuevoNombreCargoManoObraEdicion = '';

  private readonly tiposMaterialStorageKey = 'ayni:registro-solicitudes:costos:tipos-material';
  private readonly cargosManoObraStorageKey = 'ayni:registro-solicitudes:costos:cargos-mano-obra';
  private opcionesCatalogoInicializadas = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['materiales'] || changes['manoObra']) {
      this.sincronizarCatalogosOpciones();
    }
  }

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
      tipo: this.opcionesTipoMaterial[0] || '',
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

  agregarOpcionTipoMaterial(): void {
    if (this.modoSoloLectura) return;

    const nombre = (this.nuevoTipoMaterial || '').trim();
    if (!nombre) return;

    this.opcionesTipoMaterial = this.normalizarOpciones([...this.opcionesTipoMaterial, nombre]);
    this.nuevoTipoMaterial = '';
    this.guardarOpcionesCatalogo();
  }

  abrirCatalogo(tipo: 'tipoMaterial' | 'cargoManoObra'): void {
    this.catalogoActivo = tipo;
  }

  cerrarCatalogo(): void {
    this.cancelarEdicionTipoMaterial();
    this.cancelarEdicionCargoManoObra();
    this.catalogoActivo = null;
  }

  eliminarOpcionTipoMaterial(nombre: string): void {
    if (this.modoSoloLectura || this.estaTipoMaterialEnUso(nombre)) return;

    this.opcionesTipoMaterial = this.opcionesTipoMaterial.filter((item) => item !== nombre);
    this.guardarOpcionesCatalogo();
  }

  iniciarEdicionTipoMaterial(nombre: string): void {
    this.tipoMaterialEnEdicion = nombre;
    this.nuevoNombreTipoMaterialEdicion = nombre;
  }

  cancelarEdicionTipoMaterial(): void {
    this.tipoMaterialEnEdicion = null;
    this.nuevoNombreTipoMaterialEdicion = '';
  }

  guardarEdicionTipoMaterial(nombreAnterior: string): void {
    if (this.modoSoloLectura) return;

    const nombreNuevo = (this.nuevoNombreTipoMaterialEdicion || '').trim();
    if (!nombreNuevo || nombreNuevo === nombreAnterior) {
      this.cancelarEdicionTipoMaterial();
      return;
    }

    if (this.opcionesTipoMaterial.some((item) => item !== nombreAnterior && item.toLowerCase() === nombreNuevo.toLowerCase())) {
      return;
    }

    this.opcionesTipoMaterial = this.normalizarOpciones(
      this.opcionesTipoMaterial.map((item) => item === nombreAnterior ? nombreNuevo : item)
    );

    for (const material of this.materiales || []) {
      if ((material.tipo || '').trim() === nombreAnterior) {
        material.tipo = nombreNuevo;
      }
    }

    this.guardarOpcionesCatalogo();
    this.emitirCambios();
    this.cancelarEdicionTipoMaterial();
  }

  estaTipoMaterialEnUso(nombre: string): boolean {
    return (this.materiales || []).some((item) => (item.tipo || '').trim() === nombre);
  }

  agregarManoObra(): void {
    const nuevoId = this.manoObra.length > 0 ? Math.max(...this.manoObra.map(m => m.id)) + 1 : 1;
    this.manoObra.push({
      id: nuevoId,
      trabajador: '',
      cargo: this.opcionesCargoManoObra[0] || '',
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

  agregarOpcionCargoManoObra(): void {
    if (this.modoSoloLectura) return;

    const nombre = (this.nuevoCargoManoObra || '').trim();
    if (!nombre) return;

    this.opcionesCargoManoObra = this.normalizarOpciones([...this.opcionesCargoManoObra, nombre]);
    this.nuevoCargoManoObra = '';
    this.guardarOpcionesCatalogo();
  }

  eliminarOpcionCargoManoObra(nombre: string): void {
    if (this.modoSoloLectura || this.estaCargoManoObraEnUso(nombre)) return;

    this.opcionesCargoManoObra = this.opcionesCargoManoObra.filter((item) => item !== nombre);
    this.guardarOpcionesCatalogo();
  }

  iniciarEdicionCargoManoObra(nombre: string): void {
    this.cargoManoObraEnEdicion = nombre;
    this.nuevoNombreCargoManoObraEdicion = nombre;
  }

  cancelarEdicionCargoManoObra(): void {
    this.cargoManoObraEnEdicion = null;
    this.nuevoNombreCargoManoObraEdicion = '';
  }

  guardarEdicionCargoManoObra(nombreAnterior: string): void {
    if (this.modoSoloLectura) return;

    const nombreNuevo = (this.nuevoNombreCargoManoObraEdicion || '').trim();
    if (!nombreNuevo || nombreNuevo === nombreAnterior) {
      this.cancelarEdicionCargoManoObra();
      return;
    }

    if (this.opcionesCargoManoObra.some((item) => item !== nombreAnterior && item.toLowerCase() === nombreNuevo.toLowerCase())) {
      return;
    }

    this.opcionesCargoManoObra = this.normalizarOpciones(
      this.opcionesCargoManoObra.map((item) => item === nombreAnterior ? nombreNuevo : item)
    );

    for (const item of this.manoObra || []) {
      if ((item.cargo || '').trim() === nombreAnterior) {
        item.cargo = nombreNuevo;
      }
    }

    this.guardarOpcionesCatalogo();
    this.emitirCambios();
    this.cancelarEdicionCargoManoObra();
  }

  estaCargoManoObraEnUso(nombre: string): boolean {
    return (this.manoObra || []).some((item) => (item.cargo || '').trim() === nombre);
  }

  get tituloCatalogoActivo(): string {
    if (this.catalogoActivo === 'tipoMaterial') return 'Gestionar tipos de materiales';
    if (this.catalogoActivo === 'cargoManoObra') return 'Gestionar cargos de mano de obra';
    return '';
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

  trackOpcion(_: number, item: string): string {
    return item;
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

  private sincronizarCatalogosOpciones(): void {
    this.asegurarCatalogosOpciones();

    this.opcionesTipoMaterial = this.normalizarOpciones([
      ...this.opcionesTipoMaterial,
      ...((this.materiales || []).map((item) => item.tipo || ''))
    ]);

    this.opcionesCargoManoObra = this.normalizarOpciones([
      ...this.opcionesCargoManoObra,
      ...((this.manoObra || []).map((item) => item.cargo || ''))
    ]);

    this.guardarOpcionesCatalogo();
  }

  private asegurarCatalogosOpciones(): void {
    if (this.opcionesCatalogoInicializadas) return;

    this.opcionesTipoMaterial = this.leerOpcionesStorage(this.tiposMaterialStorageKey);
    this.opcionesCargoManoObra = this.leerOpcionesStorage(this.cargosManoObraStorageKey);
    this.opcionesCatalogoInicializadas = true;
  }

  private guardarOpcionesCatalogo(): void {
    this.escribirOpcionesStorage(this.tiposMaterialStorageKey, this.opcionesTipoMaterial);
    this.escribirOpcionesStorage(this.cargosManoObraStorageKey, this.opcionesCargoManoObra);
  }

  private leerOpcionesStorage(clave: string): string[] {
    if (typeof window === 'undefined') return [];

    try {
      const contenido = window.localStorage.getItem(clave);
      if (!contenido) return [];
      return this.normalizarOpciones(JSON.parse(contenido));
    } catch {
      return [];
    }
  }

  private escribirOpcionesStorage(clave: string, opciones: string[]): void {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(clave, JSON.stringify(this.normalizarOpciones(opciones)));
    } catch {
      // Ignoramos errores de storage para no bloquear la edicion local.
    }
  }

  private normalizarOpciones(opciones: unknown): string[] {
    if (!Array.isArray(opciones)) return [];

    return Array.from(
      new Set(
        opciones
          .map((item) => String(item || '').trim())
          .filter((item) => !!item)
      )
    ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
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
