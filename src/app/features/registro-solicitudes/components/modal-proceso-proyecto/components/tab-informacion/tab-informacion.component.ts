import { Component, Input, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { Proyecto, EtapaProyecto, Responsable, ProcesoSimple, OrdenCompra } from '../../../../models/solicitud.model';
import { DatePickerComponent } from '../../../../../../shared/components/date-picker/date-picker.component';
import { UbicacionSelectComponent } from '../../../../../../shared/components/ubicacion-select/ubicacion-select.component';

export type ProyectoInfoFormData = {
  nombreProyecto: string;
  cliente: string;
  representante: string;
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
  imports: [CommonModule, FormsModule, CKEditorModule, DatePickerComponent, UbicacionSelectComponent],
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
    this.proyectoInfoForm.ordenesCompra.push({ numero: '', fecha: '' });
  }

  eliminarOrdenCompra(index: number): void {
    this.proyectoInfoForm.ordenesCompra.splice(index, 1);
  }

  getProcesoNombre(procesoId: number): string {
    const proc = this.procesos.find(p => p.id === procesoId);
    return proc?.nombre || 'Sin proceso';
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

  getTotalPresupuestoEtapas(): number {
    return this.etapas.reduce((total, etapa) => total + (etapa.presupuesto || 0), 0);
  }
}
