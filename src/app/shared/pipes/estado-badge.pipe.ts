import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'estadoBadge',
  standalone: true
})
export class EstadoBadgePipe implements PipeTransform {
  transform(estado: string): string {
    const clases: { [key: string]: string } = {
      'Completado': 'badge-success',
      'En progreso': 'badge-warning',
      'Pendiente': 'badge-info',
      'Bloqueada': 'badge-danger',
      'Rechazada': 'badge-danger',
      'Aprobada': 'badge-success'
    };

    return clases[estado] || 'badge-default';
  }
}
