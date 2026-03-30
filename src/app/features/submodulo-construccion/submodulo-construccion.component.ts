import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-submodulo-construccion',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './submodulo-construccion.component.html',
})
export class SubmoduloConstruccionComponent {
  private readonly route = inject(ActivatedRoute);

  readonly modulo$ = this.route.queryParamMap.pipe(
    map((params) => params.get('modulo') || 'Submodulo'),
  );
}
