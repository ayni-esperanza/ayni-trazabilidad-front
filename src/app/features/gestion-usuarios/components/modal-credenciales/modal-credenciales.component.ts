import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuarioResponse } from '../../models/usuario.model';

@Component({
  selector: 'app-modal-credenciales',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-credenciales.component.html',
})
export class ModalCredencialesComponent {
  @Input({ required: true }) usuario!: UsuarioResponse;
  @Input({ required: true }) password!: string;
  @Output() cerrarModal = new EventEmitter<void>();

  copiado = false;

  copiarPassword(): void {
    navigator.clipboard.writeText(this.password).then(() => {
      this.copiado = true;
      setTimeout(() => {
        this.copiado = false;
      }, 2000);
    });
  }

  enviarPorWhatsApp(): void {
    const mensaje = `Hola ${this.usuario.nombre},\n\nTus credenciales de acceso al sistema son:\n\nUsuario: ${this.usuario.username}\nContraseña: ${this.password}\n\nPor favor, cambia tu contraseña en el primer acceso.`;
    const telefono = this.usuario.telefono?.replace(/\D/g, ''); // Eliminar caracteres no numéricos
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  cerrar(): void {
    this.cerrarModal.emit();
  }
}
