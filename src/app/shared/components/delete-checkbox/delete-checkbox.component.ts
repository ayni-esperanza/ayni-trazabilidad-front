import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-delete-checkbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delete-checkbox.component.html',
  styleUrls: ['./delete-checkbox.component.css']
})
export class DeleteCheckboxComponent implements OnChanges {
  @Input() visible = false;
  @Input() textoConfirmacion = 'Confirmo que deseo eliminar este elemento';
  @Input() textoBoton = 'Eliminar';
  @Input() disabled = false;
  
  @Output() confirmar = new EventEmitter<void>();
  
  confirmado = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && !this.visible) {
      this.confirmado = false;
    }
  }

  onConfirmar(): void {
    if (this.confirmado && !this.disabled) {
      this.confirmar.emit();
      this.confirmado = false;
    }
  }

  get puedeEliminar(): boolean {
    return this.confirmado && !this.disabled;
  }
}
