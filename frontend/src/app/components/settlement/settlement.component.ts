import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { ClaimsService } from '../../services/claims.service';
import { Claim, Payment } from '../../models/claim.model';

@Component({
    selector: 'app-settlement',
    imports: [
        CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule,
        MatFormFieldModule, MatInputModule, MatSnackBarModule, MatCheckboxModule, FormsModule
    ],
    template: `
    <div *ngIf="claim">
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
        <button mat-icon-button [routerLink]="['/claims', claim.id]"><mat-icon>arrow_back</mat-icon></button>
        <h2 style="margin: 0;">Settlement — {{claim.claimNumber}}</h2>
        <span class="status-chip" [ngClass]="'status-' + claim.status">{{claim.status}}</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <!-- Payment -->
        <mat-card>
          <mat-card-header><mat-card-title>Issue Payment</mat-card-title></mat-card-header>
          <mat-card-content>
            <p><strong>Reserve Amount:</strong> {{claim.reserveAmount ? ('$' + claim.reserveAmount) : 'Not set'}}</p>

            <mat-form-field appearance="outline" style="width: 100%;" *ngIf="claim.status === 'RESERVE_SET'">
              <mat-label>Settlement Amount ($)</mat-label>
              <input matInput type="number" [(ngModel)]="paymentAmount" min="0">
            </mat-form-field>

            <button mat-raised-button color="primary" (click)="issuePayment()"
                    *ngIf="claim.status === 'RESERVE_SET'" [disabled]="!paymentAmount">
              <mat-icon>payment</mat-icon> Issue Payment
            </button>

            <div *ngIf="claim.status === 'SETTLED' || claim.status === 'CLOSED'" style="margin-top: 16px;">
              <p style="color: #2e7d32;"><mat-icon style="vertical-align: middle;">check_circle</mat-icon>
                Settlement paid: <strong>\${{claim.settlementAmount}}</strong></p>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Close Claim -->
        <mat-card>
          <mat-card-header><mat-card-title>Close Claim</mat-card-title></mat-card-header>
          <mat-card-content>
            <div *ngIf="claim.status === 'SETTLED'">
              <mat-checkbox [(ngModel)]="subrogationFlag" style="margin-bottom: 16px;">
                Flag for Subrogation
              </mat-checkbox>
              <p style="color: #888; font-size: 12px;">
                Check this if a third party is liable and recovery should be pursued.
              </p>
              <button mat-raised-button color="accent" (click)="closeClaim()">
                <mat-icon>lock</mat-icon> Close Claim
              </button>
            </div>

            <div *ngIf="claim.status === 'CLOSED'" style="margin-top: 16px;">
              <p style="color: #546e7a;"><mat-icon style="vertical-align: middle;">lock</mat-icon> Claim is closed.</p>
              <p *ngIf="claim.subrogationFlag" style="color: #e65100;">
                <mat-icon style="vertical-align: middle;">flag</mat-icon> Subrogation flagged
              </p>
            </div>

            <div *ngIf="claim.status !== 'SETTLED' && claim.status !== 'CLOSED'">
              <p style="color: #888;">Claim must be settled before closing.</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Payment History -->
      <mat-card style="margin-top: 16px;" *ngIf="payments.length > 0">
        <mat-card-header><mat-card-title>Payment History</mat-card-title></mat-card-header>
        <mat-card-content>
          <div *ngFor="let p of payments" style="padding: 8px 0; border-bottom: 1px solid #eee;">
            <strong>{{p.referenceNumber}}</strong> — \${{p.amount}} — {{p.status}} — {{p.paymentDate}}
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
    styles: [`h2 { margin: 0; }`]
})
export class SettlementComponent implements OnInit {
  claim: Claim | null = null;
  payments: Payment[] = [];
  paymentAmount: number | null = null;
  subrogationFlag = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private claimsService: ClaimsService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.claimsService.getClaim(id).subscribe(claim => {
      this.claim = claim;
      this.paymentAmount = claim.reserveAmount;
    });
    this.claimsService.getPayments(id).subscribe(payments => this.payments = payments);
  }

  issuePayment(): void {
    if (!this.claim || !this.paymentAmount) return;
    this.claimsService.issuePayment(this.claim.id, this.paymentAmount).subscribe(payment => {
      this.payments = [...this.payments, payment];
      this.claimsService.getClaim(this.claim!.id).subscribe(c => this.claim = c);
      this.snackBar.open(`Payment issued: $${payment.amount}`, 'Close', { duration: 3000 });
    });
  }

  closeClaim(): void {
    if (!this.claim) return;
    this.claimsService.closeClaim(this.claim.id, this.subrogationFlag).subscribe(claim => {
      this.claim = claim;
      this.snackBar.open('Claim closed successfully', 'Close', { duration: 3000 });
    });
  }
}
