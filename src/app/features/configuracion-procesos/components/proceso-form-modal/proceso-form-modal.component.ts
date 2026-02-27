import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalDismissDirective } from '../../../../shared/directives/modal-dismiss.directive';
import { ConfirmDeleteModalComponent, ConfirmDeleteConfig } from '../../../../shared/components/confirm-delete-modal/confirm-delete-modal.component';

export interface ProcesoFormData {
  id?: number;
  proceso: string;
  area: string;
  flujo: string[];
}

@Component({
  selector: 'app-proceso-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalDismissDirective, ConfirmDeleteModalComponent],
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
    flujo: ['Inicio'],
  };

  // Control de validación
  intentoGuardar = false;
  errores: { [key: string]: string } = {};
  Object = Object;  // Para usar en el template
  
  // Modal de confirmación de eliminación
  mostrarConfirmacionEliminar = false;
  cargandoEliminacion = false;
  configEliminarModal: ConfirmDeleteConfig = {};

  flujoTexto = 'Inicio';
  flujoPreview: string[] = ['Inicio'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proceso'] || changes['visible']) {
      this.hidratarFormulario();
      this.intentoGuardar = false;
      this.errores = {};
      this.mostrarConfirmacionEliminar = false;
    }
  }

  private hidratarFormulario(): void {
    if (!this.visible) return;

    if (this.proceso) {
      this.form = {
        id: this.proceso.id,
        proceso: this.proceso.proceso ?? '',
        area: this.proceso.area ?? '',
        flujo: Array.isArray(this.proceso.flujo) && this.proceso.flujo.length ? [...this.proceso.flujo] : ['Inicio'],
      };
    } else {
      this.form = { proceso: '', area: '', flujo: ['Inicio'] };
    }

    this.flujoTexto = this.form.flujo.join(', ');
    this.actualizarPreviewFlujo(this.flujoTexto);
  }

  onFlujoTextoChange(value: string): void {
    this.flujoTexto = value;
    this.actualizarPreviewFlujo(value);
  }

  onCloseClick(): void {
    this.intentoGuardar = false;
    this.errores = {};
    this.mostrarConfirmacionEliminar = false;
    this.cerrar.emit();
  }

  onGuardar(): void {
    this.intentoGuardar = true;
    
    if (!this.validarFormulario()) return;

    const flujo = this.parseFlujo(this.flujoTexto);

    const payload: ProcesoFormData = {
      id: this.form.id,
      proceso: (this.form.proceso || '').trim(),
      area: (this.form.area || '').trim(),
      flujo,
    };

    this.guardar.emit(payload);
  }

  validarFormulario(): boolean {
    this.errores = {};

    if (!(this.form.proceso || '').trim()) {
      this.errores['proceso'] = 'El nombre del proceso es requerido';
    }
    if (!(this.form.area || '').trim()) {
      this.errores['area'] = 'El área es requerida';
    }
    if (!this.flujoTexto.trim() || this.parseFlujo(this.flujoTexto).length < 2) {
      this.errores['flujo'] = 'El flujo debe tener al menos 2 etapas';
    }

    return Object.keys(this.errores).length === 0;
  }

  tieneError(campo: string): boolean {
    return this.intentoGuardar && !!this.errores[campo];
  }

  onIniciarEliminar(): void {
    if (!this.form.id) return;
    this.configEliminarModal = {
      titulo: 'Eliminar proceso',
      mensaje: '¿Estás seguro de que deseas eliminar este proceso?',
      cantidadElementos: 1,
      tipoElemento: 'proceso',
      textoConfirmar: 'Eliminar'
    };
    this.mostrarConfirmacionEliminar = true;
  }

  async onConfirmarEliminar(): Promise<void> {
    if (!this.form.id) return;
    
    this.cargandoEliminacion = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      this.eliminar.emit(this.form.id);
      this.mostrarConfirmacionEliminar = false;
    } finally {
      this.cargandoEliminacion = false;
    }
  }

  onCancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
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
