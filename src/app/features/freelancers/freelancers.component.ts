import { Component } from '@angular/core';

@Component({
  selector: 'app-freelancers',
  standalone: true,
  template: `
    <div class="page-container">
      <h1>Freelancers</h1>
      <p>Liste des freelancers disponibles.</p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      font-size: 1.8rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.5rem;
    }
    p {
      color: #6b7280;
      font-size: 0.95rem;
    }
  `],
})
export class FreelancersComponent {}
