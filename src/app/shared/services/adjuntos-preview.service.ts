import { Injectable } from '@angular/core';

export interface AdjuntoPreview {
  nombre?: string;
  tipo?: string;
  archivo?: File;
  dataUrl?: string;
  url?: string;
}

@Injectable({ providedIn: 'root' })
export class AdjuntosPreviewService {
  getAdjuntoUrl(adjunto: AdjuntoPreview): string | null {
    const dataUrl = String(adjunto?.dataUrl || '').trim();
    if (dataUrl) return dataUrl;

    const url = String(adjunto?.url || '').trim();
    if (url) return url;

    if (adjunto?.archivo && (adjunto.archivo instanceof Blob || typeof (adjunto.archivo as any).size === 'number')) {
      try {
        return URL.createObjectURL(adjunto.archivo as any);
      } catch (e) {
        console.warn('No se pudo generar Object URL', e);
      }
    }

    return null;
  }

  getNombre(adjunto: AdjuntoPreview, fallback = 'documento'): string {
    const nombre = String(adjunto?.nombre || adjunto?.archivo?.name || '').trim();
    return nombre || fallback;
  }

  puedeVistaPrevia(adjunto: AdjuntoPreview): boolean {
    const fuente = this.getAdjuntoUrl(adjunto);
    if (!fuente) return false;
    return this.esOffice(adjunto) || this.esPdf(adjunto) || this.esImagen(adjunto);
  }

  esPdf(adjunto: AdjuntoPreview): boolean {
    const tipo = this.getTipo(adjunto);
    if (tipo === 'application/pdf') return true;

    const nombre = this.getNombre(adjunto).toLowerCase();
    if (nombre.endsWith('.pdf')) return true;

    const fuente = String(adjunto?.dataUrl || '').trim();
    return fuente.startsWith('data:application/pdf');
  }

  esImagen(adjunto: AdjuntoPreview): boolean {
    const tipo = this.getTipo(adjunto);
    if (tipo.startsWith('image/')) return true;

    const nombre = this.getNombre(adjunto).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((ext) => nombre.endsWith(ext));
  }

  esOffice(adjunto: AdjuntoPreview): boolean {
    return this.esWord(adjunto) || this.esExcel(adjunto);
  }

  esWord(adjunto: AdjuntoPreview): boolean {
    const tipo = this.getTipo(adjunto);
    if (tipo.includes('wordprocessingml') || tipo.includes('msword')) return true;

    const nombre = this.getNombre(adjunto).toLowerCase();
    return nombre.endsWith('.docx') || nombre.endsWith('.doc');
  }

  esExcel(adjunto: AdjuntoPreview): boolean {
    const tipo = this.getTipo(adjunto);
    if (tipo.includes('spreadsheetml') || tipo.includes('ms-excel')) return true;

    const nombre = this.getNombre(adjunto).toLowerCase();
    return nombre.endsWith('.xlsx') || nombre.endsWith('.xls');
  }

  async obtenerBlob(adjunto: AdjuntoPreview): Promise<Blob | null> {
    if (adjunto?.archivo && (adjunto.archivo instanceof Blob || typeof (adjunto.archivo as any).size === 'number')) {
      return adjunto.archivo as Blob;
    }

    const fuente = this.getAdjuntoUrl(adjunto);
    if (!fuente) return null;

    if (this.esDataUrl(fuente)) {
      return this.dataUrlABlob(fuente);
    }

    if (typeof fetch === 'undefined') return null;
    const response = await fetch(fuente);
    if (!response.ok) {
      throw new Error(`No se pudo obtener el archivo (${response.status})`);
    }

    return await response.blob();
  }

  async descargarAdjunto(adjunto: AdjuntoPreview, fallbackName = 'documento'): Promise<void> {
    const nombre = this.getNombre(adjunto, fallbackName);

    try {
      const blob = await this.obtenerBlob(adjunto);
      if (blob) {
        this.descargarBlob(blob, nombre);
        return;
      }
    } catch {
      // fallback below
    }

    const fuente = this.getAdjuntoUrl(adjunto);
    if (!fuente || typeof document === 'undefined') return;

    const enlace = document.createElement('a');
    enlace.href = fuente;
    enlace.download = nombre;
    enlace.rel = 'noopener noreferrer';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  }

  async generarHtmlPreviewOffice(adjunto: AdjuntoPreview): Promise<string> {
    const blob = await this.obtenerBlob(adjunto);
    if (!blob) {
      return this.generarMensajePreviewHtml('No se pudo cargar el documento para vista previa.');
    }

    if (this.esExcel(adjunto)) {
      return this.generarVistaPreviaExcel(blob);
    }

    return this.generarVistaPreviaWord(blob, this.getNombre(adjunto));
  }

  generarMensajePreviewHtml(mensaje: string): string {
    return `
      <div style="padding: 20px; font-family: Segoe UI, Arial, sans-serif; color: #374151;">
        <p style="margin:0; font-size: 14px;">${mensaje}</p>
      </div>
    `;
  }

  private getTipo(adjunto: AdjuntoPreview): string {
    return String(adjunto?.tipo || adjunto?.archivo?.type || '').trim().toLowerCase();
  }

  private esDataUrl(valor: string): boolean {
    return /^data:[^;]+;base64,/i.test(valor);
  }

  private dataUrlABlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+);base64/i);
    const mime = mimeMatch?.[1] || 'application/octet-stream';
    const binary = atob(base64 || '');
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: mime });
  }

  private descargarBlob(blob: Blob, nombre: string): void {
    if (typeof document === 'undefined') return;

    const objectUrl = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = objectUrl;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(objectUrl);
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
    const nombre = String(nombreArchivo || '').toLowerCase();
    if (nombre.endsWith('.doc') && !nombre.endsWith('.docx')) {
      return this.generarMensajePreviewHtml('La vista previa directa de archivos .doc no está disponible. Puedes descargarlo para abrirlo en tu editor.');
    }

    const mammoth: any = await import('mammoth/mammoth.browser');
    const arrayBuffer = await blob.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const contenido = result?.value || '';

    if (!contenido.trim()) {
      return this.generarMensajePreviewHtml('No se encontró contenido para mostrar en el documento.');
    }

    return `
      <div style="padding: 16px; font-family: Segoe UI, Arial, sans-serif; color: #111827; line-height: 1.6;">
        ${contenido}
      </div>
    `;
  }
}
