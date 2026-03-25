import { Component, Input, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { Proyecto, EtapaProyecto, Responsable, ProcesoSimple, OrdenCompra } from '../../../../models/solicitud.model';
import { DatePickerComponent } from '../../../../../../shared/components/date-picker/date-picker.component';
import { UbicacionSelectComponent } from '../../../../../../shared/components/ubicacion-select/ubicacion-select.component';
import { ResponsableSelectComponent } from '../../../../../../shared/components/responsable-select/responsable-select.component';

export type ProyectoInfoFormData = {
  nombreProyecto: string;
  cliente: string;
  representante: string;
  areas: string[];
  ordenesCompra: OrdenCompra[];
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
  @Input() responsables: Responsable[] = [];
  @Input() procesos: ProcesoSimple[] = [];
  @Input() etapas: EtapaProyecto[] = [];
  @Input() modoSoloLectura = false;
  @Input() proyectoFinalizado = false;
  @Input() proyectoCancelado = false;

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

  eliminarOrdenCompra(index: number): void {
    this.proyectoInfoForm.ordenesCompra.splice(index, 1);
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

}
