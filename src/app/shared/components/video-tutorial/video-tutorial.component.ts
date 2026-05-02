import { Component, Input, PLATFORM_ID, inject, HostListener } from '@angular/core';
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

  constructor(private sanitizer: DomSanitizer) {}

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
    // Posicionar en esquina inferior derecha por defecto
    this.miniX = window.innerWidth - 344;
    this.miniY = window.innerHeight - 220;
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
  onDragStart(event: MouseEvent): void {
    if (!this.modoMini) return;
    this.dragging = true;
    this.dragOffsetX = event.clientX - this.miniX;
    this.dragOffsetY = event.clientY - this.miniY;
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.dragging) return;
    const maxX = this.isBrowser ? window.innerWidth - 324 : 0;
    const maxY = this.isBrowser ? window.innerHeight - 200 : 0;
    this.miniX = Math.max(0, Math.min(event.clientX - this.dragOffsetX, maxX));
    this.miniY = Math.max(0, Math.min(event.clientY - this.dragOffsetY, maxY));
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.dragging = false;
  }
}
