import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { ClaimsService } from '../../services/claims.service';
import { Claim, AppUser } from '../../models/claim.model';

@Component({
  selector: 'app-triage',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule, MatSnackBarModule,
    MatRadioModule, FormsModule
  ],
  template: `
    <div *ngIf="claim">
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
        <button mat-icon-button [routerLink]="['/claims', claim.id]"><mat-icon>arrow_back</mat-icon></button>
        <h2 style="margin: 0;">Triage & Assignment — {{claim.claimNumber}}</h2>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <!-- Claim Summary -->
        <mat-card>
          <mat-card-header><mat-card-title>Claim Summary</mat-card-title></mat-card-header>
          <mat-card-content>
            <p><strong>Loss Type:</strong> {{claim.lossType}}</p>
            <p><strong>Severity:</strong> {{claim.severityScore}}/10</p>
            <p><strong>Description:</strong> {{claim.lossDescription}}</p>
            <p><strong>Status:</strong> <span class="status-chip" [ngClass]="'status-' + claim.status">{{claim.status}}</span></p>
          </mat-card-content>
        </mat-card>

        <!-- Assignment Actions -->
        <mat-card>
          <mat-card-header><mat-card-title>Assignment</mat-card-title></mat-card-header>
          <mat-card-content>
            <mat-radio-group [(ngModel)]="assignmentMode" style="display: flex; gap: 16px; margin-bottom: 16px;">
              <mat-radio-button value="auto">Auto-assign (rules-based)</mat-radio-button>
              <mat-radio-button value="manual">Manual override</mat-radio-button>
            </mat-radio-group>

            <div *ngIf="assignmentMode === 'manual'" style="margin-bottom: 16px;">
              <mat-form-field appearance="outline" style="width: 100%;">
                <mat-label>Select Adjuster</mat-label>
                <mat-select [(value)]="selectedAdjusterId">
                  <mat-option *ngFor="let u of users" [value]="u.id">
                    {{u.fullName}} ({{u.role}})
                  </mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" style="width: 100%;">
                <mat-label>Notes</mat-label>
                <input matInput [(ngModel)]="assignmentNotes">
              </mat-form-field>
            </div>

            <div *ngIf="assignmentMode === 'auto'" style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
              <p style="margin: 0;"><strong>Triage Rules:</strong></p>
              <ul style="margin: 8px 0;">
                <li>COLLISION with severity &ge; 7 &rarr; Senior Adjuster</li>
                <li>THEFT (any severity) &rarr; Senior Adjuster</li>
                <li>All other cases &rarr; Adjuster</li>
              </ul>
            </div>

            <button mat-raised-button color="primary" (click)="assign()">
              <mat-icon>assignment_ind</mat-icon> Assign Claim
            </button>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Reserve Decision -->
      <mat-card style="margin-top: 16px;">
        <mat-card-header><mat-card-title>Reserve Decision</mat-card-title></mat-card-header>
        <mat-card-content>
          <div style="display: flex; align-items: center; gap: 16px;">
            <mat-form-field appearance="outline">
              <mat-label>Reserve Amount ($)</mat-label>
              <input matInput type="number" [(ngModel)]="reserveAmount" min="0">
            </mat-form-field>
            <button mat-raised-button color="accent" (click)="approveReserve()">
              <mat-icon>check_circle</mat-icon> Approve Reserve
            </button>
            <button mat-raised-button color="warn" (click)="denyReserve()">
              <mat-icon>cancel</mat-icon> Deny
            </button>
          </div>
          <p style="color: #888; font-size: 12px;">Leave amount empty for auto-calculation based on severity.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`h2 { margin: 0; }`]
})
export class TriageComponent implements OnInit {
  claim: Claim | null = null;
  users: AppUser[] = [];
  assignmentMode = 'auto';
  selectedAdjusterId: number | null = null;
  assignmentNotes = '';
  reserveAmount: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private claimsService: ClaimsService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.claimsService.getClaim(id).subscribe(claim => this.claim = claim);
    this.claimsService.getUsers().subscribe(users => this.users = users);
  }

  assign(): void {
    if (!this.claim) return;
    if (this.assignmentMode === 'auto') {
      this.claimsService.autoAssign(this.claim.id).subscribe(assignment => {
        this.snackBar.open(`Assigned to ${assignment.adjuster?.fullName || 'adjuster'}`, 'Close', { duration: 3000 });
        this.claimsService.updateClaimStatus(this.claim!.id, 'UNDER_INVESTIGATION').subscribe(c => this.claim = c);
      });
    } else {
      if (!this.selectedAdjusterId) {
        this.snackBar.open('Please select an adjuster', 'Close', { duration: 3000 });
        return;
      }
      this.claimsService.manualAssign(this.claim.id, this.selectedAdjusterId, this.assignmentNotes).subscribe(assignment => {
        this.snackBar.open(`Manually assigned to ${assignment.adjuster?.fullName || 'adjuster'}`, 'Close', { duration: 3000 });
        this.claimsService.updateClaimStatus(this.claim!.id, 'UNDER_INVESTIGATION').subscribe(c => this.claim = c);
      });
    }
  }

  approveReserve(): void {
    if (!this.claim) return;
    this.claimsService.reserveDecision(this.claim.id, 'APPROVE', this.reserveAmount || undefined).subscribe(claim => {
      this.claim = claim;
      this.snackBar.open(`Reserve approved: $${claim.reserveAmount}`, 'Close', { duration: 3000 });
    });
  }

  denyReserve(): void {
    if (!this.claim) return;
    this.claimsService.reserveDecision(this.claim.id, 'DENY').subscribe(claim => {
      this.claim = claim;
      this.snackBar.open('Reserve denied', 'Close', { duration: 3000 });
    });
  }
}
