import { Overlay, OverlayModule, ConnectedPosition, ScrollStrategy } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

type SelectSearchableOption = string | number | { value: string | number | null; label: string };

@Component({
  selector: 'app-select-searchable',
  standalone: true,
  imports: [CommonModule, FormsModule, OverlayModule],
  template: `
    <div class="relative">
      <button
        #triggerButton
        cdkOverlayOrigin
        #overlayOrigin="cdkOverlayOrigin"
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

      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="overlayOrigin"
        [cdkConnectedOverlayOpen]="isOpen"
        [cdkConnectedOverlayPositions]="dropdownPositions"
        [cdkConnectedOverlayWidth]="dropdownWidth"
        [cdkConnectedOverlayHasBackdrop]="true"
        [cdkConnectedOverlayPush]="true"
        [cdkConnectedOverlayViewportMargin]="8"
        [cdkConnectedOverlayScrollStrategy]="scrollStrategy"
        cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
        (backdropClick)="closeDropdown()"
        (detach)="closeDropdown()">
        <div
          class="z-[10000] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
          (keydown.escape)="closeDropdown()">
          <div class="border-b border-gray-100 p-1 dark:border-gray-700">
            <input
              #searchInput
              type="text"
              [(ngModel)]="searchText"
              (ngModelChange)="filtrarOpciones($event)"
              [placeholder]="searchPlaceholder"
              class="w-full rounded border border-gray-300 px-2 py-0.5 text-[11px] leading-4 text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>

          <div class="max-h-44 overflow-y-auto py-0.5">
            <button
              *ngIf="allowEmpty"
              type="button"
              (click)="seleccionar(emptyValue)"
              class="flex w-full items-center px-2 py-1 text-left text-[11px] leading-4 text-gray-600 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
              {{ placeholder }}
            </button>

            <button
              *ngFor="let option of filteredOptions; trackBy: trackByOption"
              type="button"
              (click)="seleccionar(getOptionValue(option))"
              class="flex w-full items-center px-2 py-1 text-left text-[11px] leading-4 text-gray-700 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700">
              <span class="truncate">{{ getOptionLabel(option) }}</span>
            </button>

            <p *ngIf="!filteredOptions.length" class="px-2 py-1.5 text-[11px] text-gray-500 dark:text-gray-400">
              Sin resultados
            </p>
          </div>
        </div>
      </ng-template>
    </div>
  `
})
export class SelectSearchableComponent implements OnChanges, OnDestroy {
  @Input() options: SelectSearchableOption[] = [];
  @Input() value: string | number | null = '';
  @Input() placeholder = 'Seleccionar';
  @Input() searchPlaceholder = 'Buscar...';
  @Input() emptyValue: string | number | null = '';
  @Input() allowEmpty = true;
  @Input() disabled = false;
  @Input() buttonClass = '';

  @Output() valueChange = new EventEmitter<string | number | null>();

  @ViewChild('triggerButton') triggerButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  isOpen = false;
  searchText = '';
  filteredOptions: SelectSearchableOption[] = [];
  dropdownWidth: number | string = 'auto';
  readonly scrollStrategy: ScrollStrategy;
  readonly dropdownPositions: ConnectedPosition[] = [
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
      offsetY: 4
    },
    {
      originX: 'end',
      originY: 'bottom',
      overlayX: 'end',
      overlayY: 'top',
      offsetY: 4
    },
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'bottom',
      offsetY: -4
    },
    {
      originX: 'end',
      originY: 'top',
      overlayX: 'end',
      overlayY: 'bottom',
      offsetY: -4
    }
  ];

  constructor(private readonly overlay: Overlay) {
    this.scrollStrategy = this.overlay.scrollStrategies.reposition();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.filteredOptions = [...this.options];
  }

  ngOnDestroy(): void {
    this.closeDropdown();
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

    if (this.isOpen) {
      this.closeDropdown();
      return;
    }

    this.dropdownWidth = this.triggerButton?.nativeElement.getBoundingClientRect().width || 'auto';
    this.isOpen = true;
    this.searchText = '';
    this.filteredOptions = [...this.options];
    setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
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
    this.closeDropdown();
  }

  closeDropdown(): void {
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
