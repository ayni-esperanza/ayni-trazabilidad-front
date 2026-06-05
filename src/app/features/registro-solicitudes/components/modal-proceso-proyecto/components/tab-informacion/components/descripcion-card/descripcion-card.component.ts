import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, Input, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { LinkifyPipe } from '../../../../../../../../shared/pipes/linkify.pipe';
import { ProyectoInfoFormData } from '../../tab-informacion.models';

@Component({
  selector: 'app-descripcion-card',
  standalone: true,
  imports: [CommonModule, FormsModule, CKEditorModule, LinkifyPipe],
  templateUrl: './descripcion-card.component.html'
})
export class DescripcionCardComponent implements OnInit {
  @Input() proyectoInfoForm!: ProyectoInfoFormData;
  @Input() modoSoloLectura = false;

  expandida = false;
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
    if (!this.isBrowser) return;

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

  toggle(): void {
    this.expandida = !this.expandida;
  }
}
