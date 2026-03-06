import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, EventEmitter, Inject, Input, OnChanges, Output, PLATFORM_ID, SimpleChanges, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalDismissDirective } from '../../../../shared/directives/modal-dismiss.directive';
import { Firma } from '../../models/firma.model';
import { FirmaFormData, FirmaFormModalComponent } from '../firma-form-modal/firma-form-modal.component';
import { PDFDocument, rgb } from 'pdf-lib';

type PosicionFirma = 'superior-izquierda' | 'superior-centro' | 'superior-derecha' | 
                     'centro-izquierda' | 'centro-centro' | 'centro-derecha' |
                     'inferior-izquierda' | 'inferior-centro' | 'inferior-derecha';

export interface DocumentoFirmadoData {
  archivo: File;
  firmaId: number;
  posicionX: number;  // Posición X en el canvas
  posicionY: number;  // Posición Y en el canvas
  pagina: number;     // Número de página donde se firmó
  tamano: number;
  firmaNombre: string;
  firmaCargo?: string;
  firmaImagen: string;
  canvasWidth: number;  // Ancho del canvas para calcular proporciones
  canvasHeight: number; // Alto del canvas para calcular proporciones
  pdfBytes?: Uint8Array; // Bytes del PDF firmado (opcional, solo para guardar)
  soloGuardar?: boolean; // Si es true, solo guarda sin descargar
}

interface PosicionConfig {
  valor: PosicionFirma;
  nombre: string;
  icono: string;
}

@Component({
  selector: 'app-firmar-documento-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalDismissDirective, FirmaFormModalComponent],
  templateUrl: './firmar-documento-modal.component.html',
  styleUrls: ['./firmar-documento-modal.component.css'],
})
export class FirmarDocumentoModalComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() visible = false;
  @Input() firmasDisponibles: Firma[] = [];
  @Input() archivoInicial: File | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() firmarDocumento = new EventEmitter<DocumentoFirmadoData>();

  // ViewChild referencias
  @ViewChild('fileInput', { static: false }) fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('pdfScrollContainer', { static: false }) pdfScrollContainerRef!: ElementRef<HTMLDivElement>;

  // Estado del archivo
  protected archivoSubido: File | null = null;
  protected nombreArchivo = '';
  protected tamanoArchivo = '';

  // Estado de la firma
  protected firmaSeleccionadaId: number | null = null;
  protected firmaSeleccionada: Firma | null = null;
  protected posicionFirma: PosicionFirma = 'inferior-derecha';
  protected tamanoFirma = 100;

  // Estado del PDF y drag-and-drop
  protected pdfCargado = false;
  protected totalPaginas = 0;
  protected canvasWidth = 0;
  protected canvasHeight = 0;
  protected firmaPosicionada = false;
  protected firmaPosX = 0;
  protected firmaPosY = 0;
  protected paginaFirmaPosicionada = 0; // Página donde se posicionó la firma
  protected firmaWidthPreview = 120;
  protected firmaHeightPreview = 50;
  protected zoomLevel = 1.0;
  
  // Estado para navegación arrastrando (drag to pan)
  protected isDraggingPDF = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private scrollLeft = 0;
  private scrollTop = 0;
  
  // Referencias bound de event listeners para poder removerlos
  private boundHandleMouseDown?: (e: MouseEvent) => void;
  private boundHandleMouseMove?: (e: MouseEvent) => void;
  private boundHandleMouseUp?: (e: MouseEvent) => void;
  private eventListenersConfigured = false;
  
  // Canvas para cada página
  protected paginasRenderizadas: { numero: number; canvas: HTMLCanvasElement; width: number; height: number }[] = [];

  // Almacenar el PDF cargado
  private pdfDocument: any = null; // PDF.js PDFDocumentProxy
  private pdfArrayBuffer: ArrayBuffer | null = null;
  private pdfjsLib: any = null; // Se cargará dinámicamente en el navegador
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Configurar worker de PDF.js solo en el navegador
    if (this.isBrowser) {
      this.initPdfJs();
    }
  }

  private async initPdfJs(): Promise<void> {
    try {
      // Importar pdfjs-dist dinámicamente solo en el navegador
      const pdfjs = await import('pdfjs-dist');
      this.pdfjsLib = pdfjs;
      
      // Configurar worker usando la URL del paquete npm
      // Vite copiará este archivo automáticamente al build
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url
      ).toString();
    } catch (error) {
      console.error('Error al cargar PDF.js:', error);
    }
  }

  // Configuración de posiciones disponibles
  protected readonly posicionesDisponibles: PosicionConfig[] = [
    { valor: 'superior-izquierda', nombre: 'Sup. Izq.', icono: 'M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z' },
    { valor: 'superior-centro', nombre: 'Sup. Centro', icono: 'M6 4a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1V4z' },
    { valor: 'superior-derecha', nombre: 'Sup. Der.', icono: 'M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z' },
    { valor: 'centro-izquierda', nombre: 'Centro Izq.', icono: 'M3 8a1 1 0 011-1h12a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V8z' },
    { valor: 'centro-centro', nombre: 'Centro', icono: 'M6 8a1 1 0 011-1h6a1 1 0 011 1v4a1 1 0 01-1 1H7a1 1 0 01-1-1V8z' },
    { valor: 'centro-derecha', nombre: 'Centro Der.', icono: 'M3 8a1 1 0 011-1h12a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V8z' },
    { valor: 'inferior-izquierda', nombre: 'Inf. Izq.', icono: 'M3 14a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z' },
    { valor: 'inferior-centro', nombre: 'Inf. Centro', icono: 'M6 14a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1v-2z' },
    { valor: 'inferior-derecha', nombre: 'Inf. Der.', icono: 'M3 14a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z' },
  ];

  // Modal de nueva firma
  protected mostrarModalNuevaFirma = false;
  protected nuevaFirmaCreada: Firma | null = null;

  // Validación
  protected intentoGuardar = false;
  protected errores: { [key: string]: string } = {};

  // Toast notification
  protected toastVisible = false;
  protected toastMensaje = '';
  protected toastTipo: 'success' | 'error' = 'success';
  private toastTimeout: any;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.resetearFormulario();

      // Si hay un archivo inicial (PDF firmado pre-cargado), cargarlo automáticamente
      if (this.archivoInicial) {
        setTimeout(() => {
          this.procesarArchivo(this.archivoInicial!);
        }, 100);
      }
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    // Configurar event listeners para drag-to-pan
    setTimeout(() => {
      if (this.pdfScrollContainerRef?.nativeElement) {
        console.log('Configurando event listeners para drag');
        this.setupEventListeners();
      }
    }, 200);
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    this.removeEventListeners();
  }

  private setupEventListeners(): void {
    const container = this.pdfScrollContainerRef?.nativeElement;
    if (!container) {
      console.log('Container no disponible para event listeners');
      return;
    }

    // Si ya están configurados, primero removerlos
    if (this.eventListenersConfigured) {
      console.log('Removiendo event listeners existentes');
      this.removeEventListeners();
    }

    console.log('Agregando event listeners al container');

    // Crear referencias bound para poder removerlas después
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);

    // Drag to pan
    container.addEventListener('mousedown', this.boundHandleMouseDown);
    container.addEventListener('mousemove', this.boundHandleMouseMove);
    container.addEventListener('mouseup', this.boundHandleMouseUp);
    container.addEventListener('mouseleave', this.boundHandleMouseUp);
    
    this.eventListenersConfigured = true;
    console.log('Event listeners agregados correctamente');
  }

  private removeEventListeners(): void {
    const container = this.pdfScrollContainerRef?.nativeElement;
    if (!container) return;

    if (this.boundHandleMouseDown) {
      container.removeEventListener('mousedown', this.boundHandleMouseDown);
    }
    if (this.boundHandleMouseMove) {
      container.removeEventListener('mousemove', this.boundHandleMouseMove);
    }
    if (this.boundHandleMouseUp) {
      container.removeEventListener('mouseup', this.boundHandleMouseUp);
      container.removeEventListener('mouseleave', this.boundHandleMouseUp);
    }
    
    this.eventListenersConfigured = false;
  }

  private handleMouseDown(event: MouseEvent): void {
    // Solo activar drag con el botón izquierdo
    // No activar si se está arrastrando la firma
    const target = event.target as HTMLElement;
    if (event.button !== 0 || target.closest('[draggable="true"]')) {
      return;
    }

    const container = this.pdfScrollContainerRef?.nativeElement;
    if (!container) return;

    console.log('Iniciando drag del PDF');
    this.isDraggingPDF = true;
    this.dragStartX = event.pageX - container.offsetLeft;
    this.dragStartY = event.pageY - container.offsetTop;
    this.scrollLeft = container.scrollLeft;
    this.scrollTop = container.scrollTop;

    event.preventDefault();
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDraggingPDF) return;

    const container = this.pdfScrollContainerRef?.nativeElement;
    if (!container) return;

    event.preventDefault();

    const x = event.pageX - container.offsetLeft;
    const y = event.pageY - container.offsetTop;
    const walkX = (x - this.dragStartX) * 1.5; // Multiplicador para hacer el drag más rápido
    const walkY = (y - this.dragStartY) * 1.5;

    container.scrollLeft = this.scrollLeft - walkX;
    container.scrollTop = this.scrollTop - walkY;
  }

  private handleMouseUp(event: MouseEvent): void {
    this.isDraggingPDF = false;
  }

  private resetearFormulario(): void {
    this.archivoSubido = null;
    this.nombreArchivo = '';
    this.tamanoArchivo = '';
    this.firmaSeleccionadaId = null;
    this.firmaSeleccionada = null;
    this.posicionFirma = 'inferior-derecha';
    this.tamanoFirma = 100;
    this.nuevaFirmaCreada = null;
    this.intentoGuardar = false;
    this.errores = {};
    this.pdfCargado = false;
    this.totalPaginas = 0;
    this.firmaPosicionada = false;
    this.firmaPosX = 0;
    this.firmaPosY = 0;
    this.paginaFirmaPosicionada = 0;
    this.pdfDocument = null;
    this.pdfArrayBuffer = null;
    this.zoomLevel = 1.0;
    this.paginasRenderizadas = [];
    this.toastVisible = false;
  }

  // ==================== Manejo de archivo ====================

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.procesarArchivo(input.files[0]);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.procesarArchivo(event.dataTransfer.files[0]);
    }
  }

  private procesarArchivo(file: File): void {
    // Validar tipo de archivo - Solo PDF
    if (file.type !== 'application/pdf') {
      this.errores['archivo'] = 'Solo se permiten archivos PDF';
      return;
    }

    // Validar tamaño (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.errores['archivo'] = 'El archivo no debe superar los 10MB';
      return;
    }

    this.archivoSubido = file;
    this.nombreArchivo = file.name;
    this.tamanoArchivo = this.formatearTamano(file.size);
    delete this.errores['archivo'];

    // Resetear estado de firma posicionada
    this.firmaPosicionada = false;
    this.firmaPosX = 0;
    this.firmaPosY = 0;

    // Cargar el PDF para previsualización
    this.cargarPDF(file);
  }

  private formatearTamano(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  protected eliminarArchivo(): void {
    this.archivoSubido = null;
    this.nombreArchivo = '';
    this.tamanoArchivo = '';
    this.pdfCargado = false;
    this.totalPaginas = 0;
    this.firmaPosicionada = false;
    this.pdfDocument = null;
    this.pdfArrayBuffer = null;
  }

  // ==================== Carga y renderizado de PDF ====================

  private async cargarPDF(file: File): Promise<void> {
    // Solo cargar PDF en el navegador
    if (!this.isBrowser || !this.pdfjsLib) {
      console.warn('PDF.js no está disponible (probablemente en SSR)');
      return;
    }

    try {
      console.log('Cargando PDF:', file.name);
      this.pdfCargado = false;
      
      // Leer el archivo como ArrayBuffer
      this.pdfArrayBuffer = await file.arrayBuffer();
      console.log('ArrayBuffer cargado, tamaño:', this.pdfArrayBuffer.byteLength);
      
      // Cargar el PDF con pdfjs
      const loadingTask = this.pdfjsLib.getDocument({ data: this.pdfArrayBuffer });
      this.pdfDocument = await loadingTask.promise;
      console.log('PDF cargado, páginas:', this.pdfDocument.numPages);
      
      this.totalPaginas = this.pdfDocument.numPages;
      this.pdfCargado = true;
      console.log('pdfCargado establecido a true, esperando para renderizar...');
      
      // Esperar a que Angular actualice la vista y renderizar todas las páginas
      setTimeout(() => {
        console.log('Renderizando todas las páginas');
        this.renderizarTodasLasPaginas();
      }, 100);
    } catch (error) {
      console.error('Error al cargar PDF:', error);
      this.errores['archivo'] = 'Error al cargar el PDF';
      this.pdfCargado = false;
    }
  }

  private async renderizarTodasLasPaginas(): Promise<void> {
    if (!this.isBrowser || !this.pdfDocument) {
      console.warn('No se puede renderizar: PDF no disponible');
      return;
    }

    try {
      console.log('Renderizando todas las páginas con zoom:', this.zoomLevel);
      this.paginasRenderizadas = [];

      for (let i = 1; i <= this.totalPaginas; i++) {
        const page = await this.pdfDocument.getPage(i);
        
        // Crear canvas para esta página
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          console.error('No se pudo obtener contexto 2D para página', i);
          continue;
        }

        // Calcular escala base (máximo 800px de ancho)
        const viewport = page.getViewport({ scale: 1 });
        const maxWidth = 800;
        const baseScale = Math.min(maxWidth / viewport.width, 1.5);
        
        // Aplicar zoom adicional
        const finalScale = baseScale * this.zoomLevel;
        const scaledViewport = page.getViewport({ scale: finalScale });

        // Configurar dimensiones del canvas
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // Renderizar la página
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
          canvas: canvas,
        };

        await page.render(renderContext).promise;
        
        // Almacenar el canvas renderizado
        this.paginasRenderizadas.push({
          numero: i,
          canvas: canvas,
          width: scaledViewport.width,
          height: scaledViewport.height
        });
        
        console.log(`Página ${i} renderizada:`, scaledViewport.width, 'x', scaledViewport.height);
      }
      
      console.log('Todas las páginas renderizadas:', this.paginasRenderizadas.length);
      
      // Actualizar tamaño de la firma preview
      this.actualizarTamanoFirmaPreview();

      // Configurar event listeners después de renderizar
      setTimeout(() => {
        this.setupEventListeners();
      }, 100);
    } catch (error) {
      console.error('Error al renderizar páginas:', error);
    }
  }

  private actualizarTamanoFirmaPreview(): void {
    const baseWidth = 120;
    const baseHeight = 50;
    this.firmaWidthPreview = baseWidth * (this.tamanoFirma / 100) * this.zoomLevel;
    this.firmaHeightPreview = baseHeight * (this.tamanoFirma / 100) * this.zoomLevel;
  }

  protected actualizarTamanoFirma(): void {
    this.actualizarTamanoFirmaPreview();
  }

  // ==================== Control de Zoom ====================

  protected onWheel(event: WheelEvent): void {
    // Zoom con Ctrl + scroll del mouse
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.5, Math.min(2.0, this.zoomLevel + delta));
      if (newZoom !== this.zoomLevel) {
        this.zoomLevel = newZoom;
        this.onZoomChange();
      }
    }
  }

  protected onZoomChange(): void {
    this.actualizarTamanoFirmaPreview();
    this.renderizarTodasLasPaginas();
  }

  protected aumentarZoom(): void {
    if (this.zoomLevel < 2.0) {
      this.zoomLevel = Math.min(2.0, this.zoomLevel + 0.25);
      this.onZoomChange();
    }
  }

  protected disminuirZoom(): void {
    if (this.zoomLevel > 0.5) {
      this.zoomLevel = Math.max(0.5, this.zoomLevel - 0.25);
      this.onZoomChange();
    }
  }

  protected resetearZoom(): void {
    this.zoomLevel = 1.0;
    this.onZoomChange();
  }

  // ==================== Manejo de firma ====================

  protected onFirmaSeleccionada(): void {
    if (this.firmaSeleccionadaId) {
      this.firmaSeleccionada = this.firmasDisponibles.find(
        (f) => f.id === Number(this.firmaSeleccionadaId)
      ) || null;
      
      // Limpiar nueva firma creada si se selecciona una existente
      this.nuevaFirmaCreada = null;
      delete this.errores['firma'];
    } else {
      this.firmaSeleccionada = null;
    }
  }

  protected abrirModalNuevaFirma(): void {
    this.mostrarModalNuevaFirma = true;
  }

  protected cerrarModalNuevaFirma(): void {
    this.mostrarModalNuevaFirma = false;
  }

  protected onNuevaFirmaGuardada(data: FirmaFormData): void {
    // Crear un objeto Firma temporal con la nueva firma
    this.nuevaFirmaCreada = {
      id: Date.now(), // ID temporal
      nombre: data.nombre,
      cargo: data.cargo || undefined,
      imagenBase64: data.imagenBase64,
      fechaCreacion: new Date(),
      activo: true,
    };

    // Establecer como firma seleccionada
    this.firmaSeleccionada = this.nuevaFirmaCreada;
    this.firmaSeleccionadaId = null; // No es de la lista existente
    
    this.cerrarModalNuevaFirma();
    delete this.errores['firma'];
    
    // Actualizar tamaño preview
    this.actualizarTamanoFirmaPreview();

    // Aquí podrías llamar a un servicio para guardar la firma en la BD si lo deseas
    // this.firmaService.crearFirma(data).subscribe(...)
  }

  // ==================== Drag and Drop ====================

  protected onDragStartFirma(event: DragEvent): void {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', 'firma');
    }
  }

  protected onDragOverCanvas(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  protected onDropFirma(event: DragEvent, numeroPagina: number): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.firmaSeleccionada) {
      return;
    }

    // Obtener el elemento donde se hizo drop (el contenedor de la página)
    const dropTarget = event.currentTarget as HTMLElement;
    const rect = dropTarget.getBoundingClientRect();
    
    // Calcular posición relativa al contenedor específico
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Centrar la firma en la posición del mouse
    this.firmaPosX = x - (this.firmaWidthPreview / 2);
    this.firmaPosY = y - (this.firmaHeightPreview / 2);

    // Asegurar que la firma no se salga del canvas
    this.firmaPosX = Math.max(0, Math.min(this.firmaPosX, rect.width - this.firmaWidthPreview));
    this.firmaPosY = Math.max(0, Math.min(this.firmaPosY, rect.height - this.firmaHeightPreview));

    // Guardar la página donde se posicionó
    this.paginaFirmaPosicionada = numeroPagina;
    
    // Guardar dimensiones del canvas para los cálculos del PDF
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;

    this.firmaPosicionada = true;
    
    console.log('Firma posicionada en página', numeroPagina, 'en posición', this.firmaPosX, this.firmaPosY);
  }

  protected eliminarPosicionFirma(): void {
    this.firmaPosicionada = false;
    this.firmaPosX = 0;
    this.firmaPosY = 0;
    this.paginaFirmaPosicionada = 0;
  }

  // ==================== Validación y guardado ====================

  protected validarFormulario(): boolean {
    this.errores = {};

    if (!this.archivoSubido) {
      this.errores['archivo'] = 'Debe subir un documento';
    }

    if (!this.firmaSeleccionadaId && !this.nuevaFirmaCreada) {
      this.errores['firma'] = 'Debe seleccionar o crear una firma';
    }

    return Object.keys(this.errores).length === 0;
  }

  protected tieneError(campo: string): boolean {
    return this.intentoGuardar && !!this.errores[campo];
  }

  protected onFirmarDocumento(): void {
    this.intentoGuardar = true;

    if (!this.validarFormulario() || !this.archivoSubido || !this.firmaSeleccionada || !this.firmaPosicionada) {
      return;
    }

    const payload: DocumentoFirmadoData = {
      archivo: this.archivoSubido,
      firmaId: this.firmaSeleccionada.id,
      posicionX: this.firmaPosX,
      posicionY: this.firmaPosY,
      pagina: this.paginaFirmaPosicionada,
      tamano: this.tamanoFirma,
      firmaNombre: this.firmaSeleccionada.nombre,
      firmaCargo: this.firmaSeleccionada.cargo,
      firmaImagen: this.firmaSeleccionada.imagenBase64,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      soloGuardar: false,
    };

    // Procesar y descargar el documento firmado
    this.procesarYDescargarDocumentoFirmado(payload);
  }

  protected async onGuardarDocumento(): Promise<void> {
    this.intentoGuardar = true;

    if (!this.validarFormulario() || !this.archivoSubido || !this.firmaSeleccionada || !this.firmaPosicionada) {
      return;
    }

    try {
      // Procesar el PDF y obtener los bytes
      const pdfBytes = await this.generarPDFfirmado();

      const payload: DocumentoFirmadoData = {
        archivo: this.archivoSubido,
        firmaId: this.firmaSeleccionada.id,
        posicionX: this.firmaPosX,
        posicionY: this.firmaPosY,
        pagina: this.paginaFirmaPosicionada,
        tamano: this.tamanoFirma,
        firmaNombre: this.firmaSeleccionada.nombre,
        firmaCargo: this.firmaSeleccionada.cargo,
        firmaImagen: this.firmaSeleccionada.imagenBase64,
        canvasWidth: this.canvasWidth,
        canvasHeight: this.canvasHeight,
        pdfBytes: pdfBytes,
        soloGuardar: true,
      };

      // Emitir evento con el documento guardado
      this.firmarDocumento.emit(payload);

      // Cerrar modal tras guardar exitosamente
      this.resetearFormulario();
      this.cerrar.emit();
    } catch (error) {
      console.error('Error al guardar documento:', error);
      this.mostrarToast('Error al guardar el documento. Por favor, inténtelo de nuevo.', 'error');
    }
  }

  private async procesarYDescargarDocumentoFirmado(data: DocumentoFirmadoData): Promise<void> {
    try {
      // Si es PDF, modificar el PDF original
      if (data.archivo.type === 'application/pdf') {
        await this.firmarPDF(data);
      } else {
        this.mostrarToast('Solo se pueden firmar archivos PDF. Convierta su documento a PDF primero.', 'error');
        return;
      }

      this.mostrarToast('Documento firmado y descargado exitosamente');
    } catch (error) {
      console.error('Error al firmar documento:', error);
      this.mostrarToast('Error al firmar el documento. Por favor, inténtelo de nuevo.', 'error');
    }
  }

  private async generarPDFfirmado(): Promise<Uint8Array> {
    if (!this.archivoSubido || !this.firmaSeleccionada) {
      throw new Error('Falta archivo o firma');
    }

    const arrayBuffer = await this.archivoSubido.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    // Convertir la firma base64 a imagen
    let firmaImagen;
    if (this.firmaSeleccionada.imagenBase64.startsWith('data:image/png')) {
      firmaImagen = await pdfDoc.embedPng(this.firmaSeleccionada.imagenBase64);
    } else if (this.firmaSeleccionada.imagenBase64.startsWith('data:image/jpeg') || this.firmaSeleccionada.imagenBase64.startsWith('data:image/jpg')) {
      firmaImagen = await pdfDoc.embedJpg(this.firmaSeleccionada.imagenBase64);
    } else {
      firmaImagen = await pdfDoc.embedPng(this.firmaSeleccionada.imagenBase64);
    }

    const pages = pdfDoc.getPages();
    const page = pages[this.paginaFirmaPosicionada - 1];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    
    // Calcular dimensiones de la firma en el PDF
    const firmaWidth = 120 * (this.tamanoFirma / 100);
    const firmaHeight = 50 * (this.tamanoFirma / 100);
    
    // Convertir coordenadas del canvas a coordenadas del PDF
    const scaleX = pageWidth / this.canvasWidth;
    const scaleY = pageHeight / this.canvasHeight;
    
    const pdfX = this.firmaPosX * scaleX;
    const canvasY = this.firmaPosY;
    const pdfY = pageHeight - (canvasY * scaleY) - firmaHeight;

    // Dibujar la imagen de la firma
    page.drawImage(firmaImagen, {
      x: pdfX,
      y: pdfY,
      width: firmaWidth,
      height: firmaHeight,
    });

    // Agregar texto del nombre y cargo debajo de la firma (CENTRADO)
    const fontSize = 8 * (this.tamanoFirma / 100);
    const nombreWidth = this.firmaSeleccionada.nombre.length * fontSize * 0.5;
    const nombreX = pdfX + (firmaWidth - nombreWidth) / 2;
    
    page.drawText(this.firmaSeleccionada.nombre, {
      x: nombreX,
      y: pdfY - 12,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    if (this.firmaSeleccionada.cargo) {
      const cargoWidth = this.firmaSeleccionada.cargo.length * (fontSize - 1) * 0.5;
      const cargoX = pdfX + (firmaWidth - cargoWidth) / 2;
      
      page.drawText(this.firmaSeleccionada.cargo, {
        x: cargoX,
        y: pdfY - 22,
        size: fontSize - 1,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    // Guardar y retornar los bytes del PDF
    const pdfBytes = await pdfDoc.save();
    return new Uint8Array(pdfBytes);
  }

  private async firmarPDF(data: DocumentoFirmadoData): Promise<void> {
    try {
      // Generar el PDF firmado
      const pdfBytes = await this.generarPDFfirmado();
      
      // Crear blob y descargar
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const nombreArchivoSinExtension = data.archivo.name.replace(/\.[^/.]+$/, '');
      link.download = `${nombreArchivoSinExtension}_firmado.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error al procesar PDF:', error);
      throw error;
    }
  }

  protected mostrarToast(mensaje: string, tipo: 'success' | 'error' = 'success'): void {
    this.toastMensaje = mensaje;
    this.toastTipo = tipo;
    this.toastVisible = true;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.toastVisible = false;
    }, 4000);
  }

  protected ocultarToast(): void {
    this.toastVisible = false;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  protected onCloseClick(): void {
    this.ocultarToast();
    this.resetearFormulario();
    this.cerrar.emit();
  }
}
