import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule],
    template: `
    <mat-toolbar color="primary">
      <mat-icon>shield</mat-icon>
      <span style="margin-left: 8px; font-weight: 500;">PNC Claims Portal</span>
      <span class="spacer"></span>
      <button mat-button routerLink="/dashboard">
        <mat-icon>dashboard</mat-icon> Dashboard
      </button>
      <button mat-button routerLink="/fnol">
        <mat-icon>add_circle</mat-icon> New Claim
      </button>
      <button mat-button [matMenuTriggerFor]="userMenu">
        <mat-icon>person</mat-icon> Demo User
      </button>
      <mat-menu #userMenu="matMenu">
        <button mat-menu-item disabled>John Smith (Sr. Adjuster)</button>
        <button mat-menu-item disabled>Maria Williams (Adjuster)</button>
        <button mat-menu-item disabled>Robert Johnson (Sr. Adjuster)</button>
      </mat-menu>
    </mat-toolbar>
    <div class="container">
      <router-outlet></router-outlet>
    </div>
  `,
    styles: [`
    .spacer { flex: 1 1 auto; }
    .container { max-width: 1200px; margin: 24px auto; padding: 0 24px; }
  `]
})
export class AppComponent {
  title = 'PNC Claims Portal';
}
