import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalDismissDirective } from '../../../../shared/directives/modal-dismiss.directive';
import { Firma, FirmaRequest } from '../../models/firma.model';

export interface FirmaFormData {
  id?: number;
  nombre: string;
  cargo: string;
  imagenBase64: string;
}

@Component({
  selector: 'app-firma-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalDismissDirective],
  templateUrl: './firma-form-modal.component.html',
  styleUrls: ['./firma-form-modal.component.css'],
})
export class FirmaFormModalComponent implements OnChanges, AfterViewInit {
  @Input() visible = false;
  @Input() firma: Firma | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<FirmaFormData>();

  @ViewChild('canvasFirma', { static: false })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  protected form: FirmaFormData = {
    nombre: '',
    cargo: '',
    imagenBase64: '',
  };

  // Control de validación
  protected intentoGuardar = false;
  protected errores: { [key: string]: string } = {};

  // Canvas state
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  protected hasSignature = false;

  // Configuración del trazo
  protected strokeColor = '#000000';
  protected strokeWidth = 2;

  protected readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.hidratarFormulario();
      this.intentoGuardar = false;
      this.errores = {};

      // Inicializar canvas después de que el modal sea visible
      setTimeout(() => this.initCanvas(), 50);
    }
  }

  ngAfterViewInit(): void {
    if (this.visible) {
      this.initCanvas();
    }
  }

  private hidratarFormulario(): void {
    if (this.firma) {
      this.form = {
        id: this.firma.id,
        nombre: this.firma.nombre || '',
        cargo: this.firma.cargo || '',
        imagenBase64: this.firma.imagenBase64 || '',
      };
      this.hasSignature = !!this.firma.imagenBase64;
    } else {
      this.form = {
        nombre: '',
        cargo: '',
        imagenBase64: '',
      };
      this.hasSignature = false;
    }
  }

  private initCanvas(): void {
    if (!this.isBrowser || !this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');

    if (this.ctx) {
      // Configurar el canvas
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = this.strokeColor;
      this.ctx.lineWidth = this.strokeWidth;

      // Limpiar y establecer fondo blanco
      this.clearCanvas();

      // Si hay una firma existente, cargarla
      if (this.form.imagenBase64) {
        this.loadExistingSignature();
      }
    }

    // Event listeners para dibujar
    canvas.addEventListener('mousedown', this.startDrawing.bind(this));
    canvas.addEventListener('mousemove', this.draw.bind(this));
    canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
    canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

    // Touch events para dispositivos móviles
    canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    canvas.addEventListener('touchend', this.stopDrawing.bind(this));
  }

  private loadExistingSignature(): void {
    if (!this.ctx || !this.form.imagenBase64) return;

    const img = new Image();
    img.onload = () => {
      if (this.ctx && this.canvasRef) {
        const canvas = this.canvasRef.nativeElement;
        this.ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    };
    img.src = this.form.imagenBase64;
  }

  private startDrawing(e: MouseEvent): void {
    if (!this.ctx) return;

    this.isDrawing = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.lastX = e.clientX - rect.left;
    this.lastY = e.clientY - rect.top;
  }

  private draw(e: MouseEvent): void {
    if (!this.isDrawing || !this.ctx) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    this.lastX = x;
    this.lastY = y;
    this.hasSignature = true;
  }

  private stopDrawing(): void {
    this.isDrawing = false;
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (!this.ctx || e.touches.length === 0) return;

    this.isDrawing = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = e.touches[0];
    this.lastX = touch.clientX - rect.left;
    this.lastY = touch.clientY - rect.top;
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing || !this.ctx || e.touches.length === 0) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    this.lastX = x;
    this.lastY = y;
    this.hasSignature = true;
  }

  protected clearCanvas(): void {
    if (!this.ctx || !this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.hasSignature = false;
    this.form.imagenBase64 = '';
  }

  protected updateStrokeSettings(): void {
    if (this.ctx) {
      this.ctx.strokeStyle = this.strokeColor;
      this.ctx.lineWidth = this.strokeWidth;
    }
  }

  protected onCloseClick(): void {
    this.intentoGuardar = false;
    this.errores = {};
    this.cerrar.emit();
  }

  protected onGuardar(): void {
    this.intentoGuardar = true;

    // Capturar la firma del canvas
    if (this.canvasRef && this.hasSignature) {
      this.form.imagenBase64 = this.canvasRef.nativeElement.toDataURL('image/png');
    }

    if (!this.validarFormulario()) return;

    const payload: FirmaFormData = {
      id: this.form.id,
      nombre: (this.form.nombre || '').trim(),
      cargo: (this.form.cargo || '').trim(),
      imagenBase64: this.form.imagenBase64,
    };

    this.guardar.emit(payload);
  }

  protected validarFormulario(): boolean {
    this.errores = {};

    if (!(this.form.nombre || '').trim()) {
      this.errores['nombre'] = 'El nombre de la firma es requerido';
    }

    if (!this.hasSignature && !this.form.imagenBase64) {
      this.errores['firma'] = 'Debe dibujar una firma';
    }

    return Object.keys(this.errores).length === 0;
  }

  protected tieneError(campo: string): boolean {
    return this.intentoGuardar && !!this.errores[campo];
  }
}
