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
      };

      return {
        id,
        titulo: data.titulo,
        fecha: data.fecha,
        cuerpoHtml: data.cuerpoHtml,
        firma: data.firma,
        previewHtml: this.sanitizer.bypassSecurityTrustHtml(this.buildPreviewHtml(data)),
      };
    });
  }

  private buildPreviewHtml(data: Pick<InformeFormData, 'titulo' | 'fecha' | 'cuerpoHtml'>): string {
    const titulo = this.escapeHtml((data.titulo || 'Informe').trim() || 'Informe');
    const fecha = this.escapeHtml(data.fecha || '');
    const cuerpo = data.cuerpoHtml || '';

    return `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 10px; line-height: 1.4; color: #111827;">
        <div style="display:flex; justify-content: space-between; align-items:flex-start; gap: 10px;">
          <div style="font-weight: 700; letter-spacing: .02em; color:#10b981;">AYNI</div>
          <div style="text-align:right; font-size: 10px; color:#6b7280;">${fecha}</div>
        </div>
        <div style="margin-top: 8px; font-size: 12px; font-weight: 700;">${titulo}</div>
        <hr style="margin: 8px 0; border: 0; border-top: 1px solid #e5e7eb;"/>
        <div>${cuerpo}</div>
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

  private nextId(): number {
    const max = this.informes.reduce((acc, item) => {
      const n = Number(item.id);
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 0);
    return max + 1;
  }
}
