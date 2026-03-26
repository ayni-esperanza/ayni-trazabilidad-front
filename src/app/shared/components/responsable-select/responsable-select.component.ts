import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Responsable } from '../../../features/registro-solicitudes/models/solicitud.model';

@Component({
  selector: 'app-responsable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <select
      [ngModel]="value"
      (ngModelChange)="onValueChange($event)"
      [compareWith]="compareValues"
      [disabled]="disabled"
      class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-green-500 outline-none bg-white dark:bg-gray-700 dark:text-white">
      <option [ngValue]="emptyValue">{{ placeholder }}</option>
      <option *ngFor="let resp of responsables" [ngValue]="resp.id">{{ resp.nombre }}</option>
    </select>
  `
})
export class ResponsableSelectComponent {
  @Input() responsables: Responsable[] = [];
  @Input() value: number | string = 0;
  @Input() placeholder = 'Seleccionar Responsable de AYNI';
  @Input() emptyValue: number | string = 0;
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<number | string>();

  compareValues = (a: number | string | null, b: number | string | null): boolean => {
    if (a === null || a === undefined || b === null || b === undefined) {
      return a === b;
    }
    return String(a) === String(b);
  };

  onValueChange(value: number | string): void {
    this.valueChange.emit(value);
  }
}
