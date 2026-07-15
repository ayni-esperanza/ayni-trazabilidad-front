import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, EventEmitter, Inject, Input, OnChanges, Output, PLATFORM_ID, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrdenCompra, FlujoAdjunto } from '../../../../../../models/solicitud.model';
import { DatePickerComponent } from '../../../../../../../../shared/components/date-picker/date-picker.component';
import { SelectSearchableComponent, SelectSearchableOption } from '../../../../../../../../shared/components/select-searchable/select-searchable.component';
import { AdjuntoUploadOptimizerService } from '../../../../../../../../shared/services/adjunto-upload-optimizer.service';
import { ADJUNTO_ACCEPT_TIPOS } from '../../../../../../../../shared/services/adjunto-upload-policy';
import { AdjuntosPreviewService } from '../../../../../../../../shared/services/adjuntos-preview.service';
import { DocumentoResumen } from '../../../../models/documento-resumen.model';
import { ProyectoInfoFormData } from '../../tab-informacion.models';

@Component({
  selector: 'app-ordenes-compra-card',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent, SelectSearchableComponent],
  templateUrl: './ordenes-compra-card.component.html'
})
export class OrdenesCompraCardComponent implements OnChanges {
  @Input() proyectoInfoForm!: ProyectoInfoFormData;
  @Input() proyectoCancelado = false;
  @Output() abrirVistaPreviaDocumentoEvt = new EventEmitter<DocumentoResumen>();

  expandida = false;
  readonly tiposOrdenCompra = ['SUMINISTRO', 'SERVICIO', 'OTROS'];
  get tiposOrdenCompraOptions(): SelectSearchableOption[] {
    return this.tiposOrdenCompra.map((tipo) => ({ value: tipo, label: tipo }));
  }

  normalizarTipoOrdenCompra(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }
  readonly acceptTiposArchivo = ADJUNTO_ACCEPT_TIPOS;
  erroresAdjuntosOrdenCompra: Record<number, string> = {};
  private readonly isBrowser: boolean;

  constructor(
    private readonly adjuntoUploadOptimizerService: AdjuntoUploadOptimizerService,
    private readonly adjuntosPreviewService: AdjuntosPreviewService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyectoInfoForm'] && (this.proyectoInfoForm?.ordenesCompra || []).length > 0) {
      this.expandida = true;
    }
  }

  toggle(): void {
    this.expandida = !this.expandida;
  }

  agregarOrdenCompra(): void {
    const ordenes = this.proyectoInfoForm.ordenesCompra || [];
    const teniaOrdenes = ordenes.length > 0;
    ordenes.push({
      numero: '',
      fecha: '',
      tipo: 'SUMINISTRO',
      numeroLicitacion: '',
      numeroSolicitud: '',
      total: undefined
    });
    this.proyectoInfoForm.ordenesCompra = ordenes;
    if (!teniaOrdenes) this.expandida = true;
  }

  eliminarOrdenCompra(index: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const ordenes = this.proyectoInfoForm.ordenesCompra || [];
    if (index < 0 || index >= ordenes.length) return;
    this.proyectoInfoForm.ordenesCompra = ordenes.filter((_, i) => i !== index);
  }

  async onSeleccionarAdjuntosOrdenCompra(event: Event, index: number): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;

    const orden = (this.proyectoInfoForm.ordenesCompra || [])[index];
    if (!orden) return;

    const nuevosAdjuntos: FlujoAdjunto[] = [];
    const errores: string[] = [];
    for (const file of Array.from(files)) {
      const procesado = await this.adjuntoUploadOptimizerService.prepararAdjunto(file);
      if (typeof procesado === 'string') {
        errores.push(procesado);
        continue;
      }

      nuevosAdjuntos.push({
        nombre: procesado.name,
        tipo: procesado.type || 'application/octet-stream',
        tamano: procesado.size,
        archivo: procesado,
        dataUrl: await this.leerArchivoComoDataUrl(procesado)
      });
    }

    orden.adjuntos = [...(orden.adjuntos || []), ...nuevosAdjuntos];
    if (errores.length) {
      this.erroresAdjuntosOrdenCompra[index] = errores.length === 1
        ? errores[0]
        : `${errores[0]} (+${errores.length - 1} más)`;
    } else {
      delete this.erroresAdjuntosOrdenCompra[index];
    }
    input.value = '';
  }

  eliminarAdjuntoOrdenCompra(ordenIndex: number, adjuntoIndex: number): void {
    const orden = (this.proyectoInfoForm.ordenesCompra || [])[ordenIndex];
    if (!orden?.adjuntos) return;
    orden.adjuntos = orden.adjuntos.filter((_, i) => i !== adjuntoIndex);
  }

  verAdjuntoOrdenCompra(ordenOAdjunto: OrdenCompra | FlujoAdjunto, adjuntoArg?: FlujoAdjunto): void {
    const adjunto = adjuntoArg || (ordenOAdjunto as FlujoAdjunto);
    const orden = adjuntoArg ? (ordenOAdjunto as OrdenCompra) : null;

    this.abrirVistaPreviaDocumentoEvt.emit({
      actividad: `Orden de compra ${orden?.numero || ''}`.trim() || 'Orden de compra',
      origen: 'Orden de compra',
      nombre: adjunto?.nombre || 'Documento adjunto',
      tipo: adjunto?.tipo || 'Archivo',
      adjunto
    });
  }

  async descargarAdjuntoOrdenCompra(adjunto: FlujoAdjunto): Promise<void> {
    if (!this.isBrowser) return;
    await this.adjuntosPreviewService.descargarAdjunto({
      nombre: adjunto.nombre,
      tipo: adjunto.tipo,
      archivo: adjunto.archivo,
      dataUrl: adjunto.dataUrl,
      url: adjunto.url
    }, 'adjunto');
  }

  private leerArchivoComoDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.readAsDataURL(file);
    });
  }
}
