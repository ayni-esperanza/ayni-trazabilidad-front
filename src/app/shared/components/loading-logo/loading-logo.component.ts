import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-logo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-logo.component.html',
  styleUrls: ['./loading-logo.component.css']
})
export class LoadingLogoComponent {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() text: string = 'Cargando...';
  @Input() showText: boolean = true;
}
