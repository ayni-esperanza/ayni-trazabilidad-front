import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, HostListener, Inject, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PLATFORM_ID } from '@angular/core';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { ConfirmDeleteModalComponent, ConfirmDeleteConfig } from '../confirm-delete-modal/confirm-delete-modal.component';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { ResponsableSelectComponent } from '../responsable-select/responsable-select.component';
import { Responsable } from '../../../features/registro-solicitudes/models/solicitud.model';

export interface ArchivoAdjuntoActividad {
  nombre: string;
  tipo: string;
  tamano: number;
  archivo?: File;
  dataUrl?: string;
}

export interface Tarea {
  id?: number;
  nombre: string;
  responsableId: string;
  fechaInicio: string;
  fechaFin?: string;
  descripcion: string;
  archivosAdjuntos: ArchivoAdjuntoActividad[];
  estado: string;
  progreso?: number;
}

@Component({
  selector: 'app-tarea-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CKEditorModule, ConfirmDeleteModalComponent, DatePickerComponent, ResponsableSelectComponent],
  templateUrl: './tarea-form-modal.component.html'
})
export class TareaFormModalComponent implements OnChanges, OnInit, OnDestroy {
  @Input() visible = false;
  @Input() tarea: Tarea | null = null;
  @Input() responsables: Responsable[] = [];
  @Input() modoEdicion = false;
  @Input() embedded = false;

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Tarea>();
  @Output() eliminar = new EventEmitter<number>();

  formData: Tarea = {
    nombre: '',
    responsableId: '',
    fechaInicio: '',
    fechaFin: undefined,
    descripcion: '',
    archivosAdjuntos: [],
    estado: 'Pendiente'
  };

  acceptTiposArchivo = '.xlsx,.xls,.pdf,.docx,.doc,.pptx,.ppt,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif,.zip,.rar';
  protected Editor: any;
  protected ckeditorConfig: any = {};
  protected isBrowser = false;
  private readonly maxImagenBytes = 5 * 1024 * 1024;
  private readonly maxDocumentoBytes = 25 * 1024 * 1024;
  private readonly tiposPermitidos = new Set([
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.rar',
    'application/x-rar-compressed',
    'application/octet-stream',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif'
  ]);
  private readonly extensionesPermitidas = new Set([
    'xlsx', 'xls', 'pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'zip', 'rar'
  ]);
  errorAdjuntos = '';

  // Control de validacion
  intentoGuardar = false;
  errores: { [key: string]: string } = {};
  Object = Object;

  // Modal de confirmacion de eliminacion
  mostrarConfirmacionEliminar = false;
  cargandoEliminacion = false;
  configEliminarModal: ConfirmDeleteConfig = {};

  // Vista previa de adjuntos
  mostrarVistaPrevia = false;
  adjuntoVistaPrevia: ArchivoAdjuntoActividad | null = null;
  fuenteVistaPrevia = '';
  htmlVistaPrevia: SafeHtml | null = null;
  cargandoVistaPrevia = false;
  vistaPreviaOffice = false;
  private fuenteVistaPreviaEsBlob = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    import('ckeditor5').then(({
      Bold,
      ClassicEditor,
      Essentials,
      Italic,
      Link,
      List,
      Paragraph,
      Underline,
      Undo,
    }) => {
      this.Editor = ClassicEditor;
      this.ckeditorConfig = {
        licenseKey: 'GPL',
        toolbar: {
          items: ['undo', 'redo', '|', 'bold', 'italic', 'underline', '|', 'bulletedList', 'numberedList', '|', 'link'],
          shouldNotGroupWhenFull: true
        },
        plugins: [Bold, Essentials, Italic, Link, List, Paragraph, Underline, Undo],
      };
      this.cdr.detectChanges();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si la modal está visible y cambia la tarea seleccionada (o el modo),
    // se debe resincornizar el formulario para mantener datos independientes por nodo.
    const cambioConModalAbierta = this.visible && (changes['tarea'] || changes['modoEdicion']);
    const aperturaModal = changes['visible'] && this.visible;

    if (aperturaModal || cambioConModalAbierta) {
      this.cargarFormularioDesdeInput();
    }
  }

  private cargarFormularioDesdeInput(): void {
    if (this.tarea) {
      this.formData = {
        ...this.tarea,
        descripcion: this.tarea.descripcion || '',
        archivosAdjuntos: this.tarea.archivosAdjuntos ? [...this.tarea.archivosAdjuntos] : []
      };
      this.intentoGuardar = false;
      this.errores = {};
      return;
    }

    this.resetForm();
  }

  resetForm(): void {
    this.cerrarVistaPrevia();
    this.formData = {
      nombre: '',
      responsableId: '',
      fechaInicio: '',
      fechaFin: undefined,
      descripcion: '',
      archivosAdjuntos: [],
      estado: 'Pendiente'
    };
    this.intentoGuardar = false;
    this.errores = {};
    this.errorAdjuntos = '';
    this.mostrarConfirmacionEliminar = false;
  }

  onCerrar(): void {
    this.cerrar.emit();
    this.resetForm();
  }

  onBackdropClick(): void {
    if (!this.embedded) {
      this.onCerrar();
    }
  }

  onContentClick(event: MouseEvent): void {
    if (!this.embedded) {
      event.stopPropagation();
    }
  }

  onGuardar(): void {
    this.intentoGuardar = true;
    if (this.validarFormulario()) {
      if (this.modoEdicion && this.tarea?.id) {
        this.guardar.emit({ ...this.formData, id: this.tarea.id });
      } else {
        this.guardar.emit(this.formData);
      }
      this.onCerrar();
    }
  }

  onIniciarEliminar(): void {
    if (!this.tarea?.id) return;
    this.configEliminarModal = {
      titulo: 'Eliminar actividad',
      mensaje: '¿Estas seguro de que deseas eliminar esta actividad?',
      cantidadElementos: 1,
      tipoElemento: 'actividad',
      textoConfirmar: 'Eliminar'
    };
    this.mostrarConfirmacionEliminar = true;
  }

  async onConfirmarEliminar(): Promise<void> {
    if (!this.tarea?.id) return;

    this.cargandoEliminacion = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      this.eliminar.emit(this.tarea.id);
      this.mostrarConfirmacionEliminar = false;
      this.onCerrar();
    } finally {
      this.cargandoEliminacion = false;
    }
  }

  onCancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
  }

  validarFormulario(): boolean {
    this.errores = {};

    if (!this.formData.nombre.trim()) {
      this.errores['nombre'] = 'El nombre de la tarea es requerido';
    }
    if (!this.formData.fechaInicio) {
      this.errores['fechaInicio'] = 'La fecha de inicio es requerida';
    }
    if (this.formData.fechaInicio && this.formData.fechaFin &&
        new Date(this.formData.fechaFin) < new Date(this.formData.fechaInicio)) {
      this.errores['fechaFin'] = 'La fecha de finalizacion debe ser posterior a la de inicio';
    }
    if (this.modoEdicion && !this.formData.responsableId) {
      this.errores['responsableId'] = 'Debe seleccionar un responsable';
    }

    return Object.keys(this.errores).length === 0;
  }

  tieneError(campo: string): boolean {
    return this.intentoGuardar && !!this.errores[campo];
  }

  get tituloModal(): string {
    return this.modoEdicion ? 'Editar Actividad' : 'Nueva Actividad';
  }

  get textoBoton(): string {
    return this.modoEdicion ? 'Guardar Actividad' : 'Agregar Actividad';
  }

  async onSeleccionarArchivos(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    await this.agregarAdjuntosDesdeArchivos(Array.from(files));
    input.value = '';
  }

  @HostListener('document:paste', ['$event'])
  async onPegarImagen(event: ClipboardEvent): Promise<void> {
    if (!this.visible) return;

    const clipboardItems = Array.from(event.clipboardData?.items || []);
    if (!clipboardItems.length) return;

    const imagenes = clipboardItems
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((file): file is File => file instanceof File);

    if (!imagenes.length) return;

    if (this.debePrevenirPegadoPorImagen(event, clipboardItems)) {
      event.preventDefault();
    }

    const archivos = imagenes.map((file, index) => this.normalizarNombreArchivoPegado(file, index));
    await this.agregarAdjuntosDesdeArchivos(archivos);
  }

  eliminarAdjunto(index: number): void {
    this.formData.archivosAdjuntos = this.formData.archivosAdjuntos.filter((_, i) => i !== index);
  }

  formatoTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  puedeDescargarAdjunto(adjunto: ArchivoAdjuntoActividad): boolean {
    return !!adjunto.archivo || !!adjunto.dataUrl;
  }

  descargarAdjunto(adjunto: ArchivoAdjuntoActividad): void {
    if (adjunto.archivo) {
      const blobUrl = URL.createObjectURL(adjunto.archivo);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = adjunto.nombre;
      link.click();
      URL.revokeObjectURL(blobUrl);
      return;
    }

    if (!adjunto.dataUrl) return;

    const link = document.createElement('a');
    link.href = adjunto.dataUrl;
    link.download = adjunto.nombre;
    link.click();
  }

  esVistaPreviaSoportada(adjunto: ArchivoAdjuntoActividad): boolean {
    if (this.esDocumentoOffice(adjunto)) return true;

    const mime = (adjunto.tipo || '').toLowerCase();
    if (mime.startsWith('image/') || mime === 'application/pdf') return true;

    const nombre = (adjunto.nombre || '').toLowerCase();
    return nombre.endsWith('.pdf') || nombre.endsWith('.png') || nombre.endsWith('.jpg') || nombre.endsWith('.jpeg') || nombre.endsWith('.webp') || nombre.endsWith('.gif');
  }

  esPdf(adjunto: ArchivoAdjuntoActividad | null): boolean {
    if (!adjunto) return false;
    const mime = (adjunto.tipo || '').toLowerCase();
    if (mime === 'application/pdf') return true;
    return (adjunto.nombre || '').toLowerCase().endsWith('.pdf');
  }

  esOffice(adjunto: ArchivoAdjuntoActividad | null): boolean {
    if (!adjunto) return false;
    return this.esDocumentoOffice(adjunto);
  }

  async abrirVistaPrevia(adjunto: ArchivoAdjuntoActividad): Promise<void> {
    if (!this.esVistaPreviaSoportada(adjunto)) return;
    if (!adjunto.dataUrl && !adjunto.archivo) return;

    this.liberarFuenteVistaPrevia();
    this.htmlVistaPrevia = null;
    this.cargandoVistaPrevia = false;
    this.vistaPreviaOffice = false;

    if (this.esDocumentoOffice(adjunto)) {
      this.adjuntoVistaPrevia = adjunto;
      this.mostrarVistaPrevia = true;
      this.vistaPreviaOffice = true;
      this.cargandoVistaPrevia = true;

      try {
        const blob = this.obtenerBlobAdjunto(adjunto);
        if (!blob) {
          this.htmlVistaPrevia = this.sanitizer.bypassSecurityTrustHtml(this.generarMensajePreviewHtml('No se pudo cargar el documento para vista previa.'));
          return;
        }

        const html = this.esDocumentoExcel(adjunto)
          ? await this.generarVistaPreviaExcel(blob)
          : await this.generarVistaPreviaWord(blob, adjunto.nombre);

        this.htmlVistaPrevia = this.sanitizer.bypassSecurityTrustHtml(html);
      } catch (error) {
        console.error('Error generando vista previa Office:', error);
        this.htmlVistaPrevia = this.sanitizer.bypassSecurityTrustHtml(this.generarMensajePreviewHtml('No se pudo generar la vista previa del archivo.'));
      } finally {
        this.cargandoVistaPrevia = false;
      }
      return;
    }

    if (adjunto.dataUrl) {
      this.fuenteVistaPrevia = adjunto.dataUrl;
      this.fuenteVistaPreviaEsBlob = false;
    } else if (adjunto.archivo) {
      this.fuenteVistaPrevia = URL.createObjectURL(adjunto.archivo);
      this.fuenteVistaPreviaEsBlob = true;
    }

    this.adjuntoVistaPrevia = adjunto;
    this.mostrarVistaPrevia = true;
  }

  cerrarVistaPrevia(): void {
    this.liberarFuenteVistaPrevia();
    this.mostrarVistaPrevia = false;
    this.adjuntoVistaPrevia = null;
    this.fuenteVistaPrevia = '';
    this.htmlVistaPrevia = null;
    this.cargandoVistaPrevia = false;
    this.vistaPreviaOffice = false;
    this.fuenteVistaPreviaEsBlob = false;
  }

  obtenerFuenteVistaPreviaImagen(): string {
    return this.fuenteVistaPrevia;
  }

  obtenerFuenteVistaPreviaPdf(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.fuenteVistaPrevia);
  }

  obtenerHtmlVistaPrevia(): SafeHtml {
    return this.htmlVistaPrevia || this.sanitizer.bypassSecurityTrustHtml(this.generarMensajePreviewHtml('Sin contenido para vista previa.'));
  }

  private convertirArchivoADataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer el archivo adjunto'));
      reader.readAsDataURL(file);
    });
  }

  private async agregarAdjuntosDesdeArchivos(files: File[]): Promise<void> {
    if (!files.length) return;

    this.errorAdjuntos = '';
    const nuevosAdjuntos: ArchivoAdjuntoActividad[] = [];
    const errores: string[] = [];

    for (const file of files) {
      const procesado = await this.prepararAdjunto(file);
      if (!procesado) {
        errores.push(`No se pudo adjuntar ${file.name}`);
        continue;
      }

      if (typeof procesado === 'string') {
        errores.push(procesado);
        continue;
      }

      const dataUrl = await this.convertirArchivoADataUrl(procesado);
      const tipoDetectado = (procesado.type || '').trim().toLowerCase() || this.inferirMimePorNombre(procesado.name);
      nuevosAdjuntos.push({
        nombre: procesado.name,
        tipo: tipoDetectado || 'application/octet-stream',
        tamano: procesado.size,
        archivo: procesado,
        dataUrl
      });
    }

    if (nuevosAdjuntos.length) {
      this.formData.archivosAdjuntos = [...this.formData.archivosAdjuntos, ...nuevosAdjuntos];
    }

    if (errores.length) {
      this.errorAdjuntos = errores.length === 1
        ? errores[0]
        : `${errores[0]} (+${errores.length - 1} más)`;
    }
  }

  private async prepararAdjunto(file: File): Promise<File | string | null> {
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

    let archivoFinal = file;

    if (this.esImagenComprimible(file)) {
      const comprimido = await this.comprimirImagen(file);
      if (comprimido) {
        archivoFinal = comprimido;
      }
    }

    const limiteBytes = this.obtenerLimiteBytes(archivoFinal);
    if (archivoFinal.size > limiteBytes) {
      return `El archivo supera el límite de ${this.formatearLimiteMb(limiteBytes)} (${nombre})`;
    }

    return archivoFinal;
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
    if (tipo && this.tiposPermitidos.has(tipo)) {
      return true;
    }
    const extension = this.obtenerExtension(file.name);
    return this.extensionesPermitidas.has(extension);
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

  private obtenerLimiteBytes(file: File): number {
    return this.esImagen(file) ? this.maxImagenBytes : this.maxDocumentoBytes;
  }

  private formatearLimiteMb(bytes: number): string {
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }

  private async comprimirImagen(file: File): Promise<File | null> {
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
      if (resultado.size <= this.maxImagenBytes) {
        break;
      }

      if (quality > 0.5) {
        quality -= 0.08;
      } else {
        width = Math.max(960, Math.round(width * 0.86));
        height = Math.max(640, Math.round(height * 0.86));
      }
    }

    if (!resultado) {
      return file;
    }

    if (resultado.size >= file.size) {
      return file;
    }

    const nombreBase = file.name.replace(/\.[^.]+$/, '');
    const extension = outputType === 'image/webp' ? 'webp' : 'jpg';
    return new File([resultado], `${nombreBase}.${extension}`, { type: outputType });
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

  private normalizarNombreArchivoPegado(file: File, index: number): File {
    const extensionPorTipo: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/bmp': 'bmp'
    };

    const extension = extensionPorTipo[file.type] || 'png';
    const fecha = new Date();
    const marcaTiempo = [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, '0'),
      String(fecha.getDate()).padStart(2, '0')
    ].join('');
    const hora = [
      String(fecha.getHours()).padStart(2, '0'),
      String(fecha.getMinutes()).padStart(2, '0'),
      String(fecha.getSeconds()).padStart(2, '0')
    ].join('');

    const nombreLimpio = (file.name || '').trim();
    const requiereNombreGenerado = !nombreLimpio || nombreLimpio === 'image.png' || nombreLimpio === 'image.jpg';
    const nombreFinal = requiereNombreGenerado
      ? `imagen-pegada-${marcaTiempo}-${hora}-${index + 1}.${extension}`
      : nombreLimpio;

    return new File([file], nombreFinal, { type: file.type || 'image/png' });
  }

  private inferirMimePorNombre(nombreArchivo?: string): string {
    const nombre = (nombreArchivo || '').toLowerCase();
    if (nombre.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (nombre.endsWith('.xls')) return 'application/vnd.ms-excel';
    if (nombre.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (nombre.endsWith('.doc')) return 'application/msword';
    if (nombre.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    if (nombre.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
    if (nombre.endsWith('.pdf')) return 'application/pdf';
    if (nombre.endsWith('.csv')) return 'text/csv';
    if (nombre.endsWith('.txt')) return 'text/plain';
    if (nombre.endsWith('.zip')) return 'application/zip';
    if (nombre.endsWith('.rar')) return 'application/vnd.rar';
    if (nombre.endsWith('.png')) return 'image/png';
    if (nombre.endsWith('.jpg') || nombre.endsWith('.jpeg')) return 'image/jpeg';
    if (nombre.endsWith('.webp')) return 'image/webp';
    if (nombre.endsWith('.gif')) return 'image/gif';
    return '';
  }

  private debePrevenirPegadoPorImagen(event: ClipboardEvent, items: DataTransferItem[]): boolean {
    if (!event.target || !(event.target instanceof Element)) return false;

    const target = event.target as Element;
    const pegandoEnInputTexto = target.closest('input[type="text"], input[type="search"], input[type="email"], textarea, [contenteditable="true"], .ck-editor__editable');
    const tieneContenidoNoImagen = items.some(item => item.kind === 'string');

    return !!pegandoEnInputTexto && !tieneContenidoNoImagen;
  }

  private liberarFuenteVistaPrevia(): void {
    if (this.fuenteVistaPrevia && this.fuenteVistaPreviaEsBlob) {
      URL.revokeObjectURL(this.fuenteVistaPrevia);
    }
  }

  private esDocumentoOffice(adjunto: ArchivoAdjuntoActividad): boolean {
    return this.esDocumentoWord(adjunto) || this.esDocumentoExcel(adjunto);
  }

  private esDocumentoWord(adjunto: ArchivoAdjuntoActividad): boolean {
    const mime = (adjunto.tipo || '').toLowerCase();
    if (mime.includes('wordprocessingml') || mime.includes('msword')) return true;
    const nombre = (adjunto.nombre || '').toLowerCase();
    return nombre.endsWith('.docx') || nombre.endsWith('.doc');
  }

  private esDocumentoExcel(adjunto: ArchivoAdjuntoActividad): boolean {
    const mime = (adjunto.tipo || '').toLowerCase();
    if (mime.includes('spreadsheetml') || mime.includes('ms-excel')) return true;
    const nombre = (adjunto.nombre || '').toLowerCase();
    return nombre.endsWith('.xlsx') || nombre.endsWith('.xls');
  }

  private obtenerBlobAdjunto(adjunto: ArchivoAdjuntoActividad): Blob | null {
    if (adjunto.archivo instanceof Blob) return adjunto.archivo;
    if (adjunto.dataUrl && adjunto.dataUrl.startsWith('data:')) {
      return this.dataUrlABlob(adjunto.dataUrl);
    }
    return null;
  }

  private dataUrlABlob(dataUrl: string): Blob | null {
    const partes = dataUrl.split(',');
    if (partes.length !== 2) return null;

    const encabezado = partes[0];
    const base64 = partes[1];
    const mimeMatch = encabezado.match(/data:([^;]+);base64/);
    const mime = mimeMatch?.[1] || 'application/octet-stream';

    try {
      const binario = atob(base64);
      const bytes = new Uint8Array(binario.length);
      for (let i = 0; i < binario.length; i++) {
        bytes[i] = binario.charCodeAt(i);
      }
      return new Blob([bytes], { type: mime });
    } catch {
      return null;
    }
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
    const nombre = (nombreArchivo || '').toLowerCase();
    if (nombre.endsWith('.doc') && !nombre.endsWith('.docx')) {
      return this.generarMensajePreviewHtml('La vista previa de .doc no esta soportada. Usa .docx para vista previa o descarga el archivo.');
    }

    let mammoth: any;
    try {
      mammoth = await import('mammoth/mammoth.browser');
    } catch {
      mammoth = await import('mammoth');
    }

    const arrayBuffer = await blob.arrayBuffer();
    const resultado = await mammoth.convertToHtml({ arrayBuffer });
    const contenido = (resultado?.value || '').trim();

    if (!contenido) {
      return this.generarMensajePreviewHtml('El documento Word no contiene texto renderizable para vista previa.');
    }

    return `
      <div style="padding: 16px; max-height: 72vh; overflow:auto; font-family: Segoe UI, Arial, sans-serif; color:#111827; background:#fff;">
        ${contenido}
      </div>
    `;
  }

  private generarMensajePreviewHtml(mensaje: string): string {
    return `
      <div style="display:flex;align-items:center;justify-content:center;min-height:52vh;padding:24px;background:#f9fafb;color:#374151;font-family:Segoe UI,Arial,sans-serif;">
        <p style="text-align:center;max-width:760px;font-size:14px;line-height:1.5;margin:0;">${mensaje}</p>
      </div>
    `;
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.visible) {
      this.onCerrar();
    }
  }

  ngOnDestroy(): void {
    this.liberarFuenteVistaPrevia();
  }
}
