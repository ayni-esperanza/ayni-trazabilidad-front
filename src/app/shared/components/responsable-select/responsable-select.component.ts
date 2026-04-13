import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Responsable } from '../../../features/registro-solicitudes/models/solicitud.model';

@Component({
  selector: 'app-responsable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative">
      <select
        [ngModel]="value"
        (ngModelChange)="onValueChange($event)"
        [compareWith]="compareValues"
        [disabled]="disabled"
        [ngClass]="{
          'text-gray-400 dark:text-gray-500': isPlaceholderActive(),
          'text-gray-900 dark:text-white': !isPlaceholderActive()
        }"
        (mousedown)="onAbrirDropdown()"
        (focus)="onAbrirDropdown()"
        (blur)="onCerrarDropdown()"
        (keydown.escape)="onCerrarDropdown()"
        (keydown.tab)="onCerrarDropdown()"
        style="appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:none;"
        class="w-full appearance-none px-3 pr-9 py-1.5 text-sm border border-gray-400 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white dark:bg-gray-700">
        <option [ngValue]="emptyValue" class="text-gray-400">{{ placeholder }}</option>
        <option *ngFor="let resp of responsables" [ngValue]="resp.id" class="text-gray-900">{{ resp.nombre }}</option>
      </select>

      <svg
        class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 dark:text-gray-300 transition-transform duration-200 ease-out"
        [ngClass]="{ 'rotate-180': dropdownAbierto }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </div>
  `
})
export class ResponsableSelectComponent {
  @Input() responsables: Responsable[] = [];
  @Input() value: number | string = 0;
  @Input() placeholder = 'Seleccionar Responsable de AYNI';
  @Input() emptyValue: number | string = 0;
  @Input() disabled = false;
  dropdownAbierto = false;

  @Output() valueChange = new EventEmitter<number | string>();

  compareValues = (a: number | string | null, b: number | string | null): boolean => {
    if (a === null || a === undefined || b === null || b === undefined) {
      return a === b;
    }
    return String(a) === String(b);
  };

  onValueChange(value: number | string): void {
    this.dropdownAbierto = false;
    this.valueChange.emit(value);
  }

  onAbrirDropdown(): void {
    if (!this.disabled) {
      this.dropdownAbierto = true;
    }
  }

  onCerrarDropdown(): void {
    this.dropdownAbierto = false;
  }

  isPlaceholderActive(): boolean {
    return this.compareValues(this.value, this.emptyValue);
  }
}
