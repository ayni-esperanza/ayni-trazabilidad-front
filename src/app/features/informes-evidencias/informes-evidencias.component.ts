import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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

interface InformeItem {
  id: string;
  titulo: string;
  fecha: string;
  cuerpoHtml: string;
  firma: string;
  usarMembrete: boolean;
  firmasAgregadas: string[];
  previewHtml: SafeHtml;
}

@Component({
  selector: 'app-informes-evidencias',
  standalone: true,
  imports: [CommonModule, PaginacionComponent, InformeFormModalComponent],
  templateUrl: './informes-evidencias.component.html',
  styleUrls: ['./informes-evidencias.component.css']
})
export class InformesEvidenciasComponent implements OnInit {

  protected readonly opcionesPorPagina = [100, 500, 1000];

  protected informes: InformeItem[] = [];

  protected mostrarModal = false;
  protected informeSeleccionado: InformeFormData | null = null;

  protected paginacion: PaginacionConfig = {
    paginaActual: 0,
    porPagina: 10,
    totalElementos: 0,
    totalPaginas: 0
  };
  
  constructor(
    private informesService: InformesEvidenciasService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.seedMock();
    this.recalcularPaginacion();
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

  protected cerrarModal(): void {
    this.mostrarModal = false;
    this.informeSeleccionado = null;
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

  private seedMock(): void {
    if (this.informes.length) return;

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const fecha = `${yyyy}-${mm}-${dd}`;

    this.informes = Array.from({ length: 10 }, (_, index) => {
      const id = String(index + 1);
      const data: InformeFormData = {
        id,
        titulo: `Informe de Entrega - ${String(index + 1).padStart(3, '0')}`,
        fecha,
        cuerpoHtml: '<p>Contenido de ejemplo del informe...</p>',
        firma: 'Todas las Firmas',
        usarMembrete: false,
        firmasAgregadas: [],
      };

      return {
        id,
        titulo: data.titulo,
        fecha: data.fecha,
        cuerpoHtml: data.cuerpoHtml,
        firma: data.firma,
        usarMembrete: data.usarMembrete ?? false,
        firmasAgregadas: data.firmasAgregadas ?? [],
        previewHtml: this.sanitizer.bypassSecurityTrustHtml(this.buildPreviewHtml(data)),
      };
    });
  }

  private buildPreviewHtml(data: Pick<InformeFormData, 'titulo' | 'fecha' | 'cuerpoHtml' | 'usarMembrete' | 'firmasAgregadas'>): string {
    const titulo = this.escapeHtml((data.titulo || 'Informe').trim() || 'Informe');
    const fecha = this.escapeHtml(data.fecha || '');
    // Extraer solo texto plano del cuerpo HTML para la miniatura
    const cuerpoTexto = this.stripHtml(data.cuerpoHtml || '').substring(0, 100);
    const usarMembrete = data.usarMembrete ?? false;
    const firmas = data.firmasAgregadas ?? [];

    // Construir HTML de firmas en miniatura
    const firmasHtml = this.buildMiniFirmasHtml(firmas);

    // Si tiene membrete, mostrar con fondo de imagen
    if (usarMembrete) {
      return `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 9px; line-height: 1.3; color: #111827; position: relative; min-height: 120px; background-image: url('/HojaMembretada.png'); background-size: cover; background-position: top center;">
          <div style="padding: 35px 8px 8px 8px;">
            <div style="font-size: 8px; color: #374151; overflow: hidden; text-overflow: ellipsis;">${cuerpoTexto}</div>
            ${firmasHtml}
          </div>
        </div>
      `;
    }

    // Sin membrete - formato normal
    return `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 9px; line-height: 1.3; color: #111827;">
        <div style="display:flex; justify-content: space-between; align-items:flex-start; gap: 4px;">
          <div style="font-weight: 700; font-size: 10px; letter-spacing: .02em; color:#10b981;">AYNI</div>
          <div style="text-align:right; font-size: 7px; color:#6b7280;">${fecha}</div>
        </div>
        <div style="margin-top: 4px; font-size: 9px; font-weight: 600; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${titulo}</div>
        <hr style="margin: 4px 0; border: 0; border-top: 1px solid #e5e7eb;"/>
        <div style="font-size: 8px; color: #374151; overflow: hidden;">${cuerpoTexto}</div>
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

  private nextId(): number {
    const max = this.informes.reduce((acc, item) => {
      const n = Number(item.id);
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 0);
    return max + 1;
  }
}
