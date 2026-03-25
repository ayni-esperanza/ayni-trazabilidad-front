import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, HostListener, Inject, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PLATFORM_ID } from '@angular/core';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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

  acceptTiposArchivo = '.xlsx,.xls,.pdf,.docx,.doc,.pptx,.ppt,.txt,.csv,.png,.jpg,.jpeg,.zip,.rar';
  protected Editor: any;
  protected ckeditorConfig: any = {};
  protected isBrowser = false;

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

  abrirVistaPrevia(adjunto: ArchivoAdjuntoActividad): void {
    if (!this.esVistaPreviaSoportada(adjunto)) return;
    if (!adjunto.dataUrl && !adjunto.archivo) return;

    this.liberarFuenteVistaPrevia();

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
    this.fuenteVistaPreviaEsBlob = false;
  }

  obtenerFuenteVistaPreviaImagen(): string {
    return this.fuenteVistaPrevia;
  }

  obtenerFuenteVistaPreviaPdf(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.fuenteVistaPrevia);
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

    const nuevosAdjuntos: ArchivoAdjuntoActividad[] = [];
    for (const file of files) {
      const dataUrl = await this.convertirArchivoADataUrl(file);
      nuevosAdjuntos.push({
        nombre: file.name,
        tipo: file.type,
        tamano: file.size,
        archivo: file,
        dataUrl
      });
    }

    this.formData.archivosAdjuntos = [...this.formData.archivosAdjuntos, ...nuevosAdjuntos];
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
