import {
  Component, Input, Output, EventEmitter,
  AfterViewInit, OnChanges, OnDestroy, SimpleChanges,
  ViewChild, ElementRef, PLATFORM_ID, Inject, NgZone
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [],
  styles: [':host { display: block; }'],
  template: `<input #inp type="text" autocomplete="off" class="hidden">`
})
export class DatePickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() value = '';
  @Input() placeholder = 'dd/mm/aaaa';
  @Input() minDate = '';
  @Input() maxDate = '';
  @Input() hasError = false;
  @Input() enableTime = false;
  @Input() inputClass = 'w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white cursor-pointer bg-white dark:bg-gray-700';

  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('inp') inp!: ElementRef<HTMLInputElement>;

  private fp: any;
  private readonly isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private zone: NgZone
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    import('flatpickr').then(m => {
      const flatpickr = (m as any).default ?? m;
      this.fp = flatpickr(this.inp.nativeElement, {
        dateFormat: this.enableTime ? 'Y-m-d H:i' : 'Y-m-d',
        altInput: true,
        altFormat: this.enableTime ? 'd/m/Y H:i' : 'd/m/Y',
        altInputClass: this.inputClass + (this.hasError ? ' !border-red-500' : ''),
        enableTime: this.enableTime,
        time_24hr: true,
        defaultDate: this.value || undefined,
        minDate: this.minDate || undefined,
        maxDate: this.maxDate || undefined,
        onChange: (_: Date[], dateStr: string) => {
          this.zone.run(() => this.valueChange.emit(dateStr));
        }
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.fp) return;
    if (changes['value'] && !changes['value'].firstChange) {
      this.fp.setDate(changes['value'].currentValue || '', false);
    }
    if (changes['minDate'] && !changes['minDate'].firstChange) {
      this.fp.set('minDate', this.minDate || undefined);
    }
    if (changes['maxDate'] && !changes['maxDate'].firstChange) {
      this.fp.set('maxDate', this.maxDate || undefined);
    }
    if (changes['hasError'] && this.fp?.altInput) {
      const alt = this.fp.altInput as HTMLInputElement;
      if (this.hasError) {
        alt.classList.add('!border-red-500');
      } else {
        alt.classList.remove('!border-red-500');
      }
    }
  }

  ngOnDestroy(): void {
    this.fp?.destroy();
  }
}
