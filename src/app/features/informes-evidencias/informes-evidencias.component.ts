import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { InformesEvidenciasService } from './services/informes-evidencias.service';
import {
  CambioPaginaEvent,
  PaginacionComponent,
  PaginacionConfig
} from '../../shared/components/paginacion/paginacion.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  InformeFormData,
  InformeFormModalComponent,
} from './components/informe-form-modal/informe-form-modal.component';
import { 
  DocumentoFirmadoData, 
  FirmarDocumentoModalComponent 
} from './components/firmar-documento-modal/firmar-documento-modal.component';
import { Firma } from './models/firma.model';
import { FirmasService } from './services/firmas.service';

interface InformeItem {
  id: string;
  titulo: string;
  fecha: string;
  cuerpoHtml: string;
  firma: string;
  usarMembrete: boolean;
  firmasAgregadas: string[];
  previewHtml: SafeHtml;
  pdfBytes?: Uint8Array; // Bytes del PDF firmado
  esPDFfirmado?: boolean; // Flag para distinguir PDFs firmados de informes creados
}

type ModoVisualizacion = 'lista' | 'iconos-medianos' | 'iconos-grandes';

const STORAGE_KEY_MODO_VISUALIZACION = 'informes_modo_visualizacion';

@Component({
  selector: 'app-informes-evidencias',
  standalone: true,
  imports: [CommonModule, PaginacionComponent, InformeFormModalComponent, FirmarDocumentoModalComponent],
  templateUrl: './informes-evidencias.component.html',
  styleUrls: ['./informes-evidencias.component.css']
})
export class InformesEvidenciasComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly opcionesPorPagina = [100, 500, 1000];

  protected informes: InformeItem[] = [];

  protected mostrarModal = false;
  protected informeSeleccionado: InformeFormData | null = null;

  // Modal de firmar documento
  protected mostrarModalFirmarDocumento = false;
  protected firmasDisponibles: Firma[] = [];
  protected archivoInicialFirma: File | null = null;

  // Modo de visualización
  protected modoVisualizacion: ModoVisualizacion = 'iconos-medianos';
  protected mostrarMenuVisualizacion = false;

  protected paginacion: PaginacionConfig = {
    paginaActual: 0,
    porPagina: 100,
    totalElementos: 0,
    totalPaginas: 0
  };
  
  constructor(
    private informesService: InformesEvidenciasService,
    private firmasService: FirmasService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.cargarModoVisualizacion();
    this.cargarFirmasDisponibles();
    this.recalcularPaginacion();
  }

  private cargarModoVisualizacion(): void {
    if (!this.isBrowser) {
      return;
    }

    const guardado = localStorage.getItem(STORAGE_KEY_MODO_VISUALIZACION);
    if (guardado && ['lista', 'iconos-medianos', 'iconos-grandes'].includes(guardado)) {
      this.modoVisualizacion = guardado as ModoVisualizacion;
    }
  }

  protected get informesPaginados(): InformeItem[] {
    const inicio = this.paginacion.paginaActual * this.paginacion.porPagina;
    const fin = inicio + this.paginacion.porPagina;
    return this.informes.slice(inicio, fin);
  }

  protected onCambioPagina(event: CambioPaginaEvent): void {
    this.paginacion.paginaActual = event.pagina;
    this.paginacion.porPagina = event.porPagina;
    this.recalcularPaginacion();
  }

  protected onCambioTamano(porPagina: number): void {
    this.paginacion.porPagina = porPagina;
    this.paginacion.paginaActual = 0;
    this.recalcularPaginacion();
  }

  protected nuevoInforme(): void {
    void this.informesService;
    this.informeSeleccionado = null;
    this.mostrarModal = true;
  }

  protected verInforme(informe: InformeItem): void {
    // Si es un PDF firmado, reabrir el modal de firmar documento con el PDF pre-cargado
    if (informe.esPDFfirmado && informe.pdfBytes) {
      const blob = new Blob([informe.pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      this.archivoInicialFirma = new File([blob], `${informe.titulo}.pdf`, { type: 'application/pdf' });
      this.mostrarModalFirmarDocumento = true;
    } else {
      // Para informes normales, abrir el modal de edición
      this.informeSeleccionado = {
        id: informe.id,
        titulo: informe.titulo,
        fecha: informe.fecha,
        cuerpoHtml: informe.cuerpoHtml,
        firma: informe.firma,
        usarMembrete: informe.usarMembrete,
        firmasAgregadas: informe.firmasAgregadas,
      };
      this.mostrarModal = true;
    }
  }

  protected descargarPDFfirmado(informe: InformeItem): void {
    if (!this.isBrowser || !informe.pdfBytes) {
      return;
    }

    const blob = new Blob([informe.pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${informe.titulo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  protected cerrarModal(): void {
    this.mostrarModal = false;
    this.informeSeleccionado = null;
  }

  // ==================== Modal de firmar documento ====================

  private cargarFirmasDisponibles(): void {
    this.firmasService.obtenerFirmas().subscribe({
      next: (firmas) => {
        this.firmasDisponibles = firmas;
      },
      error: () => {
        this.firmasDisponibles = [];
      }
    });
  }

  protected abrirModalFirmarDocumento(): void {
    this.archivoInicialFirma = null;
    this.mostrarModalFirmarDocumento = true;
  }

  protected cerrarModalFirmarDocumento(): void {
    this.mostrarModalFirmarDocumento = false;
    this.archivoInicialFirma = null;
  }

  protected onDocumentoFirmado(data: DocumentoFirmadoData): void {
    console.log('Documento firmado exitosamente:', {
      archivo: data.archivo.name,
      firma: data.firmaNombre,
      posicion: `X: ${data.posicionX}, Y: ${data.posicionY}`,
      pagina: data.pagina,
      tamano: data.tamano,
      soloGuardar: data.soloGuardar
    });
    
    // Si es solo guardar (sin descargar), crear un nuevo informe con el PDF firmado
    if (data.soloGuardar && data.pdfBytes) {
      const nombreArchivoOriginal = data.archivo.name.replace(/\.[^/.]+$/, '');
      const nombreArchivoFirmado = `${nombreArchivoOriginal}_firmado`;
      
      // Crear un nuevo informe con el documento firmado
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const fecha = `${yyyy}-${mm}-${dd}`;
      
      const nuevoId = String(this.nextId());
      
      // Generar preview desde el PDF usando PDF.js
      this.generarPreviewDesdePDF(data.pdfBytes).then(previewDataUrl => {
        const preview = this.sanitizer.bypassSecurityTrustHtml(`
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <img src="${previewDataUrl}" alt="Preview" style="width: 100%; height: auto; object-fit: contain;" />
          </div>
        `);
        
        this.informes.unshift({
          id: nuevoId,
          titulo: nombreArchivoFirmado,
          fecha: fecha,
          cuerpoHtml: '<p>Documento PDF firmado digitalmente</p>',
          firma: data.firmaNombre,
          usarMembrete: false,
          firmasAgregadas: [data.firmaNombre],
          previewHtml: preview,
          pdfBytes: data.pdfBytes,
          esPDFfirmado: true
        });
        
        this.recalcularPaginacion();
      }).catch(error => {
        console.error('Error al generar preview del PDF:', error);
        // Fallback: usar preview genérico
        const previewData = {
          titulo: nombreArchivoFirmado,
          fecha: fecha,
          cuerpoHtml: '<p>Documento PDF firmado digitalmente</p>',
          usarMembrete: false,
          firmasAgregadas: [data.firmaNombre]
        };
        const preview = this.sanitizer.bypassSecurityTrustHtml(this.buildPreviewHtml(previewData));
        
        this.informes.unshift({
          id: nuevoId,
          titulo: nombreArchivoFirmado,
          fecha: fecha,
          cuerpoHtml: previewData.cuerpoHtml,
          firma: data.firmaNombre,
          usarMembrete: false,
          firmasAgregadas: [data.firmaNombre],
          previewHtml: preview,
          pdfBytes: data.pdfBytes,
          esPDFfirmado: true
        });
        
        this.recalcularPaginacion();
      });
      
      return;
    }
    
    // Comportamiento anterior: buscar informe relacionado cuando se descarga
    const nombreArchivo = data.archivo.name.replace(/\.(pdf|PDF)$/, '').trim();
    const informeRelacionado = this.informes.find(inf => {
      const tituloNormalizado = inf.titulo.trim();
      return tituloNormalizado === nombreArchivo || 
             nombreArchivo.includes(tituloNormalizado) ||
             tituloNormalizado.includes(nombreArchivo);
    });

    // Si se encuentra un informe relacionado, actualizar con la firma
    if (informeRelacionado) {
      // Agregar la firma si no existe ya
      if (!informeRelacionado.firmasAgregadas.includes(data.firmaNombre)) {
        informeRelacionado.firmasAgregadas.push(data.firmaNombre);
        
        // Regenerar el preview con la nueva firma
        const updatedPreview = this.sanitizer.bypassSecurityTrustHtml(
          this.buildPreviewHtml({
            titulo: informeRelacionado.titulo,
            fecha: informeRelacionado.fecha,
            cuerpoHtml: informeRelacionado.cuerpoHtml,
            usarMembrete: informeRelacionado.usarMembrete,
            firmasAgregadas: informeRelacionado.firmasAgregadas
          })
        );
        
        informeRelacionado.previewHtml = updatedPreview;
        
        console.log(`Preview actualizado para informe "${informeRelacionado.titulo}" con firma de ${data.firmaNombre}`);
      }
    }
    
  }

  // ==================== Fin modal de firmar documento ====================

  protected cambiarModoVisualizacion(modo: ModoVisualizacion): void {
    this.modoVisualizacion = modo;
    this.mostrarMenuVisualizacion = false;
    if (!this.isBrowser) {
      return;
    }

    localStorage.setItem(STORAGE_KEY_MODO_VISUALIZACION, modo);
  }

  protected toggleMenuVisualizacion(): void {
    this.mostrarMenuVisualizacion = !this.mostrarMenuVisualizacion;
  }

  protected cerrarMenuVisualizacion(): void {
    this.mostrarMenuVisualizacion = false;
  }

  protected formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  }

  protected onGuardarInforme(data: InformeFormData): void {
    const preview = this.sanitizer.bypassSecurityTrustHtml(this.buildPreviewHtml(data));

    if (data.id) {
      const idx = this.informes.findIndex((i) => i.id === data.id);
      if (idx >= 0) {
        this.informes[idx] = {
          ...this.informes[idx],
          titulo: data.titulo,
          fecha: data.fecha,
          cuerpoHtml: data.cuerpoHtml,
          firma: data.firma,
          usarMembrete: data.usarMembrete ?? false,
          firmasAgregadas: data.firmasAgregadas ?? [],
          previewHtml: preview,
        };
      }
    } else {
      const id = String(this.nextId());
      this.informes.unshift({
        id,
        titulo: data.titulo,
        fecha: data.fecha,
        cuerpoHtml: data.cuerpoHtml,
        firma: data.firma,
        usarMembrete: data.usarMembrete ?? false,
        firmasAgregadas: data.firmasAgregadas ?? [],
        previewHtml: preview,
      });
    }

    this.cerrarModal();
    this.recalcularPaginacion();
  }

  private recalcularPaginacion(): void {
    this.paginacion.totalElementos = this.informes.length;
    this.paginacion.totalPaginas = Math.max(
      1,
      Math.ceil(this.paginacion.totalElementos / this.paginacion.porPagina)
    );

    if (this.paginacion.paginaActual > this.paginacion.totalPaginas - 1) {
      this.paginacion.paginaActual = Math.max(0, this.paginacion.totalPaginas - 1);
    }
  }



  private buildPreviewHtml(data: Pick<InformeFormData, 'titulo' | 'fecha' | 'cuerpoHtml' | 'usarMembrete' | 'firmasAgregadas'>): string {
    const titulo = this.escapeHtml((data.titulo || 'Informe').trim() || 'Informe');
    const fecha = this.escapeHtml(data.fecha || '');
    // Extraer solo texto plano del cuerpo HTML para la miniatura - aumentado a 350 caracteres
    const cuerpoTexto = this.stripHtml(data.cuerpoHtml || '').substring(0, 350);
    const usarMembrete = data.usarMembrete ?? false;
    const firmas = data.firmasAgregadas ?? [];

    // Construir HTML de firmas en miniatura
    const firmasHtml = this.buildMiniFirmasHtml(firmas);

    // Si tiene membrete, mostrar con fondo de imagen
    if (usarMembrete) {
      return `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 9px; line-height: 1.4; color: #111827; position: relative; min-height: 200px; background-image: url('/HojaMembretada.png'); background-size: cover; background-position: top center;">
          <div style="padding: 35px 8px 8px 8px;">
            <div style="font-size: 8px; color: #374151; overflow-wrap: break-word; max-height: 140px; overflow: hidden;">${cuerpoTexto}</div>
            ${firmasHtml}
          </div>
        </div>
      `;
    }

    // Sin membrete - formato normal
    return `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 9px; line-height: 1.4; color: #111827;">
        <div style="display:flex; justify-content: space-between; align-items:flex-start; gap: 4px;">
          <div style="font-weight: 700; font-size: 10px; letter-spacing: .02em; color:#10b981;">AYNI</div>
          <div style="text-align:right; font-size: 7px; color:#6b7280;">${fecha}</div>
        </div>
        <div style="margin-top: 4px; font-size: 9px; font-weight: 600; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${titulo}</div>
        <hr style="margin: 4px 0; border: 0; border-top: 1px solid #e5e7eb;"/>
        <div style="font-size: 8px; color: #374151; overflow-wrap: break-word; max-height: 140px; overflow: hidden;">${cuerpoTexto}</div>
        ${firmasHtml}
      </div>
    `;
  }

  /**
   * Construye HTML simplificado de firmas para la miniatura
   */
  private buildMiniFirmasHtml(firmas: string[]): string {
    if (!firmas || firmas.length === 0) {
      return '';
    }

    const firmasItems = firmas.slice(0, 3).map((nombre) => {
      return `
        <div style="text-align: center; flex: 1; min-width: 40px;">
          <div style="height: 12px; border-bottom: 1px solid #6b7280;"></div>
          <div style="font-size: 6px; color: #6b7280; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(nombre)}</div>
        </div>
      `;
    });

    return `
      <div style="margin-top: 8px; display: flex; gap: 6px; justify-content: center;">
        ${firmasItems.join('')}
      </div>
    `;
  }

  /**
   * Elimina etiquetas HTML y retorna solo texto plano
   */
  private stripHtml(html: string): string {
    if (!this.isBrowser) {
      return String(html || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  private escapeHtml(value: string): string {
    return (value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  private async generarPreviewDesdePDF(pdfBytes: Uint8Array): Promise<string> {
    if (!this.isBrowser) {
      throw new Error('La previsualizacion de PDF solo esta disponible en el navegador');
    }

    try {
      // Importar PDF.js dinámicamente
      const pdfjs = await import('pdfjs-dist');
      
      // Configurar worker
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url
      ).toString();

      // Cargar el PDF
      const loadingTask = pdfjs.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;
      
      // Obtener la primera página
      const page = await pdf.getPage(1);
      
      // Configurar el viewport para el preview (escala reducida)
      const viewport = page.getViewport({ scale: 0.5 });
      
      // Crear canvas para renderizar
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo obtener contexto del canvas');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Renderizar la página en el canvas
      await page.render({
        canvas: canvas,
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convertir canvas a data URL
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error al generar preview desde PDF:', error);
      throw error;
    }
  }

  private nextId(): number {
    const max = this.informes.reduce((acc, item) => {
      const n = Number(item.id);
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 0);
    return max + 1;
  }
}
