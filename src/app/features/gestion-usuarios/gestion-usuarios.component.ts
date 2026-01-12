import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GestionUsuariosService } from './services/gestion-usuarios.service';

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestion-usuarios.component.html',
  styleUrls: ['./gestion-usuarios.component.css']
})
export class GestionUsuariosComponent implements OnInit {
  
  constructor(private usuariosService: GestionUsuariosService) {}

  ngOnInit(): void {
    // Inicialización del componente
  }
}
