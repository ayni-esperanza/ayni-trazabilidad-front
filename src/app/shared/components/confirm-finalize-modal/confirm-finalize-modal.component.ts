import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalDismissDirective } from '../../directives/modal-dismiss.directive';

export interface ConfirmFinalizeConfig {
  titulo?: string;
  mensaje?: string;
  itemNombre?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
}

@Component({
  selector: 'app-confirm-finalize-modal',
  standalone: true,
  imports: [CommonModule, ModalDismissDirective],
  templateUrl: './confirm-finalize-modal.component.html'
})
export class ConfirmFinalizeModalComponent {
  @Input() visible = false;
  @Input() loading = false;
  @Input() config: ConfirmFinalizeConfig = {};

  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  get titulo(): string {
    return this.config.titulo || 'Confirmar finalizacion';
  }

  get mensaje(): string {
    if (this.config.mensaje) return this.config.mensaje;

    if (this.config.itemNombre) {
      return `¿Esta seguro de finalizar "${this.config.itemNombre}"?`;
    }

    return '¿Esta seguro de finalizar este proyecto?';
  }

  get textoConfirmar(): string {
    return this.config.textoConfirmar || 'Finalizar';
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
