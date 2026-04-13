import { Component, Input, Output, EventEmitter, AfterViewInit, OnChanges, OnDestroy, SimpleChanges, ViewChild, ElementRef, Inject, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { Proyecto, Responsable, FlujoNodo, EstadoTarea, ComentarioAdicionalActividad, FlujoAdjunto, OrdenCompra } from '../../../../models/solicitud.model';
import { AuthService } from '../../../../../../core/services/auth.service';
import { ComentarioActividadPayloadApi, RegistroSolicitudesService } from '../../../../services/registro-solicitudes.service';
import { PaginacionComponent } from '../../../../../../shared/components/paginacion/paginacion.component';
import type { CambioPaginaEvent, PaginacionConfig } from '../../../../../../shared/components/paginacion/paginacion.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-tab-proceso',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './tab-proceso.component.html'
})
export class TabProcesoComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly registroSolicitudesService = inject(RegistroSolicitudesService);
  @Input() proyecto: Proyecto | null = null;
  @Input() responsables: Responsable[] = [];
  @Input() proyectoFinalizado = false;
  @Input() proyectoCancelado = false;
  @Input() actividadModalAbierta = false;
  @Input() flujoNodos: FlujoNodo[] = [];
  @Input() ordenesCompra: OrdenCompra[] = [];
  @Input() comentariosAdicionalesActividad: ComentarioAdicionalActividad[] = [];
  @Input() costosMateriales: Array<{ dependenciaActividadId?: number | null; costoTotal: number }> = [];
  @Input() costosManoObra: Array<{ dependenciaActividadId?: number | null; costoTotal: number }> = [];
  @Input() costosOtros: Array<{ dependenciaActividadId?: number | null; costoTotal: number }> = [];

  @Output() abrirNodoEvt = new EventEmitter<FlujoNodo>();
  @Output() crearActividadDesdeBpmnEvt = new EventEmitter<{ nombre: string; nodoOrigenId?: number }>();
  @Output() flujoActualizadoEvt = new EventEmitter<FlujoNodo[]>();
  @Output() comentariosAdicionalesActividadChange = new EventEmitter<ComentarioAdicionalActividad[]>();
  @Output() bloqueoEdicionActividadesChange = new EventEmitter<boolean>();

  vistaFlujo: 'timeline' | 'tabla' = 'tabla';
  ordenRecientePrimero = true;
  paginacionTablaFlujo: PaginacionConfig = {
    paginaActual: 0,
    porPagina: 20,
    totalElementos: 0,
    totalPaginas: 0
  };
  readonly opcionesPorPaginaTablaFlujo = [20, 50, 100, 200];
  readonly estadosActividad: EstadoTarea[] = ['Pendiente', 'En Proceso', 'Completado', 'Cancelado', 'Retrasado'];
  readonly acceptTiposArchivo = '.xlsx,.xls,.pdf,.docx,.doc,.pptx,.ppt,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif,.zip,.rar';
  private readonly maxImagenBytes = 5 * 1024 * 1024;
  private readonly maxDocumentoBytes = 25 * 1024 * 1024;
  private readonly tiposPermitidos = new Set([
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.rar',
    'application/x-rar-compressed',
    'application/octet-stream',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif'
  ]);
  private readonly extensionesPermitidas = new Set([
    'xlsx', 'xls', 'pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'zip', 'rar'
  ]);
  erroresAdjuntosComentario: Record<number, string> = {};
  // Compatibilidad defensiva para plantillas previas en hot-reload.
  readonly alertasActividades: unknown[] = [];

  mostrarVistaPreviaAdjunto = false;
  adjuntoVistaPreviaNombre = '';
  fuenteVistaPreviaAdjunto = '';
  htmlVistaPreviaAdjunto: SafeHtml | null = null;
  cargandoVistaPreviaAdjunto = false;
  private fuenteVistaPreviaAdjuntoEsBlob = false;
  private adjuntoVistaPreviaEsPdf = false;
  private adjuntoVistaPreviaEsOffice = false;

  @ViewChild('bpmnCanvas', { static: false }) bpmnCanvas?: ElementRef<HTMLDivElement>;

  private bpmnModeler: any;
  private isBrowser = false;
  private isImportandoXml = false;
  private sincronizacionPendiente: ReturnType<typeof setTimeout> | null = null;
  private ultimoSnapshotFlujo = '';
  private tareasExternasPendientes = new Set<string>();
  private readonly comentariosEnEdicion = new Set<number>();
  private readonly comentarioEdicionBackup = new Map<number, ComentarioAdicionalActividad>();
  private readonly estadoDropdownAbierto: Record<number, boolean> = {};

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private readonly sanitizer: DomSanitizer
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser || !this.bpmnCanvas) return;
    const { default: BpmnJS } = await import('bpmn-js/lib/Modeler');
    this.bpmnModeler = new BpmnJS({
      container: this.bpmnCanvas.nativeElement
    });
    this.registrarEventosBpmn();
    await this.renderBpmn();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['flujoNodos'] || changes['ordenesCompra']) {
      this.actualizarPaginacionTablaFlujo();
    }

    if (!this.bpmnModeler) return;
    if (changes['flujoNodos']) {
      await this.renderBpmn();
    }
  }

  ngOnDestroy(): void {
    this.cerrarVistaPreviaAdjunto();

    if (this.sincronizacionPendiente) {
      clearTimeout(this.sincronizacionPendiente);
      this.sincronizacionPendiente = null;
    }
    if (this.bpmnModeler) {
      this.bpmnModeler.destroy();
      this.bpmnModeler = null;
    }
  }

  getResponsableNombre(responsableId: number): string {
    const resp = this.responsables.find(r => r.id === responsableId);
    return resp?.nombre || 'Sin asignar';
  }

  getSiguientesNombres(nodo: FlujoNodo): string {
    const siguientesIds = Array.isArray(nodo.siguientesIds) ? nodo.siguientesIds : [];
    if (!siguientesIds.length) return 'Sin conexiones';
    const nombres = siguientesIds
      .map(id => this.flujoNodos.find(n => n.id === id)?.nombre)
      .filter((nombre): nombre is string => !!nombre);
    return nombres.length ? nombres.join(', ') : 'Sin conexiones';
  }

  puedeAbrirNodo(nodo: FlujoNodo): boolean {
    return nodo.tipo === 'tarea'
      && !this.esNodoOrdenCompra(nodo)
      && !this.proyectoCancelado
      && !this.actividadModalAbierta;
  }

  abrirNodo(nodo: FlujoNodo): void {
    if (!this.puedeAbrirNodo(nodo)) return;
    this.abrirNodoEvt.emit(nodo);
  }

  cambiarVistaFlujo(vista: 'timeline' | 'tabla'): void {
    this.vistaFlujo = vista;
    if (vista === 'tabla') {
      this.actualizarPaginacionTablaFlujo();
    }
  }

  alternarOrdenFlujo(): void {
    this.ordenRecientePrimero = !this.ordenRecientePrimero;
    if (this.vistaFlujo === 'tabla') {
      this.actualizarPaginacionTablaFlujo();
    }
  }

  get flujoTablaPaginada(): FlujoNodo[] {
    const nodos = this.flujoTimeline;
    const totalPaginas = Math.ceil(nodos.length / this.paginacionTablaFlujo.porPagina);
    const paginaMaxima = Math.max(totalPaginas - 1, 0);

    if (this.paginacionTablaFlujo.paginaActual > paginaMaxima) {
      this.paginacionTablaFlujo = {
        ...this.paginacionTablaFlujo,
        paginaActual: paginaMaxima
      };
    }

    const inicio = this.paginacionTablaFlujo.paginaActual * this.paginacionTablaFlujo.porPagina;
    const fin = inicio + this.paginacionTablaFlujo.porPagina;
    return nodos.slice(inicio, fin);
  }

  onCambioPaginaTablaFlujo(event: CambioPaginaEvent): void {
    this.paginacionTablaFlujo = {
      ...this.paginacionTablaFlujo,
      paginaActual: event.pagina,
      porPagina: event.porPagina
    };
    this.actualizarPaginacionTablaFlujo();
  }

  onCambioTamanoTablaFlujo(nuevoTamano: number): void {
    this.paginacionTablaFlujo = {
      ...this.paginacionTablaFlujo,
      porPagina: nuevoTamano,
      paginaActual: 0
    };
    this.actualizarPaginacionTablaFlujo();
  }

  private actualizarPaginacionTablaFlujo(): void {
    const totalElementos = this.flujoTimeline.length;
    const totalPaginas = Math.ceil(totalElementos / this.paginacionTablaFlujo.porPagina);
    const paginaActual = Math.min(this.paginacionTablaFlujo.paginaActual, Math.max(totalPaginas - 1, 0));

    this.paginacionTablaFlujo = {
      ...this.paginacionTablaFlujo,
      totalElementos,
      totalPaginas,
      paginaActual
    };
  }

  getEstadoActividad(nodo: FlujoNodo): EstadoTarea {
    if (this.esNodoOrdenCompra(nodo)) return 'Completado';
    return nodo.estadoActividad || 'Pendiente';
  }

  get totalActividadesFlujo(): number {
    const timeline = this.flujoTimeline;
    return Array.isArray(timeline) ? timeline.length : 0;
  }

  onCambiarEstadoActividad(nodo: FlujoNodo, cambio: EstadoTarea | Event): void {
    if (nodo.tipo !== 'tarea' || this.esNodoOrdenCompra(nodo) || this.proyectoCancelado) return;

    const nuevoEstado = typeof cambio === 'string'
      ? cambio
      : ((cambio.target as HTMLSelectElement | null)?.value as EstadoTarea);
    if (!this.estadosActividad.includes(nuevoEstado)) return;

    const estadoActual = this.getEstadoActividad(nodo);
    if (estadoActual === nuevoEstado && nodo.fechaCambioEstado) return;

    const fechaCambioEstado = this.formatearFechaIsoLocal(new Date());
    const indiceObjetivo = this.obtenerIndiceNodoObjetivo(nodo);
    if (indiceObjetivo < 0) return;

    nodo.estadoActividad = nuevoEstado;
    nodo.fechaCambioEstado = fechaCambioEstado;

    const flujoActualizado = this.flujoNodos.map((item, index) =>
      index === indiceObjetivo
        ? { ...item, estadoActividad: nuevoEstado, fechaCambioEstado }
        : item
    );

    this.flujoActualizadoEvt.emit(flujoActualizado);
  }

  private obtenerIndiceNodoObjetivo(nodo: FlujoNodo): number {
    const porReferencia = this.flujoNodos.findIndex(item => item === nodo);
    if (porReferencia >= 0) return porReferencia;

    return this.flujoNodos.findIndex(item => item.id === nodo.id && item.tipo === nodo.tipo);
  }

  getClaseEstadoActividad(estado: EstadoTarea): string {
    const clases: Record<EstadoTarea, string> = {
      Pendiente: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
      'En Proceso': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      Completado: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      Cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      Retrasado: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    };
    return clases[estado];
  }

  getClaseAlerta(): string {
    return '';
  }

  onEstadoDropdownOpen(nodoId: number): void {
    this.estadoDropdownAbierto[nodoId] = true;
  }

  onEstadoDropdownClose(nodoId: number): void {
    this.estadoDropdownAbierto[nodoId] = false;
  }

  isEstadoDropdownAbierto(nodoId: number): boolean {
    return !!this.estadoDropdownAbierto[nodoId];
  }

  getCostoDependenciaActividad(nodoId: number): number {
    return this.obtenerCostoPorDependencia(this.costosMateriales, nodoId)
      + this.obtenerCostoPorDependencia(this.costosManoObra, nodoId)
      + this.obtenerCostoPorDependencia(this.costosOtros, nodoId);
  }

  private obtenerCostoPorDependencia(
    items: Array<{ dependenciaActividadId?: number | null; costoTotal: number }>,
    nodoId: number
  ): number {
    return items.reduce((total, item) => {
      const dependenciaId = this.normalizarDependenciaId(item.dependenciaActividadId);
      if (dependenciaId !== nodoId) return total;
      return total + (Number(item.costoTotal) || 0);
    }, 0);
  }

  private normalizarDependenciaId(valor: number | string | null | undefined): number | null {
    if (valor === null || valor === undefined || valor === '') return null;
    const id = Number(valor);
    return Number.isFinite(id) ? id : null;
  }

  formatearDescripcionDetalle(descripcion?: string): string {
    if (!descripcion?.trim()) {
      return '<em>Sin descripcion</em>';
    }

    const decodificada = this.decodificarEntidades(descripcion).replace(/&nbsp;/g, ' ').trim();
    return decodificada || '<em>Sin descripcion</em>';
  }

  puedeAccionarAdjunto(adjunto: { archivo?: File; dataUrl?: string }): boolean {
    return !!adjunto.archivo || !!adjunto.dataUrl;
  }

  puedeVistaPreviaAdjunto(adjunto: { nombre?: string; tipo?: string; archivo?: File; dataUrl?: string }): boolean {
    if (!this.puedeAccionarAdjunto(adjunto)) return false;

    if (this.esAdjuntoOffice(adjunto)) return true;

    const tipo = (adjunto.tipo || adjunto.archivo?.type || '').toLowerCase();
    if (tipo.startsWith('image/') || tipo === 'application/pdf') return true;
    const nombre = (adjunto.nombre || adjunto.archivo?.name || '').toLowerCase();
    return nombre.endsWith('.pdf') || nombre.endsWith('.png') || nombre.endsWith('.jpg') || nombre.endsWith('.jpeg') || nombre.endsWith('.webp') || nombre.endsWith('.gif');
  }

  async verAdjunto(adjunto: { nombre?: string; tipo?: string; archivo?: File; dataUrl?: string }): Promise<void> {
    if (!this.puedeVistaPreviaAdjunto(adjunto)) return;

    this.cerrarVistaPreviaAdjunto();
    this.htmlVistaPreviaAdjunto = null;
    this.cargandoVistaPreviaAdjunto = false;

    if (this.esAdjuntoOffice(adjunto)) {
      this.adjuntoVistaPreviaNombre = adjunto.nombre || 'Documento adjunto';
      this.adjuntoVistaPreviaEsOffice = true;
      this.mostrarVistaPreviaAdjunto = true;
      this.cargandoVistaPreviaAdjunto = true;

      try {
        const blob = this.obtenerBlobAdjunto(adjunto);
        if (!blob) {
          this.htmlVistaPreviaAdjunto = this.sanitizer.bypassSecurityTrustHtml(this.generarMensajePreviewHtml('No se pudo cargar el documento para vista previa.'));
          return;
        }

        const html = this.esAdjuntoExcel(adjunto)
          ? await this.generarVistaPreviaExcel(blob)
          : await this.generarVistaPreviaWord(blob, adjunto.nombre);

        this.htmlVistaPreviaAdjunto = this.sanitizer.bypassSecurityTrustHtml(html);
      } catch (error) {
        console.error('Error generando vista previa Office:', error);
        this.htmlVistaPreviaAdjunto = this.sanitizer.bypassSecurityTrustHtml(this.generarMensajePreviewHtml('No se pudo generar la vista previa del archivo.'));
      } finally {
        this.cargandoVistaPreviaAdjunto = false;
      }
      return;
    }

    const url = this.obtenerUrlAdjunto(adjunto);
    if (!url) return;

    this.fuenteVistaPreviaAdjunto = url;
    this.fuenteVistaPreviaAdjuntoEsBlob = !!adjunto.archivo && !adjunto.dataUrl;
    this.adjuntoVistaPreviaEsPdf = this.esAdjuntoPdf(adjunto);
    this.adjuntoVistaPreviaEsOffice = false;
    this.adjuntoVistaPreviaNombre = adjunto.nombre || 'Documento adjunto';
    this.mostrarVistaPreviaAdjunto = true;
  }

  descargarAdjunto(adjunto: { nombre: string; archivo?: File; dataUrl?: string }): void {
    const url = this.obtenerUrlAdjunto(adjunto);
    if (!url) return;

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = adjunto.nombre || 'documento';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    if (adjunto.archivo instanceof Blob && !adjunto.dataUrl) {
      URL.revokeObjectURL(url);
    }
  }

  private decodificarEntidades(valor: string): string {
    if (!this.isBrowser) {
      return valor;
    }

    const textarea = document.createElement('textarea');
    textarea.innerHTML = valor;
    return textarea.value;
  }

  private obtenerUrlAdjunto(adjunto: { archivo?: File; dataUrl?: string }): string | null {
    if (adjunto.dataUrl) return adjunto.dataUrl;
    if (adjunto.archivo instanceof Blob) return URL.createObjectURL(adjunto.archivo);
    return null;
  }

  private obtenerBlobAdjunto(adjunto: { archivo?: File; dataUrl?: string }): Blob | null {
    if (adjunto.archivo instanceof Blob) return adjunto.archivo;
    if (adjunto.dataUrl && this.esDataUrl(adjunto.dataUrl)) {
      return this.dataUrlABlob(adjunto.dataUrl);
    }
    return null;
  }

  obtenerFuenteVistaPreviaAdjuntoPdf(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.fuenteVistaPreviaAdjunto);
  }

  obtenerFuenteVistaPreviaAdjuntoImagen(): string {
    return this.fuenteVistaPreviaAdjunto;
  }

  esPdfVistaPreviaAdjunto(): boolean {
    return this.adjuntoVistaPreviaEsPdf;
  }

  esOfficeVistaPreviaAdjunto(): boolean {
    return this.adjuntoVistaPreviaEsOffice;
  }

  obtenerHtmlVistaPreviaAdjunto(): SafeHtml {
    return this.htmlVistaPreviaAdjunto || this.sanitizer.bypassSecurityTrustHtml(this.generarMensajePreviewHtml('Sin contenido para vista previa.'));
  }

  cerrarVistaPreviaAdjunto(): void {
    if (this.fuenteVistaPreviaAdjuntoEsBlob && this.fuenteVistaPreviaAdjunto) {
      URL.revokeObjectURL(this.fuenteVistaPreviaAdjunto);
    }
    this.mostrarVistaPreviaAdjunto = false;
    this.adjuntoVistaPreviaNombre = '';
    this.fuenteVistaPreviaAdjunto = '';
    this.htmlVistaPreviaAdjunto = null;
    this.cargandoVistaPreviaAdjunto = false;
    this.fuenteVistaPreviaAdjuntoEsBlob = false;
    this.adjuntoVistaPreviaEsPdf = false;
    this.adjuntoVistaPreviaEsOffice = false;
  }

  private esAdjuntoPdf(adjunto: { nombre?: string; tipo?: string; archivo?: File; dataUrl?: string }): boolean {
    const tipo = (adjunto.tipo || adjunto.archivo?.type || '').toLowerCase();
    if (tipo === 'application/pdf') return true;
    const nombre = (adjunto.nombre || adjunto.archivo?.name || '').toLowerCase();
    if (nombre.endsWith('.pdf')) return true;
    return !!adjunto.dataUrl?.startsWith('data:application/pdf');
  }

  private esAdjuntoOffice(adjunto: { nombre?: string; tipo?: string; archivo?: File; dataUrl?: string }): boolean {
    return this.esAdjuntoWord(adjunto) || this.esAdjuntoExcel(adjunto);
  }

  private esAdjuntoWord(adjunto: { nombre?: string; tipo?: string; archivo?: File; dataUrl?: string }): boolean {
    const tipo = (adjunto.tipo || adjunto.archivo?.type || '').toLowerCase();
    if (tipo.includes('wordprocessingml') || tipo.includes('msword')) return true;
    const nombre = (adjunto.nombre || adjunto.archivo?.name || '').toLowerCase();
    return nombre.endsWith('.docx') || nombre.endsWith('.doc');
  }

  private esAdjuntoExcel(adjunto: { nombre?: string; tipo?: string; archivo?: File; dataUrl?: string }): boolean {
    const tipo = (adjunto.tipo || adjunto.archivo?.type || '').toLowerCase();
    if (tipo.includes('spreadsheetml') || tipo.includes('ms-excel')) return true;
    const nombre = (adjunto.nombre || adjunto.archivo?.name || '').toLowerCase();
    return nombre.endsWith('.xlsx') || nombre.endsWith('.xls');
  }

  private async generarVistaPreviaExcel(blob: Blob): Promise<string> {
    const XLSX: any = await import('xlsx');
    const arrayBuffer = await blob.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const primeraHoja = workbook.SheetNames?.[0];

    if (!primeraHoja) {
      return this.generarMensajePreviewHtml('El archivo Excel no contiene hojas para mostrar.');
    }

    const hoja = workbook.Sheets[primeraHoja];
    const tablaHtml = XLSX.utils.sheet_to_html(hoja, { editable: false });

    return `
      <div style="padding: 12px; font-family: Segoe UI, Arial, sans-serif; color: #111827;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #4b5563;"><strong>Hoja:</strong> ${primeraHoja}</p>
        <div style="overflow:auto; max-height:68vh; border:1px solid #e5e7eb; border-radius:8px; background:#fff; padding:8px;">
          ${tablaHtml}
        </div>
      </div>
    `;
  }

  private async generarVistaPreviaWord(blob: Blob, nombreArchivo?: string): Promise<string> {
    const nombre = (nombreArchivo || '').toLowerCase();
    if (nombre.endsWith('.doc') && !nombre.endsWith('.docx')) {
      return this.generarMensajePreviewHtml('La vista previa de .doc no esta soportada. Usa .docx para vista previa o descarga el archivo.');
    }

    let mammoth: any;
    try {
      mammoth = await import('mammoth/mammoth.browser');
    } catch {
      mammoth = await import('mammoth');
    }

    const arrayBuffer = await blob.arrayBuffer();
    const resultado = await mammoth.convertToHtml({ arrayBuffer });
    const contenido = (resultado?.value || '').trim();

    if (!contenido) {
      return this.generarMensajePreviewHtml('El documento Word no contiene texto renderizable para vista previa.');
    }

    return `
      <div style="padding: 16px; max-height: 72vh; overflow:auto; font-family: Segoe UI, Arial, sans-serif; color:#111827; background:#fff;">
        ${contenido}
      </div>
    `;
  }

  private generarMensajePreviewHtml(mensaje: string): string {
    return `
      <div style="display:flex;align-items:center;justify-content:center;min-height:52vh;padding:24px;background:#f9fafb;color:#374151;font-family:Segoe UI,Arial,sans-serif;">
        <p style="text-align:center;max-width:760px;font-size:14px;line-height:1.5;margin:0;">${mensaje}</p>
      </div>
    `;
  }

  private dataUrlABlob(dataUrl: string): Blob | null {
    const partes = dataUrl.split(',');
    if (partes.length !== 2) return null;

    const encabezado = partes[0];
    const base64 = partes[1];
    const mimeMatch = encabezado.match(/data:([^;]+);base64/);
    const mime = mimeMatch?.[1] || 'application/octet-stream';

    try {
      const binario = atob(base64);
      const bytes = new Uint8Array(binario.length);
      for (let i = 0; i < binario.length; i++) {
        bytes[i] = binario.charCodeAt(i);
      }
      return new Blob([bytes], { type: mime });
    } catch {
      return null;
    }
  }

  private esDataUrl(valor: string): boolean {
    return valor.startsWith('data:');
  }

  crearNuevaActividad(): void {
    if (this.actividadModalAbierta) return;
    this.crearActividadDesdeBpmnEvt.emit({ nombre: '' });
  }

  get hayComentariosEnEdicion(): boolean {
    return this.comentariosEnEdicion.size > 0;
  }

  getComentariosActividad(nodoId: number): ComentarioAdicionalActividad[] {
    return (this.comentariosAdicionalesActividad || [])
      .map((comentario, index) => ({ comentario, index }))
      .filter((item) => Number(item.comentario.actividadId) === Number(nodoId))
      .sort((a, b) => {
        const fechaA = this.parseFechaComentario(a.comentario.fechaComentario);
        const fechaB = this.parseFechaComentario(b.comentario.fechaComentario);
        const direction = this.ordenRecientePrimero ? -1 : 1;

        if (fechaA !== fechaB) {
          return (fechaA - fechaB) * direction;
        }

        return (a.index - b.index) * direction;
      })
      .map((item) => item.comentario);
  }

  getComentariosPreviosActividad(nodoId: number): ComentarioAdicionalActividad[] {
    const comentarios = this.getComentariosActividad(nodoId);
    if (!this.proyectoFinalizado) {
      return comentarios;
    }
    const esSeguimiento = this.esActividadSeguimientoPorId(nodoId);
    return esSeguimiento ? [] : comentarios;
  }

  getComentariosSeguimientoActividad(nodoId: number): ComentarioAdicionalActividad[] {
    if (!this.proyectoFinalizado) {
      return [];
    }
    return this.esActividadSeguimientoPorId(nodoId) ? this.getComentariosActividad(nodoId) : [];
  }

  esComentarioDeSeguimiento(comentario: ComentarioAdicionalActividad): boolean {
    return this.esActividadSeguimientoPorId(Number(comentario?.actividadId));
  }

  mostrarDivisorSeguimientoComentario(
    nodo: FlujoNodo,
    index: number
  ): boolean {
    if (!this.proyectoFinalizado) return false;
    return this.esActividadSeguimiento(nodo) && index === 0;
  }

  puedeEditarComentario(comentario: ComentarioAdicionalActividad): boolean {
    if (this.proyectoCancelado || this.actividadModalAbierta) {
      return false;
    }
    if (!this.proyectoFinalizado) {
      return true;
    }
    return this.esActividadSeguimientoPorId(Number(comentario?.actividadId));
  }

  puedeEliminarComentario(comentario: ComentarioAdicionalActividad): boolean {
    return this.puedeEditarComentario(comentario);
  }

  puedeModificarComentario(comentario: ComentarioAdicionalActividad): boolean {
    return this.puedeEditarComentario(comentario);
  }

  agregarComentarioActividad(nodo: FlujoNodo): void {
    if (this.proyectoCancelado || this.actividadModalAbierta || this.hayComentariosEnEdicion || nodo.tipo !== 'tarea') return;

    const comentario: ComentarioAdicionalActividad = {
      id: this.obtenerSiguienteComentarioId(),
      actividadId: nodo.id,
      guardado: false,
      texto: '',
      responsableId: undefined,
      fechaComentario: this.formatearFechaComentario(new Date()),
      autorCuenta: this.obtenerNombreCuentaActual(),
      adjuntos: []
    };

    this.comentariosAdicionalesActividad = [...(this.comentariosAdicionalesActividad || []), comentario];
    this.comentariosEnEdicion.add(comentario.id);
    this.notificarBloqueoEdicionActividades();
    this.emitirComentariosActualizados();
  }

  eliminarComentarioActividad(comentarioId: number): void {
    if (this.proyectoCancelado || this.actividadModalAbierta || !this.puedeModificarComentarioPorId(comentarioId)) return;

    if (!this.proyecto?.id || comentarioId <= 0) {
      this.comentariosAdicionalesActividad = (this.comentariosAdicionalesActividad || []).filter(c => c.id !== comentarioId);
      this.comentariosEnEdicion.delete(comentarioId);
      this.comentarioEdicionBackup.delete(comentarioId);
      this.notificarBloqueoEdicionActividades();
      this.emitirComentariosActualizados();
      return;
    }

    this.registroSolicitudesService.eliminarComentarioActividad(this.proyecto.id, comentarioId).subscribe({
      next: () => {
        this.comentariosAdicionalesActividad = (this.comentariosAdicionalesActividad || []).filter(c => c.id !== comentarioId);
        this.comentariosEnEdicion.delete(comentarioId);
        this.comentarioEdicionBackup.delete(comentarioId);
        this.notificarBloqueoEdicionActividades();
        this.emitirComentariosActualizados();
      },
      error: (error) => console.error('Error eliminando comentario de actividad:', error)
    });
  }

  isComentarioEnEdicion(comentarioId: number): boolean {
    return this.comentariosEnEdicion.has(comentarioId);
  }

  editarComentarioActividad(comentarioId: number): void {
    if (this.proyectoCancelado || this.actividadModalAbierta || !this.puedeModificarComentarioPorId(comentarioId)) return;

    if (!this.comentarioEdicionBackup.has(comentarioId)) {
      const comentario = (this.comentariosAdicionalesActividad || []).find(c => c.id === comentarioId);
      if (comentario) {
        this.comentarioEdicionBackup.set(comentarioId, this.clonarComentario(comentario));
      }
    }

    this.comentariosEnEdicion.add(comentarioId);
    this.notificarBloqueoEdicionActividades();
  }

  cancelarEdicionComentario(comentarioId: number): void {
    if (this.actividadModalAbierta) return;

    const comentarios = [...(this.comentariosAdicionalesActividad || [])];
    const index = comentarios.findIndex(c => c.id === comentarioId);
    if (index >= 0) {
      const comentarioActual = comentarios[index];

      // If comment was created in UI and not saved yet, cancel should remove it entirely.
      if (!comentarioActual.guardado || comentarioId <= 0) {
        this.comentariosAdicionalesActividad = comentarios.filter(c => c.id !== comentarioId);
        this.comentarioEdicionBackup.delete(comentarioId);
        this.comentariosEnEdicion.delete(comentarioId);
        this.notificarBloqueoEdicionActividades();
        this.emitirComentariosActualizados();
        return;
      }

      const backup = this.comentarioEdicionBackup.get(comentarioId);
      if (backup) {
        comentarios[index] = this.clonarComentario(backup);
        this.comentariosAdicionalesActividad = comentarios;
        this.emitirComentariosActualizados();
      }
    }

    this.comentarioEdicionBackup.delete(comentarioId);
    this.comentariosEnEdicion.delete(comentarioId);
    this.notificarBloqueoEdicionActividades();
  }

  actualizarTextoComentario(comentarioId: number, texto: string): void {
    const index = (this.comentariosAdicionalesActividad || []).findIndex(c => c.id === comentarioId);
    if (index < 0) return;

    const comentario = this.comentariosAdicionalesActividad[index];
    comentario.texto = texto;
  }

  actualizarResponsableComentario(comentarioId: number, responsableId: number | undefined): void {
    const index = (this.comentariosAdicionalesActividad || []).findIndex(c => c.id === comentarioId);
    if (index < 0) return;

    const comentario = this.comentariosAdicionalesActividad[index];
    comentario.responsableId = responsableId;
  }

  onComentarioChange(): void {
    // Compatibilidad temporal con plantillas cacheadas durante hot-reload.
  }

  async guardarComentarioActividad(comentarioId: number): Promise<void> {
    if (this.proyectoCancelado || this.actividadModalAbierta || !this.puedeModificarComentarioPorId(comentarioId)) return;

    const index = (this.comentariosAdicionalesActividad || []).findIndex(c => c.id === comentarioId);
    if (index < 0) return;

    const comentario = this.comentariosAdicionalesActividad[index];
    if (!(comentario.texto || '').trim() && !(comentario.adjuntos || []).length) return;

    const actualizados = [...this.comentariosAdicionalesActividad];
    actualizados[index] = {
      ...comentario,
      guardado: true,
      texto: (comentario.texto || '').trim(),
      autorCuenta: comentario.autorCuenta || this.obtenerNombreCuentaActual(),
      fechaComentario: comentario.fechaComentario || this.formatearFechaComentario(new Date())
    };

    const comentarioActualizado = actualizados[index];

    if (!this.proyecto?.id) {
      this.comentariosAdicionalesActividad = actualizados;
      this.comentarioEdicionBackup.delete(comentarioId);
      this.comentariosEnEdicion.delete(comentarioId);
      this.notificarBloqueoEdicionActividades();
      this.emitirComentariosActualizados();
      return;
    }

    const comentarioConAdjuntosSubidos = await this.subirAdjuntosPendientesComentario(comentarioActualizado);
    if (!comentarioConAdjuntosSubidos) return;

    const payload = this.mapComentarioPayload(comentarioConAdjuntosSubidos);
    if (!payload) return;

    const request$ = comentarioConAdjuntosSubidos.id > 0
      ? this.registroSolicitudesService.actualizarComentarioActividad(this.proyecto.id, comentarioConAdjuntosSubidos.id, payload)
      : this.registroSolicitudesService.crearComentarioActividad(this.proyecto.id, payload);

    request$.subscribe({
      next: (guardado) => {
        const lista = [...(this.comentariosAdicionalesActividad || [])];
        const i = lista.findIndex(c => c.id === comentarioId);
        if (i >= 0) {
          lista[i] = {
            ...guardado,
            guardado: true
          };
        }

        this.comentariosAdicionalesActividad = lista;
        this.comentarioEdicionBackup.delete(comentarioId);
        this.comentariosEnEdicion.delete(comentarioId);
        this.notificarBloqueoEdicionActividades();
        this.emitirComentariosActualizados();
      },
      error: (error) => console.error('Error guardando comentario de actividad:', error)
    });
  }

  onToggleDetalleActividad(actividadId: number, event: Event): void {
    const details = event.target as HTMLDetailsElement;
    if (details?.open) return;

    const comentariosActividad = (this.comentariosAdicionalesActividad || [])
      .filter(c => c.actividadId === actividadId);

    let huboCambios = false;
    for (const comentario of comentariosActividad) {
      if (this.comentariosEnEdicion.delete(comentario.id)) {
        huboCambios = true;
      }
      this.comentarioEdicionBackup.delete(comentario.id);
    }

    const cantidadAntes = (this.comentariosAdicionalesActividad || []).length;
    this.comentariosAdicionalesActividad = (this.comentariosAdicionalesActividad || [])
      .filter(c => !(c.actividadId === actividadId && !c.guardado));

    if (this.comentariosAdicionalesActividad.length !== cantidadAntes) {
      huboCambios = true;
      this.emitirComentariosActualizados();
    }

    if (huboCambios) {
      this.notificarBloqueoEdicionActividades();
    }
  }

  async onSeleccionarAdjuntosComentario(event: Event, comentarioId: number): Promise<void> {
    if (this.proyectoCancelado || !this.puedeModificarComentarioPorId(comentarioId)) return;

    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;

    const index = (this.comentariosAdicionalesActividad || []).findIndex(c => c.id === comentarioId);
    if (index < 0) return;

    await this.agregarAdjuntosComentario(comentarioId, Array.from(files));
    input.value = '';
  }

  async onPegarImagenComentario(event: ClipboardEvent, comentarioId: number): Promise<void> {
    if (this.proyectoCancelado || !this.puedeModificarComentarioPorId(comentarioId)) return;

    const clipboardItems = event.clipboardData?.items;
    if (!clipboardItems?.length) return;

    const imagenes: File[] = [];
    for (const item of Array.from(clipboardItems)) {
      if (item.kind !== 'file') continue;
      if (!item.type?.startsWith('image/')) continue;
      const file = item.getAsFile();
      if (file) imagenes.push(file);
    }

    if (!imagenes.length) return;

    const normalizadas = imagenes.map((file, index) => this.normalizarNombreArchivoPegado(file, index));
    await this.agregarAdjuntosComentario(comentarioId, normalizadas);
  }

  eliminarAdjuntoComentario(comentarioId: number, adjuntoIndex: number): void {
    if (this.proyectoCancelado || !this.puedeModificarComentarioPorId(comentarioId)) return;

    const index = (this.comentariosAdicionalesActividad || []).findIndex(c => c.id === comentarioId);
    if (index < 0) return;

    const comentario = this.comentariosAdicionalesActividad[index];
    const actualizados = [...this.comentariosAdicionalesActividad];
    actualizados[index] = {
      ...comentario,
      adjuntos: (comentario.adjuntos || []).filter((_, i) => i !== adjuntoIndex)
    };
    this.comentariosAdicionalesActividad = actualizados;
    this.emitirComentariosActualizados();
  }

  descargarAdjuntoComentario(adjunto: FlujoAdjunto): void {
    const url = adjunto.dataUrl || (adjunto.archivo ? URL.createObjectURL(adjunto.archivo) : null);
    if (!url) return;

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = adjunto.nombre || 'adjunto';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    if (adjunto.archivo && !adjunto.dataUrl) {
      URL.revokeObjectURL(url);
    }
  }

  formatBytes(size?: number): string {
    if (!size || size <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(1024));
    const value = size / Math.pow(1024, i);
    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i] || 'B'}`;
  }

  getNombreCuentaComentario(comentario: ComentarioAdicionalActividad): string {
    return comentario.autorCuenta || this.obtenerNombreCuentaActual() || 'Cuenta actual';
  }

  trackByComentarioId(_index: number, comentario: ComentarioAdicionalActividad): number {
    return comentario.id;
  }

  esNodoOrdenCompra(nodo: FlujoNodo): boolean {
    return !!(nodo as any)?.esOrdenCompra;
  }

  get flujoTimeline(): FlujoNodo[] {
    try {
      const nodosBase = Array.isArray(this.flujoNodos) ? this.flujoNodos : [];
      const nodos = nodosBase.filter((nodo): nodo is FlujoNodo => !!nodo && typeof nodo === 'object');
      const nodosOrdenCompra = this.mapearOrdenesCompraANodos();
      const direction = this.ordenRecientePrimero ? -1 : 1;

      return [...nodos.filter((nodo) => nodo.tipo !== 'inicio'), ...nodosOrdenCompra]
        .sort((a, b) => {
          const fechaA = this.obtenerSortFechaNodo(a);
          const fechaB = this.obtenerSortFechaNodo(b);

          if (fechaA !== fechaB) {
            return (fechaA - fechaB) * direction;
          }

          return (a.id - b.id) * direction;
        });
    } catch {
      return [];
    }
  }

  esActividadSeguimiento(nodo: FlujoNodo): boolean {
    if (!this.proyectoFinalizado || this.esNodoOrdenCompra(nodo)) return false;
    return this.esTipoActividadSeguimiento(nodo?.tipo);
  }

  mostrarSeparadorActividadesSeguimiento(nodo: FlujoNodo, index: number, lista: FlujoNodo[]): boolean {
    if (!this.esActividadSeguimiento(nodo)) return false;
    if (index === 0) return true;

    const anterior = lista[index - 1];
    return !this.esActividadSeguimiento(anterior);
  }

  private parseFechaComentario(value?: string): number {
    if (!value) return 0;
    const raw = String(value).trim();

    const localDateTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (localDateTime) {
      const [, y, m, d, hh, mi, ss] = localDateTime;
      const localDate = new Date(
        Number(y),
        Number(m) - 1,
        Number(d),
        Number(hh),
        Number(mi),
        Number(ss || '0')
      );
      const localTime = localDate.getTime();
      return Number.isNaN(localTime) ? 0 : localTime;
    }

    const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      const [, y, m, d] = dateOnly;
      const localDate = new Date(Number(y), Number(m) - 1, Number(d));
      const localTime = localDate.getTime();
      return Number.isNaN(localTime) ? 0 : localTime;
    }

    const date = new Date(raw);
    const time = date.getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  private puedeModificarComentarioPorId(comentarioId: number): boolean {
    if (!this.proyectoFinalizado) return true;

    const comentario = (this.comentariosAdicionalesActividad || []).find((item) => item.id === comentarioId);
    if (!comentario) return false;

    return this.esActividadSeguimientoPorId(Number(comentario.actividadId));
  }

  private esActividadSeguimientoPorId(actividadId: number): boolean {
    const nodo = (this.flujoNodos || []).find((item) => Number(item.id) === Number(actividadId));
    if (!nodo) return false;
    return this.esActividadSeguimiento(nodo);
  }

  private esTipoActividadSeguimiento(tipo?: string): boolean {
    const valor = String(tipo || '').trim().toLowerCase();
    if (!valor) return false;
    return valor.includes('seguimiento');
  }

  private mapearOrdenesCompraANodos(): FlujoNodo[] {
    return (this.ordenesCompra || [])
      .map((orden, index) => {
        const numero = (orden.numero || '').trim();
        const fecha = (orden.fecha || '').trim();
        const tipo = (orden.tipo || 'OTROS').trim();
        const numeroLicitacion = (orden.numeroLicitacion || '').trim();
        const numeroSolicitud = (orden.numeroSolicitud || '').trim();
        const total = Number(orden.total || 0);

        if (!numero && !fecha && total <= 0) return null;

        const clave = `${orden.id || 0}|${numero}|${fecha}|${tipo}|${numeroLicitacion}|${numeroSolicitud}|${total}`;
        const idBase = Number(orden.id || 0) > 0
          ? Number(orden.id || 0)
          : this.hashOrdenCompra(clave) + index + 1;

        const descripcion = [
          `Orden de compra: ${numero || '-'} (${tipo || 'OTROS'})`,
          `N° licitacion: ${numeroLicitacion || '-'}`,
          `N° solicitud: ${numeroSolicitud || '-'}`,
          `Total sin IGV: S/ ${total.toFixed(2)}`
        ].join('\n');

        return {
          id: -(100000 + idBase),
          nombre: `Orden de compra ${numero || `#${index + 1}`}`,
          tipo: 'tarea' as const,
          estadoActividad: 'Completado' as EstadoTarea,
          fechaCambioEstado: fecha || undefined,
          fechaInicio: fecha || undefined,
          fechaFin: fecha || undefined,
          descripcion,
          adjuntos: (orden.adjuntos || []).map((adjunto) => ({ ...adjunto })),
          siguientesIds: [],
          responsableNombre: 'Compras',
          esOrdenCompra: true,
          ordenCompraMeta: {
            ...orden,
            numero,
            tipo,
            numeroLicitacion,
            numeroSolicitud,
            total
          }
        } as FlujoNodo;
      })
      .filter((nodo): nodo is FlujoNodo => !!nodo);
  }

  private hashOrdenCompra(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 89999);
  }

  private obtenerSortFechaNodo(nodo: FlujoNodo): number {
    const fecha = this.esNodoOrdenCompra(nodo)
      ? this.parseFechaComentario(nodo.fechaInicio)
      : (this.parseFechaComentario(nodo.fechaCambioEstado) || this.parseFechaComentario(nodo.fechaInicio));

    if (fecha) return fecha;
    return Math.abs(Number(nodo.id || 0));
  }

  private emitirComentariosActualizados(): void {
    this.comentariosAdicionalesActividadChange.emit([...(this.comentariosAdicionalesActividad || [])]);
  }

  private notificarBloqueoEdicionActividades(): void {
    this.bloqueoEdicionActividadesChange.emit(this.hayComentariosEnEdicion);
  }

  private obtenerSiguienteComentarioId(): number {
    const ids = (this.comentariosAdicionalesActividad || [])
      .map(comentario => comentario.id)
      .filter((id): id is number => typeof id === 'number' && id <= 0);
    return ids.length ? Math.min(...ids) - 1 : -1;
  }

  private mapComentarioPayload(comentario: ComentarioAdicionalActividad): ComentarioActividadPayloadApi | null {
    if (!comentario?.actividadId) return null;

    const nodo = this.flujoNodos.find(item => item.id === comentario.actividadId);

    return {
      actividadId: comentario.actividadId,
      nombre: nodo?.nombre,
      texto: (comentario.texto || '').trim(),
      autorCuenta: comentario.autorCuenta || this.obtenerNombreCuentaActual(),
      fechaComentario: this.formatearFechaIsoLocal(new Date()),
      estadoActividad: nodo?.estadoActividad,
      responsableId: comentario.responsableId,
      fechaInicio: nodo?.fechaInicio,
      fechaFin: nodo?.fechaFin,
      descripcion: (comentario.texto || '').trim(),
      adjuntos: (comentario.adjuntos || []).map(adjunto => ({
        nombre: adjunto.nombre,
        tipo: adjunto.tipo,
        tamano: Number(adjunto.tamano || 0),
        objectKey: adjunto.objectKey,
        dataUrl: adjunto.objectKey ? undefined : adjunto.dataUrl
      }))
    };
  }

  private async subirAdjuntosPendientesComentario(comentario: ComentarioAdicionalActividad): Promise<ComentarioAdicionalActividad | null> {
    if (!this.proyecto?.id) {
      return comentario;
    }

    const adjuntos = comentario.adjuntos || [];
    if (!adjuntos.length) {
      return comentario;
    }

    const resultado: FlujoAdjunto[] = [];
    try {
      for (const adjunto of adjuntos) {
        if (!adjunto.archivo || adjunto.objectKey) {
          resultado.push(adjunto);
          continue;
        }

        const subida = await firstValueFrom(
          this.registroSolicitudesService.subirAdjuntoActividad(
            adjunto.archivo,
            this.proyecto.id,
            comentario.actividadId,
            'comentario'
          )
        );

        resultado.push({
          nombre: adjunto.nombre,
          tipo: adjunto.tipo,
          tamano: Number(adjunto.tamano || adjunto.archivo.size || 0),
          objectKey: subida.objectKey,
          dataUrl: adjunto.dataUrl || subida.publicUrl
        });
      }
    } catch (error) {
      console.error('Error subiendo adjunto de comentario:', error);
      this.erroresAdjuntosComentario[comentario.id] = 'No se pudo subir uno o más adjuntos. Intenta nuevamente.';
      return null;
    }

    delete this.erroresAdjuntosComentario[comentario.id];
    return {
      ...comentario,
      adjuntos: resultado
    };
  }

  private formatearFechaInput(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private clonarComentario(comentario: ComentarioAdicionalActividad): ComentarioAdicionalActividad {
    return {
      ...comentario,
      adjuntos: (comentario.adjuntos || []).map((adjunto) => ({ ...adjunto }))
    };
  }

  private formatearFechaComentario(date: Date): string {
    return date.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private formatearFechaIsoLocal(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }

  private obtenerNombreCuentaActual(): string {
    try {
      const fullName = this.authService.getUserFullName()?.trim();
      if (fullName) return fullName;

      const username = this.authService.currentUserValue?.username?.trim();
      if (username) return username;
    } catch {
      return 'Cuenta actual';
    }

    return 'Cuenta actual';
  }

  private leerArchivoComoDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.readAsDataURL(file);
    });
  }

  private async agregarAdjuntosComentario(comentarioId: number, archivos: File[]): Promise<void> {
    const index = (this.comentariosAdicionalesActividad || []).findIndex(c => c.id === comentarioId);
    if (index < 0) return;

    delete this.erroresAdjuntosComentario[comentarioId];

    const comentario = this.comentariosAdicionalesActividad[index];
    const nuevosAdjuntos: FlujoAdjunto[] = [];
    const errores: string[] = [];

    for (const file of archivos) {
      const procesado = await this.prepararAdjuntoComentario(file);
      if (!procesado) {
        errores.push(`No se pudo adjuntar ${file.name}`);
        continue;
      }

      if (typeof procesado === 'string') {
        errores.push(procesado);
        continue;
      }

      nuevosAdjuntos.push({
        nombre: procesado.name,
        tipo: procesado.type || 'application/octet-stream',
        tamano: procesado.size,
        archivo: procesado,
        dataUrl: await this.leerArchivoComoDataUrl(procesado)
      });
    }

    const actualizados = [...this.comentariosAdicionalesActividad];
    actualizados[index] = {
      ...comentario,
      adjuntos: [...(comentario.adjuntos || []), ...nuevosAdjuntos]
    };
    this.comentariosAdicionalesActividad = actualizados;
    this.emitirComentariosActualizados();

    if (errores.length) {
      this.erroresAdjuntosComentario[comentarioId] = errores.length === 1
        ? errores[0]
        : `${errores[0]} (+${errores.length - 1} más)`;
    }
  }

  private async prepararAdjuntoComentario(file: File): Promise<File | string | null> {
    const nombre = (file.name || '').trim();
    if (!nombre) {
      return 'No se pudo adjuntar un archivo sin nombre';
    }

    if (this.esAudioOVideo(file)) {
      return `No se permiten archivos de audio o video (${nombre})`;
    }

    if (!this.esTipoPermitido(file)) {
      return `Tipo de archivo no permitido (${nombre})`;
    }

    let archivoFinal = file;
    if (this.esImagenComprimible(file)) {
      const comprimido = await this.comprimirImagen(file);
      if (comprimido) {
        archivoFinal = comprimido;
      }
    }

    const limiteBytes = this.obtenerLimiteBytes(archivoFinal);
    if (archivoFinal.size > limiteBytes) {
      return `El archivo supera el límite de ${this.formatearLimiteMb(limiteBytes)} (${nombre})`;
    }

    return archivoFinal;
  }

  private esAudioOVideo(file: File): boolean {
    const tipo = (file.type || '').toLowerCase();
    if (tipo.startsWith('audio/') || tipo.startsWith('video/')) {
      return true;
    }

    const extension = this.obtenerExtension(file.name);
    return ['mp3', 'wav', 'ogg', 'm4a', 'mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension);
  }

  private esTipoPermitido(file: File): boolean {
    const tipo = (file.type || '').toLowerCase();
    if (tipo && this.tiposPermitidos.has(tipo)) {
      return true;
    }

    return this.extensionesPermitidas.has(this.obtenerExtension(file.name));
  }

  private obtenerExtension(nombre: string): string {
    const limpio = (nombre || '').trim().toLowerCase();
    const partes = limpio.split('.');
    return partes.length > 1 ? partes[partes.length - 1] : '';
  }

  private esImagenComprimible(file: File): boolean {
    const tipo = (file.type || '').toLowerCase();
    return tipo === 'image/jpeg' || tipo === 'image/jpg' || tipo === 'image/png' || tipo === 'image/webp';
  }

  private esImagen(file: File): boolean {
    const tipo = (file.type || '').toLowerCase();
    if (tipo.startsWith('image/')) return true;
    const extension = this.obtenerExtension(file.name);
    return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(extension);
  }

  private obtenerLimiteBytes(file: File): number {
    return this.esImagen(file) ? this.maxImagenBytes : this.maxDocumentoBytes;
  }

  private formatearLimiteMb(bytes: number): string {
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }

  private async comprimirImagen(file: File): Promise<File | null> {
    if (!this.isBrowser) return file;

    const bitmap = await this.cargarBitmap(file);
    if (!bitmap) return file;

    const maxDimension = 1920;
    const escala = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * escala));
    let height = Math.max(1, Math.round(bitmap.height * escala));

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return file;

    const outputType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    let quality = outputType === 'image/jpeg' ? 0.82 : 0.8;
    let resultado: Blob | null = null;

    for (let intento = 0; intento < 6; intento += 1) {
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      resultado = await this.canvasToBlob(canvas, outputType, quality);
      if (!resultado) break;
      if (resultado.size <= this.maxImagenBytes) {
        break;
      }

      if (quality > 0.5) {
        quality -= 0.08;
      } else {
        width = Math.max(960, Math.round(width * 0.86));
        height = Math.max(640, Math.round(height * 0.86));
      }
    }

    if (!resultado) return file;
    if (resultado.size >= file.size) return file;

    const nombreBase = file.name.replace(/\.[^.]+$/, '');
    const extension = outputType === 'image/webp' ? 'webp' : 'jpg';
    return new File([resultado], `${nombreBase}.${extension}`, { type: outputType });
  }

  private cargarBitmap(file: File): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      image.src = url;
    });
  }

  private canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  private normalizarNombreArchivoPegado(file: File, index: number): File {
    const extensionPorTipo: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/bmp': 'bmp'
    };

    const extension = extensionPorTipo[file.type] || 'png';
    const fecha = new Date();
    const marcaTiempo = [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, '0'),
      String(fecha.getDate()).padStart(2, '0')
    ].join('');
    const hora = [
      String(fecha.getHours()).padStart(2, '0'),
      String(fecha.getMinutes()).padStart(2, '0'),
      String(fecha.getSeconds()).padStart(2, '0')
    ].join('');

    const nombreLimpio = (file.name || '').trim();
    const requiereNombreGenerado = !nombreLimpio || nombreLimpio === 'image.png' || nombreLimpio === 'image.jpg';
    const nombreFinal = requiereNombreGenerado
      ? `imagen-pegada-${marcaTiempo}-${hora}-${index + 1}.${extension}`
      : nombreLimpio;

    return new File([file], nombreFinal, { type: file.type || 'image/png' });
  }

  private async renderBpmn(): Promise<void> {
    if (!this.bpmnModeler) return;
    const xml = this.buildBpmnXml();
    this.isImportandoXml = true;
    await this.bpmnModeler.importXML(xml);
    this.isImportandoXml = false;
    this.ultimoSnapshotFlujo = this.crearSnapshotFlujo(this.normalizarNodos());
    const canvas = this.bpmnModeler.get('canvas');
    canvas.zoom('fit-viewport');
  }

  private registrarEventosBpmn(): void {
    if (!this.bpmnModeler) return;

    const eventBus = this.bpmnModeler.get('eventBus');

    eventBus.on('shape.added', (event: any) => {
      if (this.isImportandoXml) return;

      const shape = event?.element;
      if (!shape || shape.type !== 'bpmn:Task') return;

      const taskId: string = shape.id || '';
      // Si es un task gestionado por nuestro flujo (Task_{id}) no disparamos alta nueva.
      if (/^Task_\d+$/.test(taskId)) return;
      // La conexión del append puede no existir aún en este hook.
      // Se procesa en commandStack.changed para recuperar la dependencia real.
      this.tareasExternasPendientes.add(taskId);
    });

    eventBus.on('commandStack.changed', () => {
      if (this.isImportandoXml) return;
      this.programarSincronizacionFlujo();
    });

    eventBus.on('element.click', (event: any) => {
      const element = event?.element;
      if (!element || element.type !== 'bpmn:Task') return;

      const taskId: string = element.id || '';
      const match = taskId.match(/^Task_(\d+)$/);
      if (!match) return;

      const nodoId = Number(match[1]);
      const nodo = this.flujoNodos.find(n => n.id === nodoId);
      if (nodo) {
        this.abrirNodoEvt.emit(nodo);
      }
    });
  }

  private programarSincronizacionFlujo(): void {
    if (this.sincronizacionPendiente) {
      clearTimeout(this.sincronizacionPendiente);
    }

    this.sincronizacionPendiente = setTimeout(() => {
      this.sincronizacionPendiente = null;
      this.procesarTareasExternasPendientes();
      this.sincronizarFlujoDesdeDiagrama();
    }, 80);
  }

  private procesarTareasExternasPendientes(): void {
    if (!this.bpmnModeler || this.tareasExternasPendientes.size === 0) return;

    const elementRegistry = this.bpmnModeler.get('elementRegistry');
    if (!elementRegistry) return;

    const pendientes = Array.from(this.tareasExternasPendientes);
    pendientes.forEach(taskId => {
      const shape = elementRegistry.get(taskId);
      if (!shape || shape.type !== 'bpmn:Task') {
        this.tareasExternasPendientes.delete(taskId);
        return;
      }

      const nombre = shape.businessObject?.name?.trim() || '';
      let nodoOrigenId: number | undefined;

      const incoming = shape.businessObject?.incoming;
      const sourceRefId: string | undefined = incoming?.[0]?.sourceRef?.id;

      if (sourceRefId) {
        const sourceTaskMatch = sourceRefId.match(/^Task_(\d+)$/);
        if (sourceTaskMatch) {
          nodoOrigenId = Number(sourceTaskMatch[1]);
        } else if (sourceRefId === 'StartEvent_1') {
          const nodoInicio = this.flujoNodos.find(n => n.tipo === 'inicio');
          nodoOrigenId = nodoInicio?.id;
        }
      }

      this.crearActividadDesdeBpmnEvt.emit({ nombre, nodoOrigenId });
      this.tareasExternasPendientes.delete(taskId);
    });
  }

  private sincronizarFlujoDesdeDiagrama(): void {
    if (!this.bpmnModeler || this.isImportandoXml) return;

    const elementRegistry = this.bpmnModeler.get('elementRegistry');
    if (!elementRegistry) return;

    const baseNodes = this.normalizarNodos();
    const inicio = baseNodes.find(n => n.tipo === 'inicio') ?? baseNodes[0];
    const nodosPorId = new Map<number, FlujoNodo>(baseNodes.map(n => [n.id, n]));
    const siguientesPorNodo = new Map<number, number[]>();

    baseNodes.forEach(nodo => {
      siguientesPorNodo.set(nodo.id, []);
    });

    const shapes: any[] = elementRegistry.filter((element: any) => {
      if (element?.labelTarget) return false;
      return element?.type === 'bpmn:Task' || element?.type === 'bpmn:StartEvent';
    });

    const posicionesPorNodo = new Map<number, { x: number; y: number }>();
    shapes.forEach(shape => {
      const nodoId = this.obtenerNodoIdDesdeElemento(shape?.id, inicio.id);
      if (nodoId === null || !nodosPorId.has(nodoId)) return;
      posicionesPorNodo.set(nodoId, { x: shape.x, y: shape.y });
    });

    const sequenceFlows: any[] = elementRegistry.filter((element: any) => {
      if (element?.labelTarget) return false;
      return element?.type === 'bpmn:SequenceFlow';
    });

    sequenceFlows.forEach(connection => {
      const sourceId = this.obtenerNodoIdDesdeElemento(connection?.source?.id, inicio.id);
      const targetId = this.obtenerNodoIdDesdeElemento(connection?.target?.id, inicio.id);

      if (sourceId === null || targetId === null) return;
      if (!siguientesPorNodo.has(sourceId) || !nodosPorId.has(targetId)) return;

      const actuales = siguientesPorNodo.get(sourceId) ?? [];
      if (!actuales.includes(targetId)) {
        siguientesPorNodo.set(sourceId, [...actuales, targetId]);
      }
    });

    const flujoActualizado = baseNodes.map(nodo => {
      const posicion = posicionesPorNodo.get(nodo.id);
      const siguientes = siguientesPorNodo.get(nodo.id) ?? [];

      return {
        ...nodo,
        posicionX: posicion ? posicion.x : nodo.posicionX,
        posicionY: posicion ? posicion.y : nodo.posicionY,
        siguientesIds: [...siguientes]
      };
    });

    const snapshot = this.crearSnapshotFlujo(flujoActualizado);
    if (snapshot === this.ultimoSnapshotFlujo) return;

    this.ultimoSnapshotFlujo = snapshot;
    this.flujoActualizadoEvt.emit(flujoActualizado);
  }

  private obtenerNodoIdDesdeElemento(elementId: string | undefined, idNodoInicio: number): number | null {
    if (!elementId) return null;
    if (elementId === 'StartEvent_1') return idNodoInicio;

    const taskMatch = elementId.match(/^Task_(\d+)$/);
    if (!taskMatch) return null;
    return Number(taskMatch[1]);
  }

  private crearSnapshotFlujo(nodes: FlujoNodo[]): string {
    const normalizados = [...nodes]
      .sort((a, b) => a.id - b.id)
      .map(nodo => ({
        id: nodo.id,
        posicionX: nodo.posicionX ?? null,
        posicionY: nodo.posicionY ?? null,
        siguientesIds: [...(nodo.siguientesIds || [])].sort((a, b) => a - b)
      }));

    return JSON.stringify(normalizados);
  }

  private buildBpmnXml(): string {
    const nodes = this.normalizarNodos();
    const startNode = nodes.find(n => n.tipo === 'inicio') ?? nodes[0];
    const taskNodes = nodes.filter(n => n.tipo !== 'inicio');

    const startId = 'StartEvent_1';
    const nodeId = (n: FlujoNodo): string => (n.tipo === 'inicio' ? startId : `Task_${n.id}`);

    const flows: Array<{ id: string; source: string; target: string }> = [];

    const startTargets = startNode.siguientesIds.length
      ? startNode.siguientesIds
      : (taskNodes.length ? [taskNodes[0].id] : []);

    startTargets.forEach(targetId => {
      flows.push({
        id: `Flow_${startNode.id}_${targetId}`,
        source: startId,
        target: `Task_${targetId}`
      });
    });

    nodes.forEach(nodo => {
      if (nodo.tipo === 'inicio') return;
      if (nodo.siguientesIds.length) {
        nodo.siguientesIds.forEach(targetId => {
          flows.push({
            id: `Flow_${nodo.id}_${targetId}`,
            source: nodeId(nodo),
            target: `Task_${targetId}`
          });
        });
      }
    });

    const shapes = this.buildShapes(nodes, startId);
    const edges = this.buildEdges(flows, shapes);

    const processElements = [
      `<bpmn:startEvent id="${startId}" name="Inicio" />`,
      ...taskNodes.map(n => `<bpmn:task id="${nodeId(n)}" name="${this.escapeXml(n.nombre)}" />`),
      ...flows.map(f => `<bpmn:sequenceFlow id="${f.id}" sourceRef="${f.source}" targetRef="${f.target}" />`)
    ].join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    ${processElements}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      ${shapes.map(s => `<bpmndi:BPMNShape id="${s.id}_di" bpmnElement="${s.id}"><dc:Bounds x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" /></bpmndi:BPMNShape>`).join('')}
      ${edges.map(e => `<bpmndi:BPMNEdge id="${e.id}_di" bpmnElement="${e.id}">${e.waypoints.map(p => `<di:waypoint x="${p.x}" y="${p.y}" />`).join('')}</bpmndi:BPMNEdge>`).join('')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
  }

  private normalizarNodos(): FlujoNodo[] {
    const nodos = Array.isArray(this.flujoNodos) ? this.flujoNodos : [];

    if (nodos.length === 0) {
      return [{ id: 1, nombre: 'Inicio', tipo: 'inicio', siguientesIds: [] }];
    }
    const tieneInicio = nodos.some(n => n.tipo === 'inicio');
    if (tieneInicio) {
      return nodos.map(nodo => ({
        ...nodo,
        siguientesIds: Array.isArray(nodo.siguientesIds) ? [...nodo.siguientesIds] : [],
        estadoActividad: nodo.tipo === 'tarea' ? (nodo.estadoActividad || 'Pendiente') : undefined
      }));
    }
    return [
      { id: 1, nombre: 'Inicio', tipo: 'inicio', siguientesIds: [] },
      ...nodos.map(nodo => ({
        ...nodo,
        siguientesIds: Array.isArray(nodo.siguientesIds) ? [...nodo.siguientesIds] : [],
        estadoActividad: nodo.tipo === 'tarea' ? (nodo.estadoActividad || 'Pendiente') : undefined
      }))
    ];
  }

  private buildShapes(nodes: FlujoNodo[], startId: string): Array<{ id: string; x: number; y: number; width: number; height: number }> {
    const shapes: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
    const start = nodes.find(n => n.tipo === 'inicio') ?? nodes[0];
    const tasks = nodes.filter(n => n.tipo !== 'inicio');

    const xInicio = typeof start.posicionX === 'number' ? start.posicionX : 105;
    const yInicio = typeof start.posicionY === 'number' ? start.posicionY : 118;
    shapes.push({ id: startId, x: xInicio, y: yInicio, width: 32, height: 32 });

    const nivelPorNodo = new Map<number, number>();
    const visitados = new Set<number>([start.id]);
    const cola: Array<{ id: number; nivel: number }> = (start.siguientesIds || []).map(id => ({ id, nivel: 1 }));

    while (cola.length > 0) {
      const actual = cola.shift()!;
      const previo = nivelPorNodo.get(actual.id);
      if (previo === undefined || actual.nivel < previo) {
        nivelPorNodo.set(actual.id, actual.nivel);
      }

      if (visitados.has(actual.id)) continue;
      visitados.add(actual.id);

      const nodo = tasks.find(n => n.id === actual.id);
      if (!nodo) continue;

      (nodo.siguientesIds || []).forEach(siguienteId => {
        cola.push({ id: siguienteId, nivel: actual.nivel + 1 });
      });
    }

    let nivelFallback = Math.max(1, ...Array.from(nivelPorNodo.values(), nivel => nivel + 1));
    tasks.forEach(nodo => {
      if (!nivelPorNodo.has(nodo.id)) {
        nivelPorNodo.set(nodo.id, nivelFallback);
        nivelFallback += 1;
      }
    });

    const gruposPorNivel = new Map<number, FlujoNodo[]>();
    tasks.forEach(nodo => {
      const nivel = nivelPorNodo.get(nodo.id) ?? 1;
      const grupo = gruposPorNivel.get(nivel) ?? [];
      grupo.push(nodo);
      gruposPorNivel.set(nivel, grupo);
    });

    const nivelesOrdenados = Array.from(gruposPorNivel.keys()).sort((a, b) => a - b);
    nivelesOrdenados.forEach(nivel => {
      const nodosNivel = (gruposPorNivel.get(nivel) ?? []).sort((a, b) => a.id - b.id);
      const centroY = yInicio - 16;

      nodosNivel.forEach((nodo, indice) => {
        const autoX = xInicio + 135 + (nivel - 1) * 220;
        const autoY = centroY + (indice - (nodosNivel.length - 1) / 2) * 125;

        const x = typeof nodo.posicionX === 'number' ? nodo.posicionX : autoX;
        const y = typeof nodo.posicionY === 'number' ? nodo.posicionY : autoY;
        shapes.push({ id: `Task_${nodo.id}`, x, y, width: 110, height: 66 });
      });
    });

    return shapes;
  }

  private buildEdges(flows: Array<{ id: string; source: string; target: string }>, shapes: Array<{ id: string; x: number; y: number; width: number; height: number }>): Array<{ id: string; waypoints: Array<{ x: number; y: number }> }>
  {
    const shapeById = (id: string): { id: string; x: number; y: number; width: number; height: number } | undefined =>
      shapes.find(s => s.id === id);

    const esTask = (id: string): boolean => /^Task_\d+$/.test(id);

    const puntoSalida = (id: string): { x: number; y: number } => {
      const shape = shapeById(id);
      if (!shape) return { x: 0, y: 0 };

      if (esTask(id)) {
        // Conectar desde la zona superior del task para no cruzar el texto central.
        return { x: shape.x + shape.width, y: shape.y + 18 };
      }

      return { x: shape.x + shape.width, y: shape.y + shape.height / 2 };
    };

    const puntoEntrada = (id: string): { x: number; y: number } => {
      const shape = shapeById(id);
      if (!shape) return { x: 0, y: 0 };

      if (esTask(id)) {
        return { x: shape.x, y: shape.y + 18 };
      }

      return { x: shape.x, y: shape.y + shape.height / 2 };
    };

    return flows.map(flow => {
      const source = puntoSalida(flow.source);
      const target = puntoEntrada(flow.target);

      const midX = source.x + (target.x - source.x) / 2;
      return {
        id: flow.id,
        waypoints: [
          source,
          { x: midX, y: source.y },
          { x: midX, y: target.y },
          target
        ]
      };
    });
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

}
