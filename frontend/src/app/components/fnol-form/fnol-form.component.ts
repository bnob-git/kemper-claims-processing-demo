import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { ClaimsService } from '../../services/claims.service';
import { Policy } from '../../models/claim.model';

@Component({
  selector: 'app-fnol-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatDatepickerModule,
    MatNativeDateModule, MatSnackBarModule, MatIconModule
  ],
  template: `
    <h2>First Notice of Loss (FNOL)</h2>

    <mat-card>
      <mat-card-content>
        <form [formGroup]="fnolForm" (ngSubmit)="onSubmit()">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">

            <mat-form-field appearance="outline">
              <mat-label>Policy</mat-label>
              <mat-select formControlName="policyId" required>
                <mat-option *ngFor="let p of policies" [value]="p.id">
                  {{p.policyNumber}} — {{p.holderName}}
                </mat-option>
              </mat-select>
              <mat-error>Policy is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Loss Type</mat-label>
              <mat-select formControlName="lossType" required>
                <mat-option value="COLLISION">Collision</mat-option>
                <mat-option value="THEFT">Theft</mat-option>
                <mat-option value="WEATHER">Weather</mat-option>
                <mat-option value="VANDALISM">Vandalism</mat-option>
                <mat-option value="OTHER">Other</mat-option>
              </mat-select>
              <mat-error>Loss type is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Severity (1-10)</mat-label>
              <input matInput type="number" formControlName="severityScore" min="1" max="10" required>
              <mat-error>Severity must be 1-10</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Date of Loss</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="lossDate" required>
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
              <mat-error>Loss date is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Claimant Name</mat-label>
              <input matInput formControlName="claimantName" required>
              <mat-error>Claimant name is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Claimant Phone</mat-label>
              <input matInput formControlName="claimantPhone" required>
              <mat-error>Phone is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" style="grid-column: span 2;">
              <mat-label>Loss Description</mat-label>
              <textarea matInput formControlName="lossDescription" rows="3" required></textarea>
              <mat-error>Description is required</mat-error>
            </mat-form-field>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px;">
            <button mat-button type="button" routerLink="/dashboard">Cancel</button>
            <button mat-raised-button color="primary" type="submit">
              <mat-icon>send</mat-icon> Submit FNOL
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card { max-width: 800px; }
    mat-form-field { width: 100%; }
  `]
})
export class FnolFormComponent implements OnInit {
  fnolForm!: FormGroup;
  policies: Policy[] = [];

  constructor(
    private fb: FormBuilder,
    private claimsService: ClaimsService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.fnolForm = this.fb.group({
      policyId: [null, Validators.required],
      lossType: ['', Validators.required],
      severityScore: [null, [Validators.required, Validators.min(1), Validators.max(10)]],
      lossDate: [null, Validators.required],
      claimantName: ['', Validators.required],
      claimantPhone: ['', Validators.required],
      lossDescription: ['', Validators.required]
    });

    this.claimsService.getPolicies().subscribe(policies => {
      this.policies = policies;
    });
  }

  onSubmit(): void {
    if (this.fnolForm.valid) {
      const formValue = this.fnolForm.value;
      const payload = {
        ...formValue,
        lossDate: this.formatDate(formValue.lossDate),
        severityScore: formValue.severityScore
      };

      this.claimsService.createClaim(payload).subscribe({
        next: (claim) => {
          this.snackBar.open(`Claim ${claim.claimNumber} created successfully!`, 'Close', {
            duration: 3000
          });
          this.router.navigate(['/claims', claim.id]);
        },
        error: () => {
          this.snackBar.open('Error creating claim. Please try again.', 'Close', {
            duration: 5000
          });
        }
      });
    } else {
      this.fnolForm.markAllAsTouched();
    }
  }

  private formatDate(date: Date | string): string {
    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return date as string;
  }
}
