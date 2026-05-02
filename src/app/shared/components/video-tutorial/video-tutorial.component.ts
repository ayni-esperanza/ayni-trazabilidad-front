import { Component, Input, PLATFORM_ID, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-video-tutorial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-tutorial.component.html',
  styleUrl: './video-tutorial.component.css'
})
export class VideoTutorialComponent {
  @Input() youtubeUrl = '';
  @Input() tooltip = 'Ver video tutorial';

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  mostrarModal = false;
  videoActivado = false;
  modoMini = false;
  safeEmbedUrl: SafeResourceUrl | null = null;

  // Posición del mini player (fixed, desde esquina superior-izquierda)
  miniX = 0;
  miniY = 0;

  // Estado de arrastre
  private dragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  constructor(private sanitizer: DomSanitizer, private el: ElementRef) {}

  get videoId(): string {
    if (!this.youtubeUrl) return '';
    const regExp = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = this.youtubeUrl.match(regExp);
    return match ? match[1] : '';
  }

  get thumbnailUrl(): string {
    return this.videoId
      ? `https://img.youtube.com/vi/${this.videoId}/hqdefault.jpg`
      : '';
  }

  abrirModal(): void {
    if (!this.videoId) return;
    this.mostrarModal = true;
    this.modoMini = false;
  }

  activarVideo(): void {
    if (!this.isBrowser || !this.videoId) return;
    const url = `https://www.youtube-nocookie.com/embed/${this.videoId}?autoplay=1&rel=0&modestbranding=1`;
    this.safeEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.videoActivado = true;
  }

  minimizar(): void {
    if (!this.isBrowser) return;
    
    // Calcular ancho estimado en base a CSS (320px o 100vw - 32px)
    const width = Math.min(320, window.innerWidth - 32);
    const height = 40 + (width * 9 / 16); // Header aprox 40px + 16:9 video

    // Posicionar en esquina inferior derecha por defecto con un margen
    this.miniX = Math.max(0, window.innerWidth - width - 16);
    this.miniY = Math.max(0, window.innerHeight - height - 16);
    this.modoMini = true;
  }

  maximizar(): void {
    this.modoMini = false;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.videoActivado = false;
    this.modoMini = false;
    this.safeEmbedUrl = null;
  }

  // ─── Arrastre del mini player ───────────────────────────────────
  onDragStart(event: MouseEvent | TouchEvent): void {
    if (!this.modoMini) return;
    this.dragging = true;

    const isTouchEvent = 'touches' in event;
    const clientX = isTouchEvent ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = isTouchEvent ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;

    if (!isTouchEvent) {
      event.preventDefault();
    }

    this.dragOffsetX = clientX - this.miniX;
    this.dragOffsetY = clientY - this.miniY;
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onMouseMove(event: MouseEvent | TouchEvent): void {
    if (!this.dragging) return;

    const isTouchEvent = 'touches' in event;
    const clientX = isTouchEvent ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = isTouchEvent ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;

    let width = 320;
    let height = 200;
    if (this.isBrowser) {
      const container = this.el.nativeElement.querySelector('.vt-container--mini');
      if (container) {
        const rect = container.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      }
    }

    const maxX = this.isBrowser ? window.innerWidth - width : 0;
    const maxY = this.isBrowser ? window.innerHeight - height : 0;

    this.miniX = Math.max(0, Math.min(clientX - this.dragOffsetX, maxX));
    this.miniY = Math.max(0, Math.min(clientY - this.dragOffsetY, maxY));
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onMouseUp(): void {
    this.dragging = false;
  }
}
