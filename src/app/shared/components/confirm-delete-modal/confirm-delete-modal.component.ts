import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalDismissDirective } from '../../directives/modal-dismiss.directive';

export interface ConfirmDeleteConfig {
  titulo?: string;
  mensaje?: string;
  itemNombre?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
}

@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [CommonModule, ModalDismissDirective],
  templateUrl: './confirm-delete-modal.component.html'
})
export class ConfirmDeleteModalComponent {
  @Input() visible = false;
  @Input() loading = false;
  @Input() config: ConfirmDeleteConfig = {};

  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  get titulo(): string {
    return this.config.titulo || 'Confirmar eliminación';
  }

  get mensaje(): string {
    if (this.config.mensaje) return this.config.mensaje;
    if (this.config.itemNombre) {
      return `¿Estás seguro de que deseas eliminar "${this.config.itemNombre}"?`;
    }
    return '¿Estás seguro de que deseas eliminar este elemento?';
  }

  get textoConfirmar(): string {
    return this.config.textoConfirmar || 'Eliminar';
  }

  get textoCancelar(): string {
    return this.config.textoCancelar || 'Cancelar';
  }

  onConfirmar(): void {
    if (!this.loading) {
      this.confirmar.emit();
    }
  }

  onCancelar(): void {
    if (!this.loading) {
      this.cancelar.emit();
    }
  }
}
