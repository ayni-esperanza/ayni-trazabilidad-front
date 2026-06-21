import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

type SelectSearchableOption = string | number | { value: string | number | null; label: string };

@Component({
  selector: 'app-select-searchable',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative" (focusout)="onFocusOut()">
      <button
        #triggerBtn
        type="button"
        [disabled]="disabled"
        (click)="toggleDropdown()"
        class="flex w-full items-center justify-between gap-2 rounded border border-gray-300 bg-white px-2 py-0.5 text-left text-xs text-gray-900 transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-gray-500"
        [ngClass]="buttonClass">
        <span class="truncate" [ngClass]="selectedLabel ? '' : 'text-gray-500 dark:text-gray-300'">{{ selectedLabel || placeholder }}</span>
        <svg
          class="h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-300"
          [ngClass]="{ 'rotate-180': isOpen }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        *ngIf="isOpen"
        class="fixed z-[200] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
        [style.top.px]="dropdownTop"
        [style.left.px]="dropdownLeft"
        [style.width.px]="dropdownWidth">
        <div class="border-b border-gray-100 p-2 dark:border-gray-700">
          <input
            type="text"
            [(ngModel)]="searchText"
            (ngModelChange)="filtrarOpciones($event)"
            [placeholder]="searchPlaceholder"
            class="w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
        </div>

        <div class="max-h-52 overflow-y-auto py-1">
          <button
            *ngIf="allowEmpty"
            type="button"
            (click)="seleccionar(emptyValue)"
            class="flex w-full items-center px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
            {{ placeholder }}
          </button>

          <button
            *ngFor="let option of filteredOptions; trackBy: trackByOption"
            type="button"
            (click)="seleccionar(getOptionValue(option))"
            class="flex w-full items-center px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700">
            <span class="truncate">{{ getOptionLabel(option) }}</span>
          </button>

          <p *ngIf="!filteredOptions.length" class="px-2 py-2 text-xs text-gray-500 dark:text-gray-400">
            Sin resultados
          </p>
        </div>
      </div>
    </div>
  `
})
export class SelectSearchableComponent implements OnChanges {
  @Input() options: SelectSearchableOption[] = [];
  @Input() value: string | number | null = '';
  @Input() placeholder = 'Seleccionar';
  @Input() searchPlaceholder = 'Buscar...';
  @Input() emptyValue: string | number | null = '';
  @Input() allowEmpty = true;
  @Input() disabled = false;
  @Input() buttonClass = '';

  @Output() valueChange = new EventEmitter<string | number | null>();

  @ViewChild('triggerBtn') triggerBtn?: ElementRef<HTMLButtonElement>;

  isOpen = false;
  dropdownTop = 0;
  dropdownLeft = 0;
  dropdownWidth = 0;
  searchText = '';
  filteredOptions: SelectSearchableOption[] = [];

  ngOnChanges(_changes: SimpleChanges): void {
    this.filteredOptions = [...this.options];
  }

  get selectedLabel(): string {
    if (this.value === null || this.value === undefined || String(this.value) == String(this.emptyValue)) {
      return '';
    }

    const match = this.options.find((option) => String(this.getOptionValue(option)) === String(this.value));
    return match !== undefined ? this.getOptionLabel(match) : String(this.value || '');
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchText = '';
      this.filteredOptions = [...this.options];
      this.actualizarPosicionDropdown();
    }
  }

  onFocusOut(): void {
    setTimeout(() => {
      this.isOpen = false;
      this.searchText = '';
      this.filteredOptions = [...this.options];
    }, 150);
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange(): void {
    if (this.isOpen) {
      this.actualizarPosicionDropdown();
    }
  }

  private actualizarPosicionDropdown(): void {
    const rect = this.triggerBtn?.nativeElement.getBoundingClientRect();
    if (!rect) return;

    this.dropdownTop = rect.bottom + 4;
    this.dropdownLeft = rect.left;
    this.dropdownWidth = rect.width;
  }

  filtrarOpciones(term: string): void {
    const normalized = String(term || '').trim().toLowerCase();
    if (!normalized) {
      this.filteredOptions = [...this.options];
      return;
    }

    this.filteredOptions = this.options.filter((option) =>
      this.getOptionLabel(option).toLowerCase().includes(normalized)
    );
  }

  seleccionar(value: string | number | null): void {
    this.value = value;
    this.valueChange.emit(value);
    this.isOpen = false;
    this.searchText = '';
    this.filteredOptions = [...this.options];
  }

  getOptionLabel(option: SelectSearchableOption): string {
    return typeof option === 'object' && option !== null
      ? String(option.label ?? '')
      : String(option ?? '');
  }

  getOptionValue(option: SelectSearchableOption): string | number | null {
    return typeof option === 'object' && option !== null
      ? (option.value ?? null)
      : option;
  }

  readonly trackByOption = (_index: number, option: SelectSearchableOption): string => {
    return String(this.getOptionValue(option));
  };
}
