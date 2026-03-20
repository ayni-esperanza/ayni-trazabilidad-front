import { Component, EventEmitter, Input, Output, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Solicitud, Responsable } from '../../models/solicitud.model';
import { ModalDismissDirective } from '../../../../shared/directives/modal-dismiss.directive';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { UbicacionSelectComponent } from '../../../../shared/components/ubicacion-select/ubicacion-select.component';

@Component({
  selector: 'app-modal-nueva-solicitud',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalDismissDirective, CKEditorModule, UbicacionSelectComponent],
  templateUrl: './modal-nueva-solicitud.component.html',
  styleUrls: ['./modal-nueva-solicitud.component.css']
})
export class ModalNuevaSolicitudComponent implements OnInit {
  @Input() visible = false;
  @Input() responsables: Responsable[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Partial<Solicitud>>();

  solicitud: Partial<Solicitud> = {
    nombreProyecto: '',
    cliente: '',
    representante: '',
    responsableId: 0,
    descripcion: '',
    ubicacion: ''
  };

  // CKEditor
  protected Editor: any;
  protected ckeditorConfig: any = {};
  protected isBrowser = false;

  // Control de validación
  intentoGuardar = false;
  errores: { [key: string]: string } = {};
  Object = Object;  // Para usar en el template

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      import('ckeditor5').then(({
        ClassicEditor,
        Bold,
        Essentials,
        FontBackgroundColor,
        FontColor,
        FontSize,
        Heading,
        Highlight,
        Indent,
        IndentBlock,
        Italic,
        Link,
        List,
        Paragraph,
        Table,
        Undo,
      }) => {
        this.Editor = ClassicEditor;
        this.ckeditorConfig = {
          licenseKey: 'GPL',
          toolbar: {
            items: [
              'undo',
              'redo',
              '|',
              'heading',
              '|',
              'fontSize',
              'fontColor',
              'fontBackgroundColor',
              '|',
              'bold',
              'italic',
              'highlight',
              '|',
              'link',
              'insertTable',
              '|',
              'bulletedList',
              'numberedList',
              'indent',
              'outdent',
            ],
            shouldNotGroupWhenFull: true
          },
          plugins: [
            Bold,
            Essentials,
            FontBackgroundColor,
            FontColor,
            FontSize,
            Heading,
            Highlight,
            Indent,
            IndentBlock,
            Italic,
            Link,
            List,
            Paragraph,
            Table,
            Undo,
          ],
        };
        this.cdr.detectChanges();
      });
    }
  }

  onCerrar(): void {
    this.resetForm();
    this.cerrar.emit();
  }

  onGuardar(): void {
    this.intentoGuardar = true;
    if (this.validar()) {
      this.guardar.emit({ ...this.solicitud });
      this.resetForm();
    }
  }

  validar(): boolean {
    this.errores = {};
    
    if (!this.solicitud.nombreProyecto?.trim()) {
      this.errores['nombreProyecto'] = 'El nombre del proyecto es requerido';
    }
    if (!this.solicitud.cliente?.trim()) {
      this.errores['cliente'] = 'El cliente es requerido';
    }
    if (!this.solicitud.responsableId || this.solicitud.responsableId === 0) {
      this.errores['responsableId'] = 'Debe seleccionar un Responsable de AYNI';
    }
    if (!this.solicitud.descripcion?.trim()) {
      this.errores['descripcion'] = 'La descripción es requerida';
    }

    return Object.keys(this.errores).length === 0;
  }

  tieneError(campo: string): boolean {
    return this.intentoGuardar && !!this.errores[campo];
  }

  private resetForm(): void {
    this.solicitud = {
      nombreProyecto: '',
      cliente: '',
      representante: '',
      responsableId: 0,
      descripcion: ''
    };
    this.intentoGuardar = false;
    this.errores = {};
  }
}
