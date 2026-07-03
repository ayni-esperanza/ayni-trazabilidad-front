import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { ModalDismissDirective } from '../../directives/modal-dismiss.directive';

export interface ConfirmDeleteConfig {
  titulo?: string;
  mensaje?: string;
  itemNombre?: string;
  cantidadElementos?: number;
  tipoElemento?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  soloCerrar?: boolean;
  ocultarAdvertencia?: boolean;
}

@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [CommonModule, OverlayModule, ModalDismissDirective],
  templateUrl: './confirm-delete-modal.component.html'
})
export class ConfirmDeleteModalComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('modalTemplate') private modalTemplate!: TemplateRef<void>;
  @Input() visible = false;
  @Input() loading = false;
  @Input() config: ConfirmDeleteConfig = {};

  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  private overlayRef: OverlayRef | null = null;
  private viewInitialized = false;

  constructor(
    private readonly overlay: Overlay,
    private readonly viewContainerRef: ViewContainerRef
  ) {}

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.actualizarOverlay();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.viewInitialized) {
      this.actualizarOverlay();
    }
  }

  ngOnDestroy(): void {
    this.cerrarOverlay();
  }

  get titulo(): string {
    return this.config.titulo || 'Confirmar eliminación';
  }

  get mensaje(): string {
    if (this.config.mensaje) return this.config.mensaje;
    
    // Mensaje para eliminación masiva
    if (this.config.cantidadElementos && this.config.cantidadElementos > 1) {
      const tipo = this.config.tipoElemento || 'elemento(s)';
      return `¿Está seguro de que desea eliminar ${this.config.cantidadElementos} ${tipo}?`;
    }
    
    // Mensaje para elemento individual con nombre
    if (this.config.itemNombre) {
      return `¿Estás seguro de que deseas eliminar "${this.config.itemNombre}"?`;
    }
    
    // Mensaje por defecto
    return '¿Estás seguro de que deseas eliminar este elemento?';
  }

  get textoConfirmar(): string {
    return this.config.textoConfirmar || 'Eliminar';
  }

  get textoCancelar(): string {
    return this.config.textoCancelar || 'Cancelar';
  }

  get mostrarConfirmar(): boolean {
    return !this.config.soloCerrar;
  }

  get esEliminacionMasiva(): boolean {
    return (this.config.cantidadElementos || 0) > 1;
  }

  get mostrarAdvertencia(): boolean {
    return !this.config.ocultarAdvertencia;
  }

  get textoSeleccionados(): string {
    return this.config.tipoElemento?.toLowerCase().startsWith('actividad')
      ? 'seleccionadas'
      : 'seleccionados';
  }

  onConfirmar(): void {
    if (!this.loading) {
      this.confirmar.emit();
    }
  }

  onCancelar(): void {
    if (!this.loading) {
      this.cancelar.emit();
    }
  }

  private actualizarOverlay(): void {
    if (!this.visible) {
      this.cerrarOverlay();
      return;
    }

    if (this.overlayRef) return;

    this.overlayRef = this.overlay.create({
      width: '100%',
      height: '100%',
      positionStrategy: this.overlay.position().global().top('0').left('0'),
      scrollStrategy: this.overlay.scrollStrategies.block(),
      disposeOnNavigation: true
    });

    this.overlayRef.attach(new TemplatePortal(this.modalTemplate, this.viewContainerRef));
  }

  private cerrarOverlay(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }
}
