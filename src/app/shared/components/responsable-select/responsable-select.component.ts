import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Responsable } from '../../../features/registro-solicitudes/models/solicitud.model';
import { SelectSearchableComponent, SelectSearchableOption } from '../select-searchable/select-searchable.component';

@Component({
  selector: 'app-responsable-select',
  standalone: true,
  imports: [CommonModule, SelectSearchableComponent],
  template: `
    <app-select-searchable
      [options]="responsableOptions"
      [value]="value"
      [placeholder]="placeholder"
      searchPlaceholder="Buscar responsable..."
      [emptyValue]="emptyValue"
      [allowEmpty]="true"
      [disabled]="disabled"
      [buttonClass]="resolvedButtonClass"
      (valueChange)="onValueChange($event)">
    </app-select-searchable>
  `
})
export class ResponsableSelectComponent {
  @Input() responsables: Responsable[] = [];
  @Input() value: number | string = 0;
  @Input() placeholder = 'Seleccionar Responsable de AYNI';
  @Input() emptyValue: number | string = 0;
  @Input() disabled = false;
  @Input() hasError = false;
  @Input() inputClass = 'w-full px-3 pr-9 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white dark:bg-gray-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed';

  @Output() valueChange = new EventEmitter<number | string>();

  get responsableOptions(): SelectSearchableOption[] {
    return this.responsables.map((resp) => ({ value: resp.id, label: resp.nombre }));
  }

  get resolvedButtonClass(): string {
    return [
      this.inputClass,
      this.hasError ? '!border-red-500' : '',
      this.isPlaceholderActive() ? 'text-gray-500 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100'
    ].filter(Boolean).join(' ');
  }

  compareValues = (a: number | string | null, b: number | string | null): boolean => {
    if (a === null || a === undefined || b === null || b === undefined) {
      return a === b;
    }
    return String(a) === String(b);
  };

  onValueChange(value: unknown): void {
    this.valueChange.emit(this.normalizarValor(value));
  }

  isPlaceholderActive(): boolean {
    return this.compareValues(this.value, this.emptyValue);
  }

  private normalizarValor(value: unknown): number | string {
    if (typeof this.emptyValue === 'number') {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : this.emptyValue;
    }
    return value === null || value === undefined ? this.emptyValue : String(value);
  }
}
