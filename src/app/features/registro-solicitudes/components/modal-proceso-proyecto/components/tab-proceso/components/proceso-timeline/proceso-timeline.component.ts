import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LinkifyPipe } from '../../../../../../../../shared/pipes/linkify.pipe';
import { SelectSearchableComponent } from '../../../../../../../../shared/components/select-searchable/select-searchable.component';

@Component({
  selector: 'app-proceso-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule, LinkifyPipe, SelectSearchableComponent],
  templateUrl: './proceso-timeline.component.html',
  styleUrl: './proceso-timeline.component.css'
})
export class ProcesoTimelineComponent {
  @Input({ required: true }) ctx!: any;

}
