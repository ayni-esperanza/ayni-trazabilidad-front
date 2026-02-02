import { Directive, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

/**
 * Directiva reutilizable para cerrar modales con:
 * - tecla Escape (a nivel document)
 * - click en el backdrop (solo si el click ocurre exactamente sobre el host)
 *
 * Uso recomendado:
 * - Ponerla en el contenedor/backdrop del modal.
 * - El contenedor debe cubrir la pantalla (fixed inset-0) y envolver el contenido.
 */
@Directive({
  selector: '[appModalDismiss]',
  standalone: true,
})
export class ModalDismissDirective {
  /** Habilita/deshabilita la lógica (útil para bindear a visible). */
  @Input() enabled = true;

  /** Alias para enable, permite `[appModalDismiss]="visible"` o `appModalDismiss` como atributo. */
  @Input('appModalDismiss')
  set appModalDismiss(value: boolean | '' | null | undefined) {
    // Si viene como atributo (""), se considera true.
    this.enabled = value === '' ? true : !!value;
  }

  @Input() closeOnEscape = true;
  @Input() closeOnBackdrop = true;

  /**
   * Selector CSS del elemento que representa el contenido del modal.
   * Si el click ocurre dentro de ese elemento, NO se cierra.
   */
  @Input() contentSelector = '[data-modal-content]';

  /**
   * Selectores adicionales que deben ignorarse (ej: dropdowns de editores).
   * El click en estos elementos NO cerrará el modal.
   */
  @Input() ignoreSelectors = '.ck, .ck-body-wrapper, .ck-balloon-panel, .tox, .tox-tinymce-aux';

  @Output() dismissed = new EventEmitter<'escape' | 'backdrop'>();

  constructor(private host: ElementRef<HTMLElement>) {}

  @HostListener('click', ['$event'])
  onHostClick(event: MouseEvent): void {
    if (!this.enabled || !this.closeOnBackdrop) return;

    const target = event.target as Node | null;
    if (!target) return;

    // Si existe un "contenido" y el click ocurrió dentro, no cerrar.
    const content = this.host.nativeElement.querySelector(this.contentSelector);
    if (content && content.contains(target)) return;

    // Ignorar clics en elementos de editores (CKEditor, TinyMCE, etc.)
    if (this.ignoreSelectors && target instanceof Element) {
      const selectors = this.ignoreSelectors.split(',').map(s => s.trim());
      for (const selector of selectors) {
        // Verificar si el target está dentro de un elemento que coincida con el selector
        const matchingElement = document.querySelector(selector);
        if (matchingElement && matchingElement.contains(target)) return;
        // También verificar si el target mismo o algún ancestro coincide
        if (target.closest(selector)) return;
      }
    }

    event.preventDefault();
    event.stopPropagation();
    this.dismissed.emit('backdrop');
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.enabled || !this.closeOnEscape) return;
    if (event.key !== 'Escape') return;

    event.preventDefault();
    event.stopPropagation();
    this.dismissed.emit('escape');
  }
}
