import { Injectable } from '@angular/core';

declare global {
  interface Window {
    html2canvas: any;
    jspdf: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class PdfExportService {
  private librariesLoaded = false;

  /**
   * Carga un script externo de forma dinámica.
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Verificar si ya existe el script
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Error cargando script: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Carga las librerías desde CDN y las cachea para usos posteriores.
   */
  private async loadLibraries(): Promise<{ html2canvas: any; jsPDF: any }> {
    if (!this.librariesLoaded) {
      // Cargar ambas librerías desde CDN en paralelo
      await Promise.all([
        this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
        this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
      ]);

      this.librariesLoaded = true;
    }

    return {
      html2canvas: window.html2canvas,
      jsPDF: window.jspdf?.jsPDF,
    };
  }

  /**
   * Exporta múltiples elementos HTML a un PDF.
   * @param pages Array de elementos HTML (cada uno representa una página A4)
   * @param options Opciones de exportación
   */
  async exportToPdf(
    pages: HTMLElement[],
    options: {
      action: 'download' | 'print';
      fileName?: string;
      scale?: number;
      imageQuality?: number;
    }
  ): Promise<void> {
    if (!pages.length) {
      throw new Error('No hay páginas para exportar');
    }

    const { html2canvas, jsPDF } = await this.loadLibraries();

    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Scale 2 para buena resolución sin exceso de peso
    const scale = options.scale ?? 2;
    const imageQuality = options.imageQuality ?? 1;

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];
      const canvas = await html2canvas(pageEl, {
        backgroundColor: '#ffffff',
        scale,
        useCORS: true,
        logging: false,
        allowTaint: false,
        imageTimeout: 15000,
      });

      // Usar PNG para mejor calidad de texto y gráficos con compresión
      const imgData = canvas.toDataURL('image/png', imageQuality);
      if (i > 0) pdf.addPage();
      // Usar compresión MEDIUM para reducir tamaño manteniendo calidad
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'MEDIUM');
    }

    if (options.action === 'download') {
      pdf.save(options.fileName || 'documento.pdf');
      return;
    }

    // Imprimir: usa un iframe oculto
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 250);
    };
  }
}
