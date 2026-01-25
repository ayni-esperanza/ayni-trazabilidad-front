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

export interface InformeFormData {
  id?: string;
  titulo: string;
  fecha: string; // yyyy-mm-dd
  cuerpoHtml: string;
  firma: string;
}

@Component({
  selector: 'app-informe-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalDismissDirective, CKEditorModule],
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

  protected previewHtml: SafeHtml = '';
  protected previewPages: SafeHtml[] = [];
  private previewHtmlRaw = '';

  protected zoom = 1;
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

  protected usarMembrete = false;
  // Servido desde public/: accesible como /HojaMembretada.png
  protected membreteUri: string | null = '/HojaMembretada.png';

  @ViewChild('paginationHost', { static: false })
  private paginationHostRef?: ElementRef<HTMLElement>;

  @ViewChildren('exportPage')
  private exportPageRefs?: QueryList<ElementRef<HTMLElement>>;

  protected readonly opcionesFirma: string[] = ['Firma 1', 'Firma 2', 'Firma 3'];

  constructor(
    private sanitizer: DomSanitizer,
    private watermarkService: WatermarkService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
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
    }
  }

  protected onCloseClick(): void {
    this.cerrar.emit();
  }

  protected onGuardar(): void {
    const payload: InformeFormData = {
      id: this.form.id,
      titulo: (this.form.titulo || '').trim(),
      fecha: this.form.fecha || '',
      cuerpoHtml: this.form.cuerpoHtml || '',
      firma: this.form.firma || 'Todas las Firmas',
    };

    if (!payload.titulo || !payload.fecha) return;

    this.guardar.emit(payload);
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

    const pages = this.exportPageRefs?.toArray().map((r) => r.nativeElement) ?? [];
    if (!pages.length) return;

    this.exportandoPdf = true;
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Export por páginas A4 reales: captura cada hoja por separado.
      // Optimizado: scale reducido a 1.5 y JPEG con calidad 0.85 para menor peso
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        const canvas = await html2canvas(pageEl, {
          backgroundColor: '#ffffff',
          scale: 1.5,
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      if (options.action === 'download') {
        pdf.save(options.fileName || 'informe.pdf');
        return;
      }

      // Imprimir: usa un iframe oculto para evitar popup blockers.
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            URL.revokeObjectURL(url);
            iframe.remove();
          }, 1000);
        }
      };
    } finally {
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
      return;
    }

    this.form = {
      titulo: '',
      fecha: '',
      cuerpoHtml: '<p>Escribe aquí el contenido del informe...</p>',
      firma: 'Todas las Firmas',
    };
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
    const watermarkUri = this.watermarkService.getWatermarkDataUri();
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
        [style*="font-size"] { font-size: inherit !important; }
        [style*="color"] { color: inherit !important; }
        [style*="background-color"] { background-color: inherit !important; }
      </style>
    `;

    // Si hay membrete, omitir el header y ajustar margen superior
    if (letterhead) {
      const firmasHtml = this.firmasAgregadas.length > 0
        ? `<div style="margin-top: 60px; display: flex; justify-content: center; gap: 60px; flex-wrap: wrap;">
             ${this.firmasAgregadas.map(f => `<div style="text-align: center; min-width: 150px;"><div style="border-top: 1px solid #111827; padding-top: 8px; font-size: 11px;">${this.escapeHtml(f)}</div></div>`).join('')}
           </div>`
        : '';
      return `
        ${editorStyles}
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 12px; line-height: 1.5; color: #111827; ${backgroundStyles} position: relative; width: 100%; height: 100%;">
          <div style="position: relative; z-index: 1; margin-top: 120px; padding: 0 80px;">
            <div>${bodyHtml}</div>
            ${firmasHtml}
          </div>
        </div>
      `;
    }

    // Sin membrete, mostrar header completo
    const header = this.buildHeaderHtml();
    const firmasHtml = this.firmasAgregadas.length > 0
      ? `<div style="margin-top: 60px; display: flex; justify-content: center; gap: 60px; flex-wrap: wrap;">
           ${this.firmasAgregadas.map(f => `<div style="text-align: center; min-width: 150px;"><div style="border-top: 1px solid #111827; padding-top: 8px; font-size: 11px;">${this.escapeHtml(f)}</div></div>`).join('')}
         </div>`
      : '';
    return `
      ${editorStyles}
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 12px; line-height: 1.5; color: #111827; ${backgroundStyles} position: relative; width: 100%; height: 100%;">
        <div style="position: relative; z-index: 1;">
          ${header}
          <hr style="margin: 10px 0; border: 0; border-top: 1px solid #e5e7eb;"/>
          <div>${bodyHtml}</div>
          ${firmasHtml}
        </div>
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
