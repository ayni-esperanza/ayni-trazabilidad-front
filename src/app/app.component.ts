import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { ThemeService } from './core/services/theme.service';
import { FlowbiteService } from './core/services/flowbite.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'trazabilidad-front';
  
  constructor(
    private themeService: ThemeService,
    private flowbiteService: FlowbiteService
  ) {
    // El servicio de tema se inicializa automáticamente aquí
  }

  ngOnInit(): void {
    this.flowbiteService.loadFlowbite((flowbite) => {
      flowbite.initFlowbite();
    });
  }
}
