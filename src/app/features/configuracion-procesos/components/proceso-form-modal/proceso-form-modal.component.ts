import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalDismissDirective } from '../../../../shared/directives/modal-dismiss.directive';

export interface ProcesoFormData {
  id?: number;
  proceso: string;
  area: string;
  etapas: number;
  flujo: string[];
}

@Component({
  selector: 'app-proceso-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalDismissDirective],
  templateUrl: './proceso-form-modal.component.html',
  styleUrls: ['./proceso-form-modal.component.css'],
})
export class ProcesoFormModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() proceso: ProcesoFormData | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<ProcesoFormData>();
  @Output() eliminar = new EventEmitter<number>();

  form: ProcesoFormData = {
    proceso: '',
    area: '',
    etapas: 1,
    flujo: ['Inicio'],
  };

  flujoTexto = 'Inicio';
  flujoPreview: string[] = ['Inicio'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proceso'] || changes['visible']) {
      this.hidratarFormulario();
    }
  }

  private hidratarFormulario(): void {
    if (!this.visible) return;

    if (this.proceso) {
      this.form = {
        id: this.proceso.id,
        proceso: this.proceso.proceso ?? '',
        area: this.proceso.area ?? '',
        etapas: Number.isFinite(this.proceso.etapas) ? this.proceso.etapas : 1,
        flujo: Array.isArray(this.proceso.flujo) && this.proceso.flujo.length ? [...this.proceso.flujo] : ['Inicio'],
      };
    } else {
      this.form = { proceso: '', area: '', etapas: 1, flujo: ['Inicio'] };
    }

    this.flujoTexto = this.form.flujo.join(', ');
    this.actualizarPreviewFlujo(this.flujoTexto);
  }

  onFlujoTextoChange(value: string): void {
    this.flujoTexto = value;
    this.actualizarPreviewFlujo(value);
  }

  onCloseClick(): void {
    this.cerrar.emit();
  }

  onGuardar(): void {
    const flujo = this.parseFlujo(this.flujoTexto);

    const payload: ProcesoFormData = {
      id: this.form.id,
      proceso: (this.form.proceso || '').trim(),
      area: (this.form.area || '').trim(),
      etapas: Math.max(1, Number(this.form.etapas) || 1),
      flujo,
    };

    if (!payload.proceso) return;

    this.guardar.emit(payload);
  }

  onEliminar(): void {
    if (!this.form.id) return;
    this.eliminar.emit(this.form.id);
  }

  private parseFlujo(value: string): string[] {
    const normalized = (value || '').trim();
    if (!normalized) return ['Inicio'];

    const parts = normalized
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    return parts.length ? parts : ['Inicio'];
  }

  private actualizarPreviewFlujo(value: string): void {
    this.flujoPreview = this.parseFlujo(value);
  }
}
