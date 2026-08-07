import { Component, EventEmitter, Inject, Input, OnChanges, OnDestroy, Output, SimpleChanges, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerComponent } from '../../../../../../shared/components/date-picker/date-picker.component';
import { SelectSearchableComponent, SelectSearchableOption } from '../../../../../../shared/components/select-searchable/select-searchable.component';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  ActividadCostoOption,
  MaterialCosto,
  ManoObraCosto,
  OtroCosto,
  TablaCostoExtra
} from '../../modal-proceso-proyecto.component';
import { CostoCatalogoApi, RegistroSolicitudesService } from '../../../../services/registro-solicitudes.service';
import { ConfirmDeleteConfig, ConfirmDeleteModalComponent } from '../../../../../../shared/components/confirm-delete-modal/confirm-delete-modal.component';

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

type TipoImportacionCostos = 'materiales' | 'manoObra' | 'otrosCostos';
type FilaExcel = Record<string, unknown>;

@Component({
  selector: 'app-tab-costos',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent, SelectSearchableComponent, OverlayModule, ConfirmDeleteModalComponent],
  templateUrl: './tab-costos.component.html'
})
export class TabCostosComponent implements OnChanges, OnDestroy {
  @Input() materiales!: MaterialCosto[];
  @Input() manoObra!: ManoObraCosto[];
  @Input() tablasCostosExtras!: TablaCostoExtra[];
  @Input() proyectoInfoForm: ProyectoCostosResumen | null = null;
  @Input() proyectoId: number | null | undefined = null;
  @Input() proyectoFinalizado = false;
  @Input() proyectoCancelado = false;
  @Input() responsableNombre = '';
  @Input() actividadesDisponibles: ActividadCostoOption[] = [];
  @Input() modoSoloLectura = false;
  @Input() subTabInicial: 'resumen' | 'materiales' | 'manoObra' | 'otrosCostos' = 'resumen';
  @Output() costosChange = new EventEmitter<void>();
  @Output() agregarCategoria = new EventEmitter<string>();
  @Output() eliminarCategoria = new EventEmitter<TablaCostoExtra>();

  subTabCostosActiva: 'resumen' | 'materiales' | 'manoObra' | 'otrosCostos' = 'resumen';
  catalogoActivo: 'tipoMaterial' | 'oficioManoObra' | null = null;
  @ViewChild('catalogoTemplate') private catalogoTemplate!: TemplateRef<void>;
  private catalogoOverlayRef: OverlayRef | null = null;
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
  mostrarConfirmacionEliminarCatalogo = false;
  configEliminarCatalogo: ConfirmDeleteConfig = {};
  eliminacionCatalogoPendiente: { tipo: 'tipoMaterial' | 'oficioManoObra'; nombre: string } | null = null;
  mensajeImportacion = '';
  importacionConError = false;

  constructor(
    private readonly registroSolicitudesService: RegistroSolicitudesService,
    @Inject(Overlay) private readonly overlay: Overlay,
    @Inject(ViewContainerRef) private readonly viewContainerRef: ViewContainerRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['subTabInicial']) {
      this.subTabCostosActiva = this.subTabInicial;
    }
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

  onArchivoCostosSeleccionado(tipo: TipoImportacionCostos, event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (archivo) void this.importarCostosDesdeExcel(tipo, archivo);
  }

  descargarFormatoExcel(tipo: TipoImportacionCostos): void {
    void this.generarFormatoExcel(tipo);
  }

  private async generarFormatoExcel(tipo: TipoImportacionCostos): Promise<void> {
    const XLSX = await import('xlsx');
    const configuracion = tipo === 'materiales'
      ? { hoja: 'Materiales', archivo: 'formato-materiales.xlsx', columnas: ['Fecha', 'Nº de comprobante', 'Producto', 'Cantidad', 'Costo unitario', 'Encargado'] }
      : tipo === 'manoObra'
        ? { hoja: 'Mano de Obra', archivo: 'formato-mano-de-obra.xlsx', columnas: ['Trabajador', 'Días trabajando', 'Costo por día'] }
        : { hoja: 'Otros Costos', archivo: 'formato-otros-costos.xlsx', columnas: ['Fecha', 'Categoría', 'Descripción', 'Cantidad', 'Costo unitario', 'Encargado'] };
    const hoja = XLSX.utils.aoa_to_sheet([configuracion.columnas]);
    hoja['!cols'] = configuracion.columnas.map((columna) => ({ wch: Math.max(columna.length + 3, 16) }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, configuracion.hoja);
    XLSX.writeFile(libro, configuracion.archivo);
  }
  get totalMateriales(): number {
    return this.materiales?.reduce((sum, m) => sum + (Number(m.costoTotal) || 0), 0) ?? 0;
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

    if (this.catalogoOverlayRef) return;

    this.catalogoOverlayRef = this.overlay.create({
      width: '100%',
      height: '100%',
      positionStrategy: this.overlay.position().global().top('0').left('0'),
      scrollStrategy: this.overlay.scrollStrategies.block(),
      disposeOnNavigation: true,
    });
    this.catalogoOverlayRef.attach(new TemplatePortal(this.catalogoTemplate, this.viewContainerRef));
  }

  cerrarCatalogo(): void {
    this.cancelarEdicionTipoMaterial();
    this.cancelarEdicionOficioManoObra();
    this.catalogoActivo = null;
    this.catalogoOverlayRef?.dispose();
    this.catalogoOverlayRef = null;
  }

  ngOnDestroy(): void {
    this.catalogoOverlayRef?.dispose();
    this.catalogoOverlayRef = null;
  }

  solicitarEliminarOpcionCatalogo(tipo: 'tipoMaterial' | 'oficioManoObra', nombre: string): void {
    const enUso = tipo === 'tipoMaterial'
      ? this.estaTipoMaterialEnUso(nombre)
      : this.estaOficioManoObraEnUso(nombre);
    if (this.modoSoloLectura) return;

    this.eliminacionCatalogoPendiente = { tipo, nombre };
    this.configEliminarCatalogo = {
      titulo: tipo === 'tipoMaterial' ? 'Eliminar tipo de material' : 'Eliminar oficio',
      mensaje: enUso
        ? `Se quitara "${nombre}" de las opciones nuevas. Los registros existentes conservaran este valor.`
        : `Estas seguro que deseas eliminar "${nombre}"?`,
      textoConfirmar: 'Eliminar',
      ocultarAdvertencia: enUso
    };
    this.mostrarConfirmacionEliminarCatalogo = true;
  }

  confirmarEliminarOpcionCatalogo(): void {
    const pendiente = this.eliminacionCatalogoPendiente;
    this.mostrarConfirmacionEliminarCatalogo = false;
    this.eliminacionCatalogoPendiente = null;
    if (!pendiente) return;

    if (pendiente.tipo === 'tipoMaterial') {
      this.eliminarOpcionTipoMaterial(pendiente.nombre);
    } else {
      this.eliminarOpcionOficioManoObra(pendiente.nombre);
    }
  }

  cancelarEliminarOpcionCatalogo(): void {
    this.mostrarConfirmacionEliminarCatalogo = false;
    this.eliminacionCatalogoPendiente = null;
  }

  eliminarOpcionTipoMaterial(nombre: string): void {
    if (this.modoSoloLectura) return;

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
    return this.manoObra?.reduce((sum, m) => sum + (Number(m.costoTotal) || 0), 0) ?? 0;
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

  opcionesTipoMaterialPara(material: MaterialCosto): SelectSearchableOption[] {
    return this.incluirValorHistorico(this.opcionesGestionTipoMaterial, material.tipo);
  }

  opcionesOficioManoObraPara(item: ManoObraCosto): SelectSearchableOption[] {
    return this.incluirValorHistorico(this.opcionesGestionOficioManoObra, item.oficio);
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
    if (this.modoSoloLectura) return;

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
    return tabla.items.reduce((sum, i) => sum + (Number(i.costoTotal) || 0), 0);
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

  get esProyectoCerrado(): boolean {
    return this.proyectoFinalizado || this.proyectoCancelado;
  }

  trackResumenItem(_: number, item: ResumenCostoItem): string {
    return item.nombre;
  }

  trackOpcion(_: number, item: string): string {
    return item;
  }

  private async importarCostosDesdeExcel(tipo: TipoImportacionCostos, archivo: File): Promise<void> {
    if (this.modoSoloLectura) return;
    this.mensajeImportacion = '';
    this.importacionConError = false;
    if (!/\.(xlsx|xls)$/i.test(archivo.name)) return this.mostrarResultadoImportacion('Selecciona un archivo de Excel (.xlsx o .xls).', true);

    try {
      const XLSX = await import('xlsx');
      const libro = XLSX.read(await archivo.arrayBuffer(), { type: 'array', cellDates: true });
      const nombreHoja = libro.SheetNames[0];
      if (!nombreHoja) return this.mostrarResultadoImportacion('El archivo de Excel no contiene hojas para importar.', true);
      const filas = XLSX.utils.sheet_to_json<FilaExcel>(libro.Sheets[nombreHoja], { defval: '', raw: true });
      if (!filas.length) return this.mostrarResultadoImportacion('La primera hoja del Excel no contiene registros.', true);

      const encabezados = new Set(Object.keys(filas[0]).map((encabezado) => this.normalizarEncabezado(encabezado)));
      const faltantes = this.encabezadosRequeridos(tipo).filter((encabezado) => !encabezados.has(encabezado));
      if (faltantes.length) return this.mostrarResultadoImportacion(`El Excel no tiene las columnas requeridas: ${faltantes.join(', ')}.`, true);

      const importados = tipo === 'materiales' ? this.importarMateriales(filas) : tipo === 'manoObra' ? this.importarManoObra(filas) : this.importarOtrosCostos(filas);
      if (!importados) return this.mostrarResultadoImportacion('No se encontraron filas con datos para importar.', true);
      this.emitirCambios();
      this.mostrarResultadoImportacion(`${importados} registro(s) importado(s) correctamente desde ${archivo.name}.`);
    } catch (error) {
      console.error('Error importando costos desde Excel:', error);
      this.mostrarResultadoImportacion('No se pudo leer el archivo. Verifica que sea un Excel v?lido.', true);
    }
  }

  private importarMateriales(filas: FilaExcel[]): number {
    const nuevos = filas.filter((fila) => !this.filaVacia(fila)).map((fila, indice) => {
      const cantidad = this.numeroExcel(this.celda(fila, ['cantidad']));
      const costoUnitario = this.numeroExcel(this.celda(fila, ['costo unitario', 'costo unit', 'precio unitario']));
      return { id: this.siguienteId(this.materiales, indice), fecha: this.fechaExcel(this.celda(fila, ['fecha'])) || this.formatDate(new Date()), nroComprobante: this.texto(this.celda(fila, ['n de comprobante', 'nro comprobante', 'numero comprobante', 'comprobante'])), tipo: '', producto: this.texto(this.celda(fila, ['producto'])), cantidad, costoUnitario, costoTotal: (cantidad || 0) * (costoUnitario || 0), encargado: this.texto(this.celda(fila, ['encargado'])), dependenciaActividadId: null } satisfies MaterialCosto;
    });
    this.materiales.push(...nuevos);
    return nuevos.length;
  }

  private importarManoObra(filas: FilaExcel[]): number {
    const nuevos = filas.filter((fila) => !this.filaVacia(fila)).map((fila, indice) => {
      const diasTrabajando = this.numeroExcel(this.celda(fila, ['dias trabajando', 'dias trabajados', 'dias']));
      const costoPorDia = this.numeroExcel(this.celda(fila, ['costo por dia', 'costo dia']));
      return { id: this.siguienteId(this.manoObra, indice), trabajador: this.texto(this.celda(fila, ['trabajador'])), oficio: '', diasTrabajando, costoPorDia, costoTotal: (diasTrabajando || 0) * (costoPorDia || 0), dependenciaActividadId: null } satisfies ManoObraCosto;
    });
    this.manoObra.push(...nuevos);
    return nuevos.length;
  }

  private importarOtrosCostos(filas: FilaExcel[]): number {
    let importados = 0;
    for (const fila of filas.filter((item) => !this.filaVacia(item))) {
      const categoria = this.texto(this.celda(fila, ['categoria'])) || 'OTROS';
      let tabla = this.tablasCostosExtras.find((item) => item.nombre.trim().toLowerCase() === categoria.toLowerCase());
      if (!tabla) {
        tabla = { id: this.siguienteId(this.tablasCostosExtras), nombre: categoria, items: [], expandida: true };
        this.tablasCostosExtras.push(tabla);
      }
      const cantidad = this.numeroExcel(this.celda(fila, ['cantidad']));
      const costoUnitario = this.numeroExcel(this.celda(fila, ['costo unitario', 'costo unit', 'precio unitario']));
      tabla.items.push({ id: this.siguienteId(tabla.items), fecha: this.fechaExcel(this.celda(fila, ['fecha'])) || this.formatDate(new Date()), descripcion: this.texto(this.celda(fila, ['descripcion'])), cantidad, costoUnitario, costoTotal: (cantidad || 0) * (costoUnitario || 0), encargado: this.texto(this.celda(fila, ['encargado'])), dependenciaActividadId: null });
      importados++;
    }
    return importados;
  }

  private encabezadosRequeridos(tipo: TipoImportacionCostos): string[] {
    if (tipo === 'materiales') return ['fecha', 'n de comprobante', 'producto', 'cantidad', 'costo unitario', 'encargado'];
    if (tipo === 'manoObra') return ['trabajador', 'dias trabajando', 'costo por dia'];
    return ['fecha', 'categoria', 'descripcion', 'cantidad', 'costo unitario', 'encargado'];
  }

  private celda(fila: FilaExcel, aliases: string[]): unknown {
    for (const alias of aliases) {
      const encontrada = Object.entries(fila).find(([encabezado]) => this.normalizarEncabezado(encabezado) === alias);
      if (encontrada) return encontrada[1];
    }
    return '';
  }

  private normalizarEncabezado(valor: string): string { return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  private texto(valor: unknown): string { return String(valor ?? '').trim(); }
  private numeroExcel(valor: unknown): number | null {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
    const texto = this.texto(valor).replace(/\s/g, '');
    if (!texto) return null;
    const normalizado = texto.includes(',') && texto.includes('.') ? texto.replace(/\./g, '').replace(',', '.') : texto.replace(',', '.');
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : null;
  }
  private fechaExcel(valor: unknown): string {
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) return this.formatDate(valor);
    if (typeof valor === 'number') return this.formatDate(new Date(Date.UTC(1899, 11, 30) + valor * 86400000));
    const texto = this.texto(valor);
    const iso = texto.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    const latina = texto.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
    if (latina) return `${latina[3]}-${latina[2].padStart(2, '0')}-${latina[1].padStart(2, '0')}`;
    return '';
  }
  private filaVacia(fila: FilaExcel): boolean { return Object.values(fila).every((valor) => !this.texto(valor)); }
  private siguienteId(items: Array<{ id: number }>, desplazamiento = 0): number { return items.reduce((mayor, item) => Math.max(mayor, Number(item.id) || 0), 0) + 1 + desplazamiento; }
  private mostrarResultadoImportacion(mensaje: string, esError = false): void { this.mensajeImportacion = mensaje; this.importacionConError = esError; }

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
    this.opcionesTipoMaterial = this.normalizarOpciones([
      ...this.opcionesTipoMaterial.map((item) => item === nombreAnterior ? nombreNuevo : item),
      ...((this.materiales || []).map((item) => item.tipo || ''))
    ]);
    this.cancelarEdicionTipoMaterial();
  }

  private aplicarCambioOficioManoObra(nombreAnterior: string, nombreNuevo: string): void {
    this.opcionesOficioManoObra = this.normalizarOpciones([
      ...this.opcionesOficioManoObra.map((item) => item === nombreAnterior ? nombreNuevo : item),
      ...((this.manoObra || []).map((item) => item.oficio || ''))
    ]);
    this.cancelarEdicionOficioManoObra();
  }

  get opcionesGestionTipoMaterial(): string[] {
    return this.obtenerProyectoIdValido()
      ? this.tiposMaterialPersistidos.map((item) => item.nombre)
      : this.opcionesTipoMaterial;
  }

  get opcionesGestionOficioManoObra(): string[] {
    return this.obtenerProyectoIdValido()
      ? this.oficiosManoObraPersistidos.map((item) => item.nombre)
      : this.opcionesOficioManoObra;
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

  private incluirValorHistorico(opcionesActivas: string[], valorActual?: string): SelectSearchableOption[] {
    const valor = (valorActual || '').trim();
    if (!valor || opcionesActivas.some((item) => item.toLowerCase() === valor.toLowerCase())) {
      return opcionesActivas;
    }

    return [
      { value: valor, label: valor },
      ...opcionesActivas
    ];
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
