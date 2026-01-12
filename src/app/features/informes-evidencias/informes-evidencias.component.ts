import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InformesEvidenciasService } from './services/informes-evidencias.service';

@Component({
  selector: 'app-informes-evidencias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './informes-evidencias.component.html',
  styleUrls: ['./informes-evidencias.component.css']
})
export class InformesEvidenciasComponent implements OnInit {
  
  constructor(private informesService: InformesEvidenciasService) {}

  ngOnInit(): void {
    // Inicialización del componente
  }
}
