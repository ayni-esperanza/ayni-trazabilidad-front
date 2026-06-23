import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerComponent } from '../../../../../../shared/components/date-picker/date-picker.component';
import { SelectSearchableComponent } from '../../../../../../shared/components/select-searchable/select-searchable.component';
import {
  ActividadCostoOption,
  MaterialCosto,
  ManoObraCosto,
  OtroCosto,
  TablaCostoExtra
} from '../../modal-proceso-proyecto.component';
import { CostoCatalogoApi, RegistroSolicitudesService } from '../../../../services/registro-solicitudes.service';

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
  imports: [CommonModule, FormsModule, DatePickerComponent, SelectSearchableComponent],
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
  catalogoActivo: 'tipoMaterial' | 'oficioManoObra' | null = null;
  nuevoNombreTablaExtra = '';
  nuevoTipoMaterial = '';
  nuevoOficioManoObra = '';
  opcionesTipoMaterial: string[] = [];
  opcionesOficioManoObra: string[] = [];
  tiposMaterialPersistidos: CostoCatalogoApi[] = [];
  oficiosManoObraPersistidos: CostoCatalogoApi[] = [];
  tipoMaterialEnEdicion: string | null = null;
  nuevoNombreTipoMaterialEdicion = '';
  oficioManoObraEnEdicion: string | null = null;
  nuevoNombreOficioManoObraEdicion = '';

  constructor(private readonly registroSolicitudesService: RegistroSolicitudesService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyectoId']) {
      this.cargarCatalogosProyecto();
    }

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

  normalizarTextoSeleccion(value: string | number | null): string {
    return String(value || '').trim();
  }

  normalizarSeleccionActividad(value: string | number | null): number | null {
    if (value === null || value === undefined || String(value).trim() === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  agregarMaterial(): void {
    const nuevoId = this.materiales.length > 0 ? Math.max(...this.materiales.map((m) => m.id)) + 1 : 1;
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
    const idx = this.materiales.findIndex((m) => m.id === id);
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

    const proyectoId = this.obtenerProyectoIdValido();
    if (!proyectoId) {
      this.registrarTipoMaterialLocal(nombre);
      return;
    }

    this.registroSolicitudesService.crearTipoMaterial(proyectoId, nombre).subscribe({
      next: (tipo) => {
        this.actualizarTiposMaterialPersistidos(tipo, false);
        this.nuevoTipoMaterial = '';
      },
      error: (error) => console.error('Error creando tipo de material:', error)
    });
  }

  abrirCatalogo(tipo: 'tipoMaterial' | 'oficioManoObra'): void {
    this.catalogoActivo = tipo;
  }

  cerrarCatalogo(): void {
    this.cancelarEdicionTipoMaterial();
    this.cancelarEdicionOficioManoObra();
    this.catalogoActivo = null;
  }

  eliminarOpcionTipoMaterial(nombre: string): void {
    if (this.modoSoloLectura || this.estaTipoMaterialEnUso(nombre)) return;

    const tipoPersistido = this.buscarCatalogoPorNombre(this.tiposMaterialPersistidos, nombre);
    if (!tipoPersistido) {
      this.opcionesTipoMaterial = this.opcionesTipoMaterial.filter((item) => item !== nombre);
      return;
    }

    const proyectoId = this.obtenerProyectoIdValido();
    if (!proyectoId) return;

    this.registroSolicitudesService.eliminarTipoMaterial(proyectoId, tipoPersistido.id).subscribe({
      next: () => {
        this.tiposMaterialPersistidos = this.tiposMaterialPersistidos.filter((item) => item.id !== tipoPersistido.id);
        this.sincronizarCatalogosOpciones();
      },
      error: (error) => console.error('Error eliminando tipo de material:', error)
    });
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

    const proyectoId = this.obtenerProyectoIdValido();
    const tipoPersistido = this.buscarCatalogoPorNombre(this.tiposMaterialPersistidos, nombreAnterior);
    if (!proyectoId || !tipoPersistido) {
      this.aplicarCambioTipoMaterial(nombreAnterior, nombreNuevo);
      return;
    }

    this.registroSolicitudesService.actualizarTipoMaterial(proyectoId, tipoPersistido.id, nombreNuevo).subscribe({
      next: (tipo) => {
        this.actualizarTiposMaterialPersistidos(tipo, true, nombreAnterior);
        this.aplicarCambioTipoMaterial(nombreAnterior, tipo.nombre);
      },
      error: (error) => console.error('Error actualizando tipo de material:', error)
    });
  }

  estaTipoMaterialEnUso(nombre: string): boolean {
    return (this.materiales || []).some((item) => (item.tipo || '').trim() === nombre);
  }

  agregarManoObra(): void {
    const nuevoId = this.manoObra.length > 0 ? Math.max(...this.manoObra.map((m) => m.id)) + 1 : 1;
    this.manoObra.push({
      id: nuevoId,
      trabajador: '',
      oficio: '',
      diasTrabajando: null,
      costoPorDia: null,
      costoTotal: 0,
      dependenciaActividadId: null
    });
    this.emitirCambios();
  }

  eliminarManoObra(id: number): void {
    const idx = this.manoObra.findIndex((m) => m.id === id);
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

  get manoObraPorOficio(): ResumenCostoItem[] {
    return this.agruparPorNombre(this.manoObra || [], (item) => item.oficio || 'Sin oficio');
  }

  get actividadOptions(): Array<{ value: number; label: string }> {
    return (this.actividadesDisponibles || []).map((actividad) => ({
      value: actividad.id,
      label: actividad.nombre
    }));
  }

  agregarOpcionOficioManoObra(): void {
    if (this.modoSoloLectura) return;

    const nombre = (this.nuevoOficioManoObra || '').trim();
    if (!nombre) return;

    const proyectoId = this.obtenerProyectoIdValido();
    if (!proyectoId) {
      this.registrarOficioManoObraLocal(nombre);
      return;
    }

    this.registroSolicitudesService.crearOficioManoObra(proyectoId, nombre).subscribe({
      next: (oficio) => {
        this.actualizarOficiosManoObraPersistidos(oficio, false);
        this.nuevoOficioManoObra = '';
      },
      error: (error) => console.error('Error creando oficio:', error)
    });
  }

  eliminarOpcionOficioManoObra(nombre: string): void {
    if (this.modoSoloLectura || this.estaOficioManoObraEnUso(nombre)) return;

    const oficioPersistido = this.buscarCatalogoPorNombre(this.oficiosManoObraPersistidos, nombre);
    if (!oficioPersistido) {
      this.opcionesOficioManoObra = this.opcionesOficioManoObra.filter((item) => item !== nombre);
      return;
    }

    const proyectoId = this.obtenerProyectoIdValido();
    if (!proyectoId) return;

    this.registroSolicitudesService.eliminarOficioManoObra(proyectoId, oficioPersistido.id).subscribe({
      next: () => {
        this.oficiosManoObraPersistidos = this.oficiosManoObraPersistidos.filter((item) => item.id !== oficioPersistido.id);
        this.sincronizarCatalogosOpciones();
      },
      error: (error) => console.error('Error eliminando oficio:', error)
    });
  }

  iniciarEdicionOficioManoObra(nombre: string): void {
    this.oficioManoObraEnEdicion = nombre;
    this.nuevoNombreOficioManoObraEdicion = nombre;
  }

  cancelarEdicionOficioManoObra(): void {
    this.oficioManoObraEnEdicion = null;
    this.nuevoNombreOficioManoObraEdicion = '';
  }

  guardarEdicionOficioManoObra(nombreAnterior: string): void {
    if (this.modoSoloLectura) return;

    const nombreNuevo = (this.nuevoNombreOficioManoObraEdicion || '').trim();
    if (!nombreNuevo || nombreNuevo === nombreAnterior) {
      this.cancelarEdicionOficioManoObra();
      return;
    }

    if (this.opcionesOficioManoObra.some((item) => item !== nombreAnterior && item.toLowerCase() === nombreNuevo.toLowerCase())) {
      return;
    }

    const proyectoId = this.obtenerProyectoIdValido();
    const oficioPersistido = this.buscarCatalogoPorNombre(this.oficiosManoObraPersistidos, nombreAnterior);
    if (!proyectoId || !oficioPersistido) {
      this.aplicarCambioOficioManoObra(nombreAnterior, nombreNuevo);
      return;
    }

    this.registroSolicitudesService.actualizarOficioManoObra(proyectoId, oficioPersistido.id, nombreNuevo).subscribe({
      next: (oficio) => {
        this.actualizarOficiosManoObraPersistidos(oficio, true, nombreAnterior);
        this.aplicarCambioOficioManoObra(nombreAnterior, oficio.nombre);
      },
      error: (error) => console.error('Error actualizando oficio:', error)
    });
  }

  estaOficioManoObraEnUso(nombre: string): boolean {
    return (this.manoObra || []).some((item) => (item.oficio || '').trim() === nombre);
  }

  get tituloCatalogoActivo(): string {
    if (this.catalogoActivo === 'tipoMaterial') return 'Gestionar tipos de materiales';
    if (this.catalogoActivo === 'oficioManoObra') return 'Gestionar oficios de mano de obra';
    return '';
  }

  agregarTablaExtra(): void {
    const nombre = this.nuevoNombreTablaExtra.trim();
    if (!nombre) return;

    this.agregarCategoria.emit(nombre);
    this.nuevoNombreTablaExtra = '';
  }

  eliminarTablaExtra(id: number): void {
    const tabla = this.tablasCostosExtras.find((t) => t.id === id);
    if (!tabla) return;
    this.eliminarCategoria.emit(tabla);
  }

  agregarItemOtroCosto(tabla: TablaCostoExtra): void {
    const nuevoId = tabla.items.length > 0 ? Math.max(...tabla.items.map((i) => i.id)) + 1 : 1;
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
    const idx = tabla.items.findIndex((i) => i.id === itemId);
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
        nombre: (tabla.nombre || '').trim() || 'Sin categoria',
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

  private cargarCatalogosProyecto(): void {
    const proyectoId = this.obtenerProyectoIdValido();
    if (!proyectoId) {
      this.tiposMaterialPersistidos = [];
      this.oficiosManoObraPersistidos = [];
      this.sincronizarCatalogosOpciones();
      return;
    }

    const proyectoSolicitado = proyectoId;

    this.registroSolicitudesService.obtenerTiposMaterial(proyectoId).subscribe({
      next: (tipos) => {
        if (this.obtenerProyectoIdValido() !== proyectoSolicitado) return;
        this.tiposMaterialPersistidos = this.ordenarCatalogos(tipos || []);
        this.sincronizarCatalogosOpciones();
      },
      error: (error) => {
        if (this.obtenerProyectoIdValido() !== proyectoSolicitado) return;
        console.error('Error cargando tipos de material:', error);
        this.tiposMaterialPersistidos = [];
        this.sincronizarCatalogosOpciones();
      }
    });

    this.registroSolicitudesService.obtenerOficiosManoObra(proyectoId).subscribe({
      next: (oficios) => {
        if (this.obtenerProyectoIdValido() !== proyectoSolicitado) return;
        this.oficiosManoObraPersistidos = this.ordenarCatalogos(oficios || []);
        this.sincronizarCatalogosOpciones();
      },
      error: (error) => {
        if (this.obtenerProyectoIdValido() !== proyectoSolicitado) return;
        console.error('Error cargando oficios:', error);
        this.oficiosManoObraPersistidos = [];
        this.sincronizarCatalogosOpciones();
      }
    });
  }

  private sincronizarCatalogosOpciones(): void {
    this.opcionesTipoMaterial = this.normalizarOpciones([
      ...this.tiposMaterialPersistidos.map((item) => item.nombre),
      ...((this.materiales || []).map((item) => item.tipo || ''))
    ]);

    this.opcionesOficioManoObra = this.normalizarOpciones([
      ...this.oficiosManoObraPersistidos.map((item) => item.nombre),
      ...((this.manoObra || []).map((item) => item.oficio || ''))
    ]);
  }

  private registrarTipoMaterialLocal(nombre: string): void {
    this.opcionesTipoMaterial = this.normalizarOpciones([...this.opcionesTipoMaterial, nombre]);
    this.nuevoTipoMaterial = '';
  }

  private registrarOficioManoObraLocal(nombre: string): void {
    this.opcionesOficioManoObra = this.normalizarOpciones([...this.opcionesOficioManoObra, nombre]);
    this.nuevoOficioManoObra = '';
  }

  private aplicarCambioTipoMaterial(nombreAnterior: string, nombreNuevo: string): void {
    this.opcionesTipoMaterial = this.normalizarOpciones(
      this.opcionesTipoMaterial.map((item) => item === nombreAnterior ? nombreNuevo : item)
    );

    for (const material of this.materiales || []) {
      if ((material.tipo || '').trim() === nombreAnterior) {
        material.tipo = nombreNuevo;
      }
    }

    this.emitirCambios();
    this.cancelarEdicionTipoMaterial();
  }

  private aplicarCambioOficioManoObra(nombreAnterior: string, nombreNuevo: string): void {
    this.opcionesOficioManoObra = this.normalizarOpciones(
      this.opcionesOficioManoObra.map((item) => item === nombreAnterior ? nombreNuevo : item)
    );

    for (const item of this.manoObra || []) {
      if ((item.oficio || '').trim() === nombreAnterior) {
        item.oficio = nombreNuevo;
      }
    }

    this.emitirCambios();
    this.cancelarEdicionOficioManoObra();
  }

  private actualizarTiposMaterialPersistidos(tipo: CostoCatalogoApi, limpiarEdicion: boolean, nombreAnterior?: string): void {
    const restantes = this.tiposMaterialPersistidos.filter((item) => item.id !== tipo.id);
    if (nombreAnterior) {
      this.tiposMaterialPersistidos = this.ordenarCatalogos([...restantes, { id: tipo.id, nombre: tipo.nombre }]);
    } else {
      this.tiposMaterialPersistidos = this.ordenarCatalogos([...restantes, tipo]);
    }
    this.sincronizarCatalogosOpciones();
    if (limpiarEdicion) {
      this.cancelarEdicionTipoMaterial();
    } else {
      this.nuevoTipoMaterial = '';
    }
  }

  private actualizarOficiosManoObraPersistidos(oficio: CostoCatalogoApi, limpiarEdicion: boolean, nombreAnterior?: string): void {
    const restantes = this.oficiosManoObraPersistidos.filter((item) => item.id !== oficio.id);
    if (nombreAnterior) {
      this.oficiosManoObraPersistidos = this.ordenarCatalogos([...restantes, { id: oficio.id, nombre: oficio.nombre }]);
    } else {
      this.oficiosManoObraPersistidos = this.ordenarCatalogos([...restantes, oficio]);
    }
    this.sincronizarCatalogosOpciones();
    if (limpiarEdicion) {
      this.cancelarEdicionOficioManoObra();
    } else {
      this.nuevoOficioManoObra = '';
    }
  }

  private buscarCatalogoPorNombre(opciones: CostoCatalogoApi[], nombre: string): CostoCatalogoApi | undefined {
    return (opciones || []).find((item) => item.nombre.trim().toLowerCase() === nombre.trim().toLowerCase());
  }

  private ordenarCatalogos(opciones: CostoCatalogoApi[]): CostoCatalogoApi[] {
    return [...(opciones || [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }

  private obtenerProyectoIdValido(): number | null {
    const proyectoId = Number(this.proyectoId || 0);
    return Number.isFinite(proyectoId) && proyectoId > 0 ? proyectoId : null;
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
