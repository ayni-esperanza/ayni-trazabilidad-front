import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  ADJUNTO_EXTENSIONES_PERMITIDAS,
  ADJUNTO_MAX_DOCUMENTO_BYTES,
  ADJUNTO_MAX_EXCEL_ORIGEN_BYTES,
  ADJUNTO_MAX_IMAGEN_BYTES,
  ADJUNTO_MAX_PDF_ORIGEN_BYTES,
  ADJUNTO_TIPOS_PERMITIDOS,
} from './adjunto-upload-policy';

@Injectable({
  providedIn: 'root'
})
export class AdjuntoUploadOptimizerService {
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async prepararAdjunto(file: File): Promise<File | string> {
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

    if (this.esPdf(file)) {
      if (file.size > ADJUNTO_MAX_PDF_ORIGEN_BYTES) {
        return `El PDF no debe superar los ${this.formatearLimiteMb(ADJUNTO_MAX_PDF_ORIGEN_BYTES)} antes de optimizarse (${nombre})`;
      }
      return file;
    }

    if (this.esExcel(file)) {
      if (file.size > ADJUNTO_MAX_EXCEL_ORIGEN_BYTES) {
        return `El Excel no debe superar los ${this.formatearLimiteMb(ADJUNTO_MAX_EXCEL_ORIGEN_BYTES)} antes de optimizarse (${nombre})`;
      }
      return file;
    }

    let archivoFinal = file;

    if (this.esImagenComprimible(archivoFinal)) {
      archivoFinal = await this.comprimirImagen(archivoFinal);
    } else if (this.debeOptimizarDocumento(archivoFinal)) {
      archivoFinal = await this.optimizarDocumento(archivoFinal);
    }

    const limiteBytes = this.obtenerLimiteBytes(archivoFinal);
    if (archivoFinal.size > limiteBytes && !this.esImagen(archivoFinal)) {
      archivoFinal = await this.optimizarDocumento(archivoFinal);
    }

    if (archivoFinal.size > limiteBytes) {
      return `No se pudo reducir el archivo al limite de ${this.formatearLimiteMb(limiteBytes)} (${nombre})`;
    }

    return archivoFinal;
  }

  private debeOptimizarDocumento(file: File): boolean {
    return !this.esImagen(file) && (
      file.size > ADJUNTO_MAX_DOCUMENTO_BYTES
      || this.esTextoComprimible(file)
    );
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
    if (tipo && ADJUNTO_TIPOS_PERMITIDOS.has(tipo)) {
      return true;
    }

    return ADJUNTO_EXTENSIONES_PERMITIDAS.has(this.obtenerExtension(file.name));
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

  private esPdf(file: File): boolean {
    return (file.type || '').toLowerCase() === 'application/pdf' || this.obtenerExtension(file.name) === 'pdf';
  }

  private esTextoComprimible(file: File): boolean {
    const tipo = (file.type || '').toLowerCase();
    const extension = this.obtenerExtension(file.name);
    return tipo.startsWith('text/')
      || ['txt', 'csv', 'json', 'log', 'md'].includes(extension)
      || tipo === 'application/json';
  }

  private esExcel(file: File): boolean {
    const tipo = (file.type || '').toLowerCase();
    const extension = this.obtenerExtension(file.name);
    return tipo === 'application/vnd.ms-excel'
      || tipo === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      || extension === 'xls'
      || extension === 'xlsx';
  }

  private obtenerLimiteBytes(file: File): number {
    return this.esImagen(file) ? ADJUNTO_MAX_IMAGEN_BYTES : ADJUNTO_MAX_DOCUMENTO_BYTES;
  }

  private formatearLimiteMb(bytes: number): string {
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }

  private async optimizarDocumento(file: File): Promise<File> {
    let optimizado = file;

    if (this.esTextoComprimible(optimizado)) {
      optimizado = await this.optimizarTexto(optimizado);
    }

    return optimizado.size < file.size ? optimizado : file;
  }

  private async optimizarTexto(file: File): Promise<File> {
    if (!this.isBrowser) {
      return file;
    }

    try {
      const textoOriginal = await file.text();
      let textoOptimizado = textoOriginal;

      if (this.esJson(file)) {
        try {
          textoOptimizado = JSON.stringify(JSON.parse(textoOriginal));
        } catch {
          textoOptimizado = textoOriginal;
        }
      } else {
        textoOptimizado = textoOriginal
          .replace(/\r\n/g, '\n')
          .replace(/[ \t]+\n/g, '\n');
      }

      const blob = new Blob([textoOptimizado], { type: file.type || 'text/plain' });
      if (blob.size >= file.size) {
        return file;
      }

      return new File([blob], file.name, {
        type: file.type || 'text/plain',
        lastModified: file.lastModified,
      });
    } catch {
      return file;
    }
  }

  private esJson(file: File): boolean {
    const tipo = (file.type || '').toLowerCase();
    return tipo === 'application/json' || this.obtenerExtension(file.name) === 'json';
  }

  private async comprimirImagen(file: File): Promise<File> {
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
      if (resultado.size <= ADJUNTO_MAX_IMAGEN_BYTES) {
        break;
      }

      if (quality > 0.5) {
        quality -= 0.08;
      } else {
        width = Math.max(960, Math.round(width * 0.86));
        height = Math.max(640, Math.round(height * 0.86));
      }
    }

    if (!resultado || resultado.size >= file.size) {
      return file;
    }

    const nombreBase = file.name.replace(/\.[^.]+$/, '');
    const extension = outputType === 'image/webp' ? 'webp' : 'jpg';
    return new File([resultado], `${nombreBase}.${extension}`, {
      type: outputType,
      lastModified: file.lastModified,
    });
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
}
