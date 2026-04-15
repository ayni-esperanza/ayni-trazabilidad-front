import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-screen.component.html',
  styleUrl: './loading-screen.component.css',
})
export class LoadingScreenComponent implements OnInit, OnDestroy {
  loadingText = 'Cargando';

  private navigationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const source = this.route.snapshot.queryParamMap.get('source') || 'generic';
    const nextRaw = this.route.snapshot.queryParamMap.get('next') || '/login';
    const nextUrl = this.sanitizeNextUrl(nextRaw);

    if (source === 'logout') {
      this.loadingText = 'Cerrando sesion';
    }

    const durationMs = source === 'logout' ? 300 : 850;

    this.navigationTimer = setTimeout(() => {
      void this.router.navigateByUrl(nextUrl, { replaceUrl: true });
    }, durationMs);
  }

  ngOnDestroy(): void {
    if (this.navigationTimer) {
      clearTimeout(this.navigationTimer);
      this.navigationTimer = null;
    }
  }

  private sanitizeNextUrl(url: string): string {
    const value = (url || '').trim();
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
      return '/login';
    }

    if (value.startsWith('/loading')) {
      return '/login';
    }

    return value;
  }
}
