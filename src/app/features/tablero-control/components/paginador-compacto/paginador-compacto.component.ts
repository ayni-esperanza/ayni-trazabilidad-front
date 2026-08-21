import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paginador-compacto',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex min-w-0 items-center justify-between gap-2 pt-2 text-[11px] text-gray-500 dark:text-gray-400">
      <span class="hidden min-w-0 truncate sm:block">Mostrando {{ desde }}&ndash;{{ hasta }} de {{ totalElements | number }}</span>
      <span class="sm:hidden">Página {{ page + 1 }} de {{ totalPages || 1 }}</span>
      <div class="flex shrink-0 items-center gap-1">
        <div class="relative hidden sm:block">
          <button type="button" (click)="toggleDropdown()" (blur)="cerrarDropdown()" [disabled]="loading"
            class="flex h-7 min-w-[62px] items-center gap-1 rounded-lg border border-gray-300 bg-white pl-2 pr-1.5 text-[11px] text-gray-700 outline-none transition-colors hover:bg-gray-50 focus:border-green-500 focus:ring-2 focus:ring-green-500 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
            <span class="flex-1 text-left">{{ size }}</span>
            <svg class="h-3.5 w-3.5 flex-none text-gray-500 transition-transform duration-200 ease-out dark:text-gray-300" [class.rotate-180]="dropdownAbierto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" />
            </svg>
          </button>
          @if (dropdownAbierto) {
            <div class="absolute bottom-full left-0 z-[1000] mb-1 min-w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg animate-dropdown dark:border-gray-600 dark:bg-gray-700">
              @for (opcion of opciones; track opcion) {
                <button type="button" (mousedown)="seleccionarOpcion(opcion)" class="w-full px-2 py-1.5 text-left text-[11px] text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600" [class.font-semibold]="opcion === size" [class.text-green-600]="opcion === size" [class.dark:text-green-400]="opcion === size">{{ opcion }}</button>
              }
            </div>
          }
        </div>
        @if (totalElements > size) {
          <button type="button" (click)="anterior.emit()" [disabled]="page === 0 || loading" title="Página anterior" aria-label="Página anterior" class="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 19-7-7 7-7" /></svg>
          </button>
          <button type="button" (click)="siguiente.emit()" [disabled]="page + 1 >= totalPages || loading" title="Página siguiente" aria-label="Página siguiente" class="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 5 7 7-7 7" /></svg>
          </button>
        }
      </div>
    </div>`
})
export class PaginadorCompactoComponent {
  readonly opciones: Array<100 | 500 | 1000> = [100, 500, 1000];
  dropdownAbierto = false;
  @Input() page = 0;
  @Input() size: 100 | 500 | 1000 = 100;
  @Input() totalElements = 0;
  @Input() totalPages = 0;
  @Input() loading = false;
  @Output() anterior = new EventEmitter<void>();
  @Output() siguiente = new EventEmitter<void>();
  @Output() sizeChange = new EventEmitter<100 | 500 | 1000>();
  toggleDropdown(): void { this.dropdownAbierto = !this.dropdownAbierto; }
  cerrarDropdown(): void { this.dropdownAbierto = false; }
  seleccionarOpcion(size: 100 | 500 | 1000): void { this.sizeChange.emit(size); this.cerrarDropdown(); }
  get desde(): number { return this.totalElements === 0 ? 0 : this.page * this.size + 1; }
  get hasta(): number { return Math.min((this.page + 1) * this.size, this.totalElements); }
}

