import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tabla-generica',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tabla-container">
      <table class="tabla">
        <thead>
          <tr>
            <th *ngFor="let columna of columnas">{{ columna.header }}</th>
            <th *ngIf="mostrarAcciones">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of datos">
            <td *ngFor="let columna of columnas">
              {{ obtenerValor(item, columna.field) }}
            </td>
            <td *ngIf="mostrarAcciones" class="acciones">
              <button *ngIf="permitirEditar" (click)="editar.emit(item)" class="btn-accion">
                ✏️
              </button>
              <button *ngIf="permitirEliminar" (click)="eliminar.emit(item)" class="btn-accion">
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .tabla-container {
      overflow-x: auto;
    }

    .tabla {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .tabla th {
      background: #f5f5f5;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #ddd;
    }

    .tabla td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }

    .tabla tr:hover {
      background: #f9f9f9;
    }

    .acciones {
      display: flex;
      gap: 8px;
    }

    .btn-accion {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .btn-accion:hover {
      background: #f0f0f0;
    }
  `]
})
export class TablaGenericaComponent {
  @Input() datos: any[] = [];
  @Input() columnas: { field: string, header: string }[] = [];
  @Input() mostrarAcciones: boolean = true;
  @Input() permitirEditar: boolean = true;
  @Input() permitirEliminar: boolean = true;

  @Output() editar = new EventEmitter<any>();
  @Output() eliminar = new EventEmitter<any>();

  obtenerValor(objeto: any, campo: string): any {
    return campo.split('.').reduce((obj, key) => obj?.[key], objeto);
  }
}
