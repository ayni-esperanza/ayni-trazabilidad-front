import { Component, Input, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { Proyecto, EtapaProyecto, Responsable, ProcesoSimple, OrdenCompra, FlujoNodo, ComentarioAdicionalActividad, EstadoTarea, FlujoAdjunto } from '../../../../models/solicitud.model';
import { DatePickerComponent } from '../../../../../../shared/components/date-picker/date-picker.component';
import { UbicacionSelectComponent } from '../../../../../../shared/components/ubicacion-select/ubicacion-select.component';
import { ResponsableSelectComponent } from '../../../../../../shared/components/responsable-select/responsable-select.component';

export type ProyectoInfoFormData = {
  nombreProyecto: string;
  cliente: string;
  representante: string;
  areas: string[];
  ordenesCompra: OrdenCompra[];
  comentariosAdicionalesActividad: ComentarioAdicionalActividad[];
  costo: number;
  procesoId: number;
  responsableId: number;
  fechaInicio: string;
  fechaFinalizacion: string;
  ubicacion: string;
  descripcion: string;
};

@Component({
  selector: 'app-tab-informacion',
  standalone: true,
  imports: [CommonModule, FormsModule, CKEditorModule, DatePickerComponent, UbicacionSelectComponent, ResponsableSelectComponent],
  templateUrl: './tab-informacion.component.html'
})
export class TabInformacionComponent implements OnInit {
  @Input() proyecto: Proyecto | null = null;
  @Input() proyectoInfoForm!: ProyectoInfoFormData;
  @Input() flujoNodos: FlujoNodo[] = [];
  @Input() responsables: Responsable[] = [];
  @Input() procesos: ProcesoSimple[] = [];
  @Input() etapas: EtapaProyecto[] = [];
  @Input() modoSoloLectura = false;
  @Input() proyectoFinalizado = false;
  @Input() proyectoCancelado = false;

  readonly estadosActividad: EstadoTarea[] = ['Pendiente', 'En Proceso', 'Completado', 'Cancelado', 'Retrasado'];
  readonly acceptTiposArchivo = '.xlsx,.xls,.pdf,.docx,.doc,.pptx,.ppt,.txt,.csv,.png,.jpg,.jpeg,.zip,.rar';
  readonly tiposOrdenCompra = ['SUMINISTRO', 'SERVICIO', 'OTROS'];
  readonly areasDisponibles: string[] = [
    'Metalmecanica',
    'Mecanica',
    'Fibra',
    'Electrico',
    'Lineas de vida',
    'Sistemas'
  ];
  areaSeleccionadaParaAgregar = '';

  protected Editor: any;
  protected ckeditorConfig: any = {};
  protected isBrowser = false;

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      import('ckeditor5').then(({
        ClassicEditor, Bold, Essentials, FontBackgroundColor, FontColor, FontSize,
        Heading, Highlight, Indent, IndentBlock, Italic, Link, List, Paragraph, Table, Undo,
      }) => {
        this.Editor = ClassicEditor;
        this.ckeditorConfig = {
          licenseKey: 'GPL',
          toolbar: {
            items: ['undo','redo','|','heading','|','fontSize','fontColor','fontBackgroundColor','|','bold','italic','highlight','|','link','insertTable','|','bulletedList','numberedList','indent','outdent'],
            shouldNotGroupWhenFull: true
          },
          plugins: [Bold, Essentials, FontBackgroundColor, FontColor, FontSize, Heading, Highlight, Indent, IndentBlock, Italic, Link, List, Paragraph, Table, Undo],
        };
        this.cdr.detectChanges();
      });
    }
  }

  agregarOrdenCompra(): void {
    this.proyectoInfoForm.ordenesCompra.push({
      numero: '',
      fecha: '',
      tipo: 'SUMINISTRO',
      numeroLicitacion: '',
      numeroSolicitud: '',
      total: undefined
    });
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

    const ordenes = this.proyectoInfoForm.ordenesCompra || [];
    const orden = ordenes[index];
    if (!orden) return;

    const nuevosAdjuntos: FlujoAdjunto[] = [];
    for (const file of Array.from(files)) {
      nuevosAdjuntos.push({
        nombre: file.name,
        tipo: file.type || 'application/octet-stream',
        tamano: file.size,
        archivo: file,
        dataUrl: await this.leerArchivoComoDataUrl(file)
      });
    }

    orden.adjuntos = [...(orden.adjuntos || []), ...nuevosAdjuntos];
    input.value = '';
  }

  eliminarAdjuntoOrdenCompra(ordenIndex: number, adjuntoIndex: number): void {
    const orden = (this.proyectoInfoForm.ordenesCompra || [])[ordenIndex];
    if (!orden?.adjuntos) return;
    orden.adjuntos = orden.adjuntos.filter((_, i) => i !== adjuntoIndex);
  }

  verAdjuntoOrdenCompra(adjunto: FlujoAdjunto): void {
    if (!this.isBrowser) return;
    const url = this.obtenerUrlAdjunto(adjunto);
    if (!url) return;

    const nuevaVentana = window.open(url, '_blank', 'noopener,noreferrer');
    if (!nuevaVentana && adjunto.archivo) {
      window.URL.revokeObjectURL(url);
    }
  }

  descargarAdjuntoOrdenCompra(adjunto: FlujoAdjunto): void {
    if (!this.isBrowser) return;
    const url = this.obtenerUrlAdjunto(adjunto);
    if (!url) return;

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = adjunto.nombre || 'adjunto';
    enlace.click();

    if (adjunto.archivo && !adjunto.dataUrl) {
      window.URL.revokeObjectURL(url);
    }
  }

  getResponsableNombre(responsableId: number): string {
    const resp = this.responsables.find(r => r.id === responsableId);
    return resp?.nombre || 'Sin asignar';
  }

  formatDisplayDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  get areasPendientesParaAgregar(): string[] {
    const seleccionadas = new Set(this.proyectoInfoForm.areas || []);
    return this.areasDisponibles.filter(area => !seleccionadas.has(area));
  }

  agregarAreaSeleccionada(): void {
    const area = this.areaSeleccionadaParaAgregar;
    if (!area) return;

    if (!this.proyectoInfoForm.areas) {
      this.proyectoInfoForm.areas = [];
    }

    if (!this.proyectoInfoForm.areas.includes(area)) {
      this.proyectoInfoForm.areas = [...this.proyectoInfoForm.areas, area];
    }

    this.areaSeleccionadaParaAgregar = '';
  }

  quitarArea(area: string): void {
    this.proyectoInfoForm.areas = (this.proyectoInfoForm.areas || []).filter(a => a !== area);
  }

  get actividadesCreadasFlujo(): FlujoNodo[] {
    return (this.flujoNodos || []).filter(nodo => nodo.tipo === 'tarea');
  }

  get responsablesComentario(): Responsable[] {
    const unicos = new Map<number, Responsable>();
    for (const r of this.responsables || []) {
      if (typeof r.id === 'number' && !unicos.has(r.id)) {
        unicos.set(r.id, r);
      }
    }
    return Array.from(unicos.values());
  }

  agregarComentarioAdicional(): void {
    const actividades = this.actividadesCreadasFlujo;
    if (!actividades.length) return;

    if (!this.proyectoInfoForm.comentariosAdicionalesActividad) {
      this.proyectoInfoForm.comentariosAdicionalesActividad = [];
    }

    const fechaActual = this.formatDateInput(new Date());
    this.proyectoInfoForm.comentariosAdicionalesActividad = [
      ...this.proyectoInfoForm.comentariosAdicionalesActividad,
      {
        id: this.obtenerSiguienteComentarioId(),
        actividadId: actividades[0].id,
        nombre: '',
        estadoActividad: 'Pendiente',
        responsableId: undefined,
        fechaInicio: fechaActual,
        fechaFin: '',
        descripcion: '',
        adjuntos: []
      }
    ];
  }

  eliminarComentarioAdicional(index: number): void {
    this.proyectoInfoForm.comentariosAdicionalesActividad = (this.proyectoInfoForm.comentariosAdicionalesActividad || [])
      .filter((_, i) => i !== index);
  }

  async onSeleccionarAdjuntosComentario(event: Event, index: number): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;

    const comentarios = this.proyectoInfoForm.comentariosAdicionalesActividad || [];
    const comentario = comentarios[index];
    if (!comentario) return;

    const nuevosAdjuntos: FlujoAdjunto[] = [];
    for (const file of Array.from(files)) {
      nuevosAdjuntos.push({
        nombre: file.name,
        tipo: file.type || 'application/octet-stream',
        tamano: file.size,
        archivo: file,
        dataUrl: await this.leerArchivoComoDataUrl(file)
      });
    }

    comentario.adjuntos = [...(comentario.adjuntos || []), ...nuevosAdjuntos];
    input.value = '';
  }

  eliminarAdjuntoComentario(comentarioIndex: number, adjuntoIndex: number): void {
    const comentarios = this.proyectoInfoForm.comentariosAdicionalesActividad || [];
    const comentario = comentarios[comentarioIndex];
    if (!comentario?.adjuntos) return;
    comentario.adjuntos = comentario.adjuntos.filter((_, i) => i !== adjuntoIndex);
  }

  descargarAdjuntoComentario(adjunto: FlujoAdjunto): void {
    if (!this.isBrowser) return;

    if (adjunto.archivo) {
      const enlace = document.createElement('a');
      const url = window.URL.createObjectURL(adjunto.archivo);
      enlace.href = url;
      enlace.download = adjunto.nombre || 'adjunto';
      enlace.click();
      window.URL.revokeObjectURL(url);
      return;
    }

    if (adjunto.dataUrl) {
      const enlace = document.createElement('a');
      enlace.href = adjunto.dataUrl;
      enlace.download = adjunto.nombre || 'adjunto';
      enlace.click();
    }
  }

  getNombreActividad(actividadId: number): string {
    const actividad = this.actividadesCreadasFlujo.find(item => item.id === actividadId);
    return actividad?.nombre || `Actividad ${actividadId}`;
  }

  formatBytes(size?: number): string {
    if (!size || size <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(1024));
    const valor = size / Math.pow(1024, i);
    return `${valor.toFixed(valor >= 10 || i === 0 ? 0 : 1)} ${units[i] || 'B'}`;
  }

  private obtenerSiguienteComentarioId(): number {
    const ids = (this.proyectoInfoForm.comentariosAdicionalesActividad || [])
      .map(comentario => comentario.id)
      .filter(id => typeof id === 'number');
    return ids.length ? Math.max(...ids) + 1 : 1;
  }

  private formatDateInput(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private leerArchivoComoDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.readAsDataURL(file);
    });
  }

  private obtenerUrlAdjunto(adjunto: FlujoAdjunto): string | null {
    if (adjunto.dataUrl) return adjunto.dataUrl;
    if (adjunto.url) return adjunto.url;
    if (adjunto.archivo && this.isBrowser) {
      return window.URL.createObjectURL(adjunto.archivo);
    }
    return null;
  }

}
