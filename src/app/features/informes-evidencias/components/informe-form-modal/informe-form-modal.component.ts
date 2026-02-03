import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  PLATFORM_ID,
  Output,
  SimpleChanges,
  ViewChild,
  ViewChildren,
  QueryList,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ModalDismissDirective } from '../../../../shared/directives/modal-dismiss.directive';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { WatermarkService } from '../../services/watermark.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { FirmaFormModalComponent, FirmaFormData } from '../firma-form-modal/firma-form-modal.component';
import { FirmasService } from '../../services/firmas.service';
import { Firma } from '../../models/firma.model';

export interface InformeFormData {
  id?: string;
  titulo: string;
  fecha: string; // yyyy-mm-dd
  cuerpoHtml: string;
  firma: string;
  usarMembrete?: boolean;
  firmasAgregadas?: string[];
}

@Component({
  selector: 'app-informe-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalDismissDirective, CKEditorModule, FirmaFormModalComponent],
  templateUrl: './informe-form-modal.component.html',
  styleUrls: ['./informe-form-modal.component.css'],
})
export class InformeFormModalComponent implements OnChanges, OnInit {
  @Input() visible = false;
  @Input() informe: InformeFormData | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<InformeFormData>();

  protected form: InformeFormData = {
    titulo: '',
    fecha: '',
    cuerpoHtml: '',
    firma: 'Todas las Firmas',
  };

  // Control de validación
  protected intentoGuardar = false;
  protected errores: { [key: string]: string } = {};
  Object = Object;  // Para usar en el template

  protected previewHtml: SafeHtml = '';
  protected previewPages: SafeHtml[] = [];
  private previewHtmlRaw = '';

  protected zoom = 0.6;
  protected readonly zoomMin = 0.5;
  protected readonly zoomMax = 2;

  // Pan/drag state
  protected isPanning = false;
  protected panStartX = 0;
  protected panStartY = 0;
  protected scrollLeft = 0;
  protected scrollTop = 0;

  // Firmas añadidas
  protected firmasAgregadas: string[] = [];

  // Ancho base A4 a ~96dpi (794px) para la previsualización sin recortes horizontales.
  protected readonly previewBaseWidthPx = 794;

  protected get previewScaledWidthPx(): number {
    return Math.round(this.previewBaseWidthPx * (this.zoom || 1));
  }

  public Editor: any;

  protected ckeditorConfig: any = {};

  protected readonly isBrowser: boolean;

  protected exportandoPdf = false;

  // Controla si se muestra la marca de agua (solo en edición, no en exportación)
  private mostrarWatermark = true;

  protected usarMembrete = false;
  // Servido desde public/: accesible como /HojaMembretada.png
  protected membreteUri: string | null = '/HojaMembretada.png';

  @ViewChild('paginationHost', { static: false })
  private paginationHostRef?: ElementRef<HTMLElement>;

  @ViewChildren('exportPage')
  private exportPageRefs?: QueryList<ElementRef<HTMLElement>>;

  // Firmas disponibles (cargadas del backend/servicio)
  protected firmasDisponibles: Firma[] = [];
  protected opcionesFirma: string[] = ['Firma 1', 'Firma 2', 'Firma 3'];

  // Modal de nueva firma
  protected mostrarModalFirma = false;
  protected firmaParaEditar: Firma | null = null;

  constructor(
    private sanitizer: DomSanitizer,
    private watermarkService: WatermarkService,
    private pdfExportService: PdfExportService,
    private firmasService: FirmasService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Cargar firmas disponibles
    this.cargarFirmas();

    if (this.isBrowser) {
      import('ckeditor5').then(({
        ClassicEditor,
        Bold,
        Essentials,
        FontBackgroundColor,
        FontColor,
        FontSize,
        Heading,
        Highlight,
        Indent,
        IndentBlock,
        Italic,
        Link,
        List,
        MediaEmbed,
        Paragraph,
        Table,
        Undo,
      }) => {
        this.Editor = ClassicEditor;
        this.ckeditorConfig = {
          licenseKey: 'GPL',
          toolbar: [
            'undo',
            'redo',
            '|',
            'heading',
            '|',
            'fontSize',
            'fontColor',
            'fontBackgroundColor',
            '|',
            'bold',
            'italic',
            'highlight',
            '|',
            'link',
            'insertTable',
            'mediaEmbed',
            '|',
            'bulletedList',
            'numberedList',
            'indent',
            'outdent',
          ],
          plugins: [
            Bold,
            Essentials,
            FontBackgroundColor,
            FontColor,
            FontSize,
            Heading,
            Highlight,
            Indent,
            IndentBlock,
            Italic,
            Link,
            List,
            MediaEmbed,
            Paragraph,
            Table,
            Undo,
          ],
        };
        this.cdr.detectChanges();
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] || changes['informe']) {
      this.hidratarFormulario();
      this.actualizarPreview();
      this.intentoGuardar = false;
      this.errores = {};
    }
  }

  protected onCloseClick(): void {
    this.intentoGuardar = false;
    this.errores = {};
    this.cerrar.emit();
  }

  protected onGuardar(): void {
    this.intentoGuardar = true;
    
    if (!this.validarFormulario()) return;

    const payload: InformeFormData = {
      id: this.form.id,
      titulo: (this.form.titulo || '').trim(),
      fecha: this.form.fecha || '',
      cuerpoHtml: this.form.cuerpoHtml || '',
      firma: this.form.firma || 'Todas las Firmas',
      usarMembrete: this.usarMembrete,
      firmasAgregadas: [...this.firmasAgregadas],
    };

    this.guardar.emit(payload);
  }

  protected validarFormulario(): boolean {
    this.errores = {};

    if (!(this.form.titulo || '').trim()) {
      this.errores['titulo'] = 'El título del informe es requerido';
    }
    if (!this.form.fecha) {
      this.errores['fecha'] = 'La fecha es requerida';
    }
    if (!(this.form.cuerpoHtml || '').trim()) {
      this.errores['cuerpoHtml'] = 'El contenido del informe es requerido';
    }

    return Object.keys(this.errores).length === 0;
  }

  protected tieneError(campo: string): boolean {
    return this.intentoGuardar && !!this.errores[campo];
  }

  protected setZoom(value: number): void {
    this.zoom = Math.max(this.zoomMin, Math.min(this.zoomMax, value));
  }

  protected onPanStart(event: MouseEvent, container: HTMLElement): void {
    if (event.button === 0 || event.type === 'mousedown') {
      this.isPanning = true;
      this.panStartX = event.clientX;
      this.panStartY = event.clientY;
      this.scrollLeft = container.scrollLeft;
      this.scrollTop = container.scrollTop;
      container.style.cursor = 'grabbing';
    }
  }

  protected onPanMove(event: MouseEvent, container: HTMLElement): void {
    if (!this.isPanning) return;
    event.preventDefault();
    const dx = event.clientX - this.panStartX;
    const dy = event.clientY - this.panStartY;
    container.scrollLeft = this.scrollLeft - dx;
    container.scrollTop = this.scrollTop - dy;
  }

  protected onPanEnd(container: HTMLElement): void {
    this.isPanning = false;
    container.style.cursor = 'grab';
  }

  protected onKeyDown(event: KeyboardEvent, container: HTMLElement): void {
    // Pan con Space
    if (event.code === 'Space' && !this.isPanning) {
      event.preventDefault();
      container.style.cursor = 'grab';
    }
  }

  protected onWheel(event: WheelEvent): void {
    // Zoom con Ctrl + scroll del mouse
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      this.zoom = Math.max(this.zoomMin, Math.min(this.zoomMax, this.zoom + delta));
    }
  }

  // ==================== GESTIÓN DE FIRMAS ====================

  private cargarFirmas(): void {
    this.firmasService.obtenerFirmas().subscribe({
      next: (firmas) => {
        this.firmasDisponibles = firmas;
        this.actualizarOpcionesFirma();
      },
      error: (err) => {
        console.error('Error al cargar firmas:', err);
      },
    });
  }

  private actualizarOpcionesFirma(): void {
    // Combinar firmas por defecto con las personalizadas
    const firmasPorDefecto = ['Firma 1', 'Firma 2', 'Firma 3'];
    const firmasPersonalizadas = this.firmasDisponibles.map((f) => f.nombre);
    this.opcionesFirma = [...firmasPorDefecto, ...firmasPersonalizadas];
  }

  protected abrirModalNuevaFirma(): void {
    this.firmaParaEditar = null;
    this.mostrarModalFirma = true;
  }

  protected cerrarModalFirma(): void {
    this.mostrarModalFirma = false;
    this.firmaParaEditar = null;
  }

  protected onGuardarFirma(data: FirmaFormData): void {
    if (data.id) {
      // Actualizar firma existente
      this.firmasService.actualizarFirma(data.id, {
        nombre: data.nombre,
        cargo: data.cargo,
        imagenBase64: data.imagenBase64,
      }).subscribe({
        next: () => {
          this.cargarFirmas();
          this.cerrarModalFirma();
        },
        error: (err) => {
          console.error('Error al actualizar firma:', err);
        },
      });
    } else {
      // Crear nueva firma
      this.firmasService.crearFirma({
        nombre: data.nombre,
        cargo: data.cargo,
        imagenBase64: data.imagenBase64,
      }).subscribe({
        next: (response) => {
          this.cargarFirmas();
          // Seleccionar automáticamente la nueva firma
          this.form.firma = response.firma.nombre;
          this.cerrarModalFirma();
        },
        error: (err) => {
          console.error('Error al crear firma:', err);
        },
      });
    }
  }

  /**
   * Obtiene la firma completa por nombre
   */
  protected obtenerFirma(nombreFirma: string): Firma | null {
    return this.firmasDisponibles.find((f) => f.nombre === nombreFirma) || null;
  }

  protected obtenerFirmaImagen(nombreFirma: string): string | null {
    const firma = this.firmasDisponibles.find((f) => f.nombre === nombreFirma);
    return firma?.imagenBase64 || null;
  }

  protected agregarFirma(): void {
    if (this.firmasAgregadas.length >= 3) {
      return; // Máximo 3 firmas
    }
    const firmaLabel = this.form.firma || 'Firma 1';
    if (!this.firmasAgregadas.includes(firmaLabel)) {
      this.firmasAgregadas.push(firmaLabel);
      this.actualizarPreview();
    }
  }

  protected eliminarFirma(index: number): void {
    this.firmasAgregadas.splice(index, 1);
    this.actualizarPreview();
  }

  protected toggleMembrete(): void {
    this.usarMembrete = !this.usarMembrete;
    this.actualizarPreview();
  }

  protected async descargarPdf(): Promise<void> {
    const titulo = (this.form.titulo || 'informe').trim() || 'informe';
    await this.exportarPdf({ action: 'download', fileName: `${titulo}.pdf` });
  }

  protected async imprimirPdf(): Promise<void> {
    await this.exportarPdf({ action: 'print' });
  }

  private async exportarPdf(options: { action: 'download' | 'print'; fileName?: string }): Promise<void> {
    if (this.exportandoPdf) return;

    this.exportandoPdf = true;
    try {
      // Ocultar marca de agua para la exportación
      this.mostrarWatermark = false;
      this.actualizarPreview();
      this.cdr.detectChanges();

      // Esperar un tick para que Angular actualice las páginas de exportación
      await new Promise(resolve => setTimeout(resolve, 50));

      const pages = this.exportPageRefs?.toArray().map((r) => r.nativeElement) ?? [];
      if (!pages.length) {
        this.mostrarWatermark = true;
        this.actualizarPreview();
        return;
      }

      await this.pdfExportService.exportToPdf(pages, {
        action: options.action,
        fileName: options.fileName,
        scale: 2,
        imageQuality: 1,
      });
    } finally {
      // Restaurar marca de agua después de exportar
      this.mostrarWatermark = true;
      this.actualizarPreview();
      this.exportandoPdf = false;
    }
  }

  private hidratarFormulario(): void {
    if (!this.visible) return;

    if (this.informe) {
      this.form = {
        id: this.informe.id,
        titulo: this.informe.titulo ?? '',
        fecha: this.informe.fecha ?? '',
        cuerpoHtml: this.informe.cuerpoHtml ?? '',
        firma: this.informe.firma ?? 'Todas las Firmas',
      };
      // Restaurar membretado y firmas agregadas
      this.usarMembrete = this.informe.usarMembrete ?? false;
      this.firmasAgregadas = this.informe.firmasAgregadas ? [...this.informe.firmasAgregadas] : [];
      return;
    }

    this.form = {
      titulo: '',
      fecha: '',
      cuerpoHtml: '<p>Escribe aquí el contenido del informe...</p>',
      firma: 'Todas las Firmas',
    };
    // Resetear membretado y firmas para nuevo informe
    this.usarMembrete = false;
    this.firmasAgregadas = [];
  }

  protected actualizarPreview(): void {
    const html = this.buildPreviewHtml();
    this.previewHtmlRaw = html;
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(html);

    // Genera páginas A4 con márgenes y saltos reales.
    const pages = this.paginarCuerpoA4(this.form.cuerpoHtml || '');
    this.previewPages = pages.map((p) => this.sanitizer.bypassSecurityTrustHtml(p));
  }

  private buildPreviewHtml(): string {
    const titulo = this.escapeHtml((this.form.titulo || 'Informe').trim() || 'Informe');
    const fecha = this.escapeHtml(this.form.fecha || '');
    const cuerpo = this.form.cuerpoHtml || '';

    return `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 12px; line-height: 1.5; color: #111827;">
        <div style="display:flex; justify-content: space-between; align-items:flex-start; gap: 12px;">
          <div style="font-weight: 700; letter-spacing: .02em; color:#10b981;">AYNI</div>
          <div style="text-align:right; font-size: 11px; color:#6b7280;">${fecha}</div>
        </div>
        <div style="margin-top: 10px; font-size: 14px; font-weight: 700;">${titulo}</div>
        <hr style="margin: 10px 0; border: 0; border-top: 1px solid #e5e7eb;"/>
        <div>${cuerpo}</div>
      </div>
    `;
  }

  private paginarCuerpoA4(cuerpoHtml: string): string[] {
    // Si no hay host para medir (SSR o aún no renderizado), fallback a 1 página.
    const host = this.paginationHostRef?.nativeElement;
    if (!host) {
      return [this.buildPageHtml(cuerpoHtml)];
    }

    // Limpia el host (offscreen).
    host.innerHTML = '';

    // Config A4 en px (96dpi aprox) con márgenes.
    const pageWidthPx = 794;
    const pageHeightPx = 1123;
    const paddingPx = 48; // ~0.5in
    const letterhead = this.usarMembrete && this.membreteUri;

    // Arma una página de medición.
    const pageEl = document.createElement('div');
    pageEl.style.width = `${pageWidthPx}px`;
    pageEl.style.height = `${pageHeightPx}px`;
    pageEl.style.padding = `${paddingPx}px`;
    pageEl.style.boxSizing = 'border-box';
    pageEl.style.background = '#ffffff';

    // Si hay membrete, agregar margen superior y padding horizontal
    if (letterhead) {
      pageEl.style.marginTop = '120px';
      pageEl.style.paddingLeft = '80px';
      pageEl.style.paddingRight = '80px';
    }

    const headerEl = document.createElement('div');
    // Solo mostrar header si no hay membrete
    if (!letterhead) {
      headerEl.innerHTML = this.buildHeaderHtml();
    }

    const hr = document.createElement('hr');
    hr.style.margin = '10px 0';
    hr.style.border = '0';
    hr.style.borderTop = '1px solid #e5e7eb';

    const bodyEl = document.createElement('div');
    bodyEl.style.overflow = 'hidden';

    pageEl.appendChild(headerEl);
    pageEl.appendChild(hr);
    pageEl.appendChild(bodyEl);
    host.appendChild(pageEl);

    const available = pageEl.clientHeight - headerEl.offsetHeight - hr.offsetHeight;
    bodyEl.style.height = `${Math.max(1, available)}px`;

    // Parse del cuerpo a nodos.
    const tmp = document.createElement('div');
    tmp.innerHTML = cuerpoHtml || '';
    const nodes = Array.from(tmp.childNodes).filter((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        return (n.textContent || '').trim().length > 0;
      }
      return true;
    });

    const pageBodies: string[] = [];
    bodyEl.innerHTML = '';

    const flushPage = () => {
      pageBodies.push(bodyEl.innerHTML);
      bodyEl.innerHTML = '';
    };

    for (const node of nodes) {
      const clone = node.cloneNode(true) as Node;
      bodyEl.appendChild(clone);

      // Si overflow, el último no cabe: mover a nueva página.
      if (bodyEl.scrollHeight > bodyEl.clientHeight + 1) {
        bodyEl.removeChild(clone);

        // Si la página está vacía y aún así no cabe, lo forzamos para evitar loops.
        if ((bodyEl.innerHTML || '').trim().length === 0) {
          bodyEl.appendChild(clone);
          flushPage();
          continue;
        }

        flushPage();
        bodyEl.appendChild(clone);

        // Si aún overflow, forzar.
        if (bodyEl.scrollHeight > bodyEl.clientHeight + 1) {
          flushPage();
        }
      }
    }

    if ((bodyEl.innerHTML || '').trim().length > 0 || pageBodies.length === 0) {
      flushPage();
    }

    // Build final pages (header repetido + body por página).
    return pageBodies.map((b) => this.buildPageHtml(b));
  }

  private buildHeaderHtml(): string {
    const titulo = this.escapeHtml((this.form.titulo || 'Informe').trim() || 'Informe');
    const fecha = this.escapeHtml(this.form.fecha || '');

    return `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color: #111827;">
        <div style="display:flex; justify-content: space-between; align-items:flex-start; gap: 12px;">
          <div style="font-weight: 700; letter-spacing: .02em; color:#10b981;">AYNI</div>
          <div style="text-align:right; font-size: 11px; color:#6b7280;">${fecha}</div>
        </div>
        <div style="margin-top: 10px; font-size: 14px; font-weight: 700; color:#111827;">${titulo}</div>
      </div>
    `;
  }

  private buildPageHtml(bodyHtml: string): string {
    // Solo mostrar watermark si está habilitado (durante edición, no exportación)
    const watermarkUri = this.mostrarWatermark ? this.watermarkService.getWatermarkDataUri() : null;
    const letterhead = this.usarMembrete && this.membreteUri ? this.membreteUri : null;
    
    // Solo watermark en el HTML interno (el membrete se aplica al contenedor en el template)
    let backgroundStyles = '';
    if (watermarkUri) {
      backgroundStyles = `background-image: url('${watermarkUri}'); background-repeat: repeat; background-size: 400px 400px; background-position: center center;`;
    }

    // Estilos para preservar formato de CKEditor
    const editorStyles = `
      <style>
        * { box-sizing: border-box; }
        p, div, span, td, th, li { word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; }
      </style>
    `;

    // Construir HTML de firmas con imagen, nombre y cargo
    const firmasHtml = this.buildFirmasHtml();

    // Si hay membrete, omitir el header y ajustar margen superior
    if (letterhead) {
      return `
        ${editorStyles}
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 12px; line-height: 1.5; color: #111827; ${backgroundStyles} position: relative; width: 100%; height: 100%; word-wrap: break-word; overflow-wrap: break-word;">
          <div style="position: relative; z-index: 1; margin-top: 120px; padding: 0 80px; word-wrap: break-word; overflow-wrap: break-word;">
            <div style="word-wrap: break-word; overflow-wrap: break-word; word-break: break-word;">${bodyHtml}</div>
            ${firmasHtml}
          </div>
        </div>
      `;
    }

    // Sin membrete, mostrar header completo
    const header = this.buildHeaderHtml();
    return `
      ${editorStyles}
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 12px; line-height: 1.5; color: #111827; ${backgroundStyles} position: relative; width: 100%; height: 100%; word-wrap: break-word; overflow-wrap: break-word;">
        <div style="position: relative; z-index: 1;">
          ${header}
          <hr style="margin: 10px 0; border: 0; border-top: 1px solid #e5e7eb;"/>
          <div style="word-wrap: break-word; overflow-wrap: break-word; word-break: break-word;">${bodyHtml}</div>
          ${firmasHtml}
        </div>
      </div>
    `;
  }

  /**
   * Construye el HTML de las firmas para el PDF
   * Incluye imagen de firma, nombre y cargo si están disponibles
   */
  private buildFirmasHtml(): string {
    if (this.firmasAgregadas.length === 0) {
      return '';
    }

    const firmasItems = this.firmasAgregadas.map((nombreFirma) => {
      const firma = this.obtenerFirma(nombreFirma);
      
      if (firma && firma.imagenBase64) {
        // Firma personalizada con imagen
        const cargoHtml = firma.cargo 
          ? `<div style="font-size: 10px; color: #6b7280; margin-top: 2px;">${this.escapeHtml(firma.cargo)}</div>`
          : '';
        
        return `
          <div style="text-align: center; min-width: 180px;">
            <img src="${firma.imagenBase64}" alt="Firma" style="max-height: 60px; max-width: 150px; margin: 0 auto 8px auto; display: block;" />
            <div style="border-top: 1px solid #111827; padding-top: 8px;">
              <div style="font-size: 11px; font-weight: 600;">${this.escapeHtml(firma.nombre)}</div>
              ${cargoHtml}
            </div>
          </div>
        `;
      } else {
        // Firma por defecto (solo línea y nombre)
        return `
          <div style="text-align: center; min-width: 150px;">
            <div style="height: 60px;"></div>
            <div style="border-top: 1px solid #111827; padding-top: 8px; font-size: 11px;">
              ${this.escapeHtml(nombreFirma)}
            </div>
          </div>
        `;
      }
    });

    return `
      <div style="margin-top: 60px; display: flex; justify-content: center; gap: 60px; flex-wrap: wrap;">
        ${firmasItems.join('')}
      </div>
    `;
  }

  private escapeHtml(value: string): string {
    return (value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
