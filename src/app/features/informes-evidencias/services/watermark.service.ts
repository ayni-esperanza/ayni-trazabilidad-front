import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WatermarkService {
  /**
   * Obtiene la imagen de marca de agua como base64.
   * Actualmente retorna una marca de agua genérica "CONFIDENCIAL".
   * 
   * Para usar tu propia marca de agua:
   * 1. Guarda tu imagen PNG (transparente) en: src/assets/watermark.png
   * 2. Descomenta la línea que carga desde assets
   * 3. O proporciona la ruta a la imagen PNG
   */
  private watermarkBase64: string | null = null;

  constructor() {
    this.initializeWatermark();
  }

  private initializeWatermark(): void {
    // Opción 1: Generar marca de agua dinámica en SVG (recommended)
    // Esto crea una marca de agua "CONFIDENCIAL" con rotación 45 grados
    this.watermarkBase64 = this.generateSvgWatermark('CONFIDENCIAL', '#cccccc', 60);

    // Opción 2: Cargar desde assets (descomenta si tienes tu propia imagen PNG)
    // this.watermarkBase64 = 'assets/watermark.png';
  }

  /**
   * Genera una marca de agua en formato SVG y retorna como data URI
   */
  private generateSvgWatermark(
    text: string,
    color: string = '#cccccc',
    fontSize: number = 60
  ): string {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
        <defs>
          <style>
            .watermark-text {
              font-family: Arial, sans-serif;
              font-size: ${fontSize}px;
              font-weight: bold;
              fill: ${color};
              opacity: 0.15;
            }
          </style>
        </defs>
        <g transform="rotate(-45 600 600)">
          <text x="600" y="600" text-anchor="middle" dominant-baseline="middle" class="watermark-text">
            ${text}
          </text>
        </g>
      </svg>
    `;

    const encoded = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${encoded}`;
  }

  /**
   * Retorna la marca de agua como base64 o data URI
   */
  getWatermarkDataUri(): string | null {
    return this.watermarkBase64;
  }

  /**
   * Establece una marca de agua personalizada
   * @param imagePathOrBase64 Ruta al archivo PNG o data URI base64
   */
  setCustomWatermark(imagePathOrBase64: string): void {
    this.watermarkBase64 = imagePathOrBase64;
  }

  /**
   * Crea una marca de agua personalizada en SVG
   */
  createCustomSvgWatermark(text: string, color?: string, fontSize?: number): void {
    this.watermarkBase64 = this.generateSvgWatermark(text, color, fontSize);
  }
}
