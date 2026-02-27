import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClaimsService } from '../../services/claims.service';
import { Claim, ClaimEvent, Assignment, DocumentMetadata, Payment } from '../../models/claim.model';

@Component({
    selector: 'app-claim-detail',
    imports: [
        CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule,
        MatChipsModule, MatDividerModule, MatListModule, MatTabsModule,
        MatTableModule, MatDialogModule, MatFormFieldModule, MatInputModule,
        MatSelectModule, MatSnackBarModule, ReactiveFormsModule
    ],
    template: `
    <div *ngIf="claim">
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
        <button mat-icon-button routerLink="/dashboard"><mat-icon>arrow_back</mat-icon></button>
        <h2 style="margin: 0;">Claim {{claim.claimNumber}}</h2>
        <span class="status-chip" [ngClass]="'status-' + claim.status">{{claim.status}}</span>
        <span style="flex: 1;"></span>
        <button mat-raised-button color="accent" [routerLink]="['/claims', claim.id, 'triage']"
                *ngIf="claim.status === 'OPEN'">
          <mat-icon>assignment_ind</mat-icon> Triage / Assign
        </button>
        <button mat-raised-button color="primary" [routerLink]="['/claims', claim.id, 'settlement']"
                *ngIf="claim.status === 'RESERVE_SET' || claim.status === 'SETTLED'">
          <mat-icon>payment</mat-icon> Settlement
        </button>
      </div>

      <!-- Claim Info Card -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <mat-card>
          <mat-card-header><mat-card-title>Claim Information</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="info-grid">
              <div><strong>Policy:</strong> {{claim.policy?.policyNumber}}</div>
              <div><strong>Holder:</strong> {{claim.policy?.holderName}}</div>
              <div><strong>Vehicle:</strong> {{claim.policy?.vehicleYear}} {{claim.policy?.vehicleMake}} {{claim.policy?.vehicleModel}}</div>
              <div><strong>VIN:</strong> {{claim.policy?.vehicleVin}}</div>
              <div><strong>Loss Type:</strong> {{claim.lossType}}</div>
              <div><strong>Severity:</strong> {{claim.severityScore}}/10</div>
              <div><strong>Loss Date:</strong> {{claim.lossDate}}</div>
              <div><strong>Reported:</strong> {{claim.reportedDate}}</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header><mat-card-title>Financial Summary</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="info-grid">
              <div><strong>Reserve:</strong> {{claim.reserveAmount ? ('$' + claim.reserveAmount) : 'Not set'}}</div>
              <div><strong>Settlement:</strong> {{claim.settlementAmount ? ('$' + claim.settlementAmount) : 'Pending'}}</div>
              <div><strong>Subrogation:</strong> {{claim.subrogationFlag ? 'Yes' : 'No'}}</div>
              <div><strong>Claimant:</strong> {{claim.claimantName}}</div>
              <div><strong>Phone:</strong> {{claim.claimantPhone}}</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card style="margin-bottom: 16px;">
        <mat-card-header><mat-card-title>Description</mat-card-title></mat-card-header>
        <mat-card-content>
          <p>{{claim.lossDescription}}</p>
        </mat-card-content>
      </mat-card>

      <!-- Tabs for timeline, assignments, documents, payments -->
      <mat-tab-group>
        <mat-tab label="Timeline">
          <div style="padding: 16px;">
            <mat-list>
              <mat-list-item *ngFor="let event of events">
                <mat-icon matListItemIcon>{{getEventIcon(event.eventType)}}</mat-icon>
                <div matListItemTitle>{{event.newStatus}} <small style="color: #888;">by {{event.createdBy}}</small></div>
                <div matListItemLine>{{event.notes}}</div>
                <div matListItemLine><small>{{event.createdAt}}</small></div>
              </mat-list-item>
            </mat-list>
          </div>
        </mat-tab>

        <mat-tab label="Assignments">
          <div style="padding: 16px;">
            <table mat-table [dataSource]="assignments" *ngIf="assignments.length > 0" style="width: 100%;">
              <ng-container matColumnDef="adjuster">
                <th mat-header-cell *matHeaderCellDef>Adjuster</th>
                <td mat-cell *matCellDef="let a">{{a.adjuster?.fullName}}</td>
              </ng-container>
              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>Type</th>
                <td mat-cell *matCellDef="let a">{{a.assignmentType}}</td>
              </ng-container>
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let a">{{a.assignedDate}}</td>
              </ng-container>
              <ng-container matColumnDef="notes">
                <th mat-header-cell *matHeaderCellDef>Notes</th>
                <td mat-cell *matCellDef="let a">{{a.notes}}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['adjuster','type','date','notes']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['adjuster','type','date','notes'];"></tr>
            </table>
            <p *ngIf="assignments.length === 0">No assignments yet.</p>
          </div>
        </mat-tab>

        <mat-tab label="Documents">
          <div style="padding: 16px;">
            <!-- Add document form -->
            <form [formGroup]="docForm" (ngSubmit)="addDocument()" style="display: flex; gap: 8px; margin-bottom: 16px;">
              <mat-form-field appearance="outline" style="flex: 1;">
                <mat-label>File Name</mat-label>
                <input matInput formControlName="fileName">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Type</mat-label>
                <mat-select formControlName="documentType">
                  <mat-option value="POLICE_REPORT">Police Report</mat-option>
                  <mat-option value="PHOTO">Photo</mat-option>
                  <mat-option value="ESTIMATE">Estimate</mat-option>
                  <mat-option value="EVIDENCE">Evidence</mat-option>
                  <mat-option value="OTHER">Other</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" style="height: 56px;">
                <mat-icon>attach_file</mat-icon> Add
              </button>
            </form>
            <table mat-table [dataSource]="documents" *ngIf="documents.length > 0" style="width: 100%;">
              <ng-container matColumnDef="fileName">
                <th mat-header-cell *matHeaderCellDef>File</th>
                <td mat-cell *matCellDef="let d">{{d.fileName}}</td>
              </ng-container>
              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>Type</th>
                <td mat-cell *matCellDef="let d">{{d.documentType}}</td>
              </ng-container>
              <ng-container matColumnDef="uploadedBy">
                <th mat-header-cell *matHeaderCellDef>Uploaded By</th>
                <td mat-cell *matCellDef="let d">{{d.uploadedBy}}</td>
              </ng-container>
              <ng-container matColumnDef="uploadedAt">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let d">{{d.uploadedAt}}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['fileName','type','uploadedBy','uploadedAt']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['fileName','type','uploadedBy','uploadedAt'];"></tr>
            </table>
            <p *ngIf="documents.length === 0">No documents attached.</p>
          </div>
        </mat-tab>

        <mat-tab label="Payments">
          <div style="padding: 16px;">
            <table mat-table [dataSource]="payments" *ngIf="payments.length > 0" style="width: 100%;">
              <ng-container matColumnDef="reference">
                <th mat-header-cell *matHeaderCellDef>Reference</th>
                <td mat-cell *matCellDef="let p">{{p.referenceNumber}}</td>
              </ng-container>
              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>Amount</th>
                <td mat-cell *matCellDef="let p">\${{p.amount}}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let p">{{p.status}}</td>
              </ng-container>
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let p">{{p.paymentDate}}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['reference','amount','status','date']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['reference','amount','status','date'];"></tr>
            </table>
            <p *ngIf="payments.length === 0">No payments issued.</p>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
    styles: [`
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 8px 0; }
    .info-grid div { padding: 4px 0; }
    table { width: 100%; }
    h2 { margin: 0; }
  `]
})
export class ClaimDetailComponent implements OnInit {
  claim: Claim | null = null;
  events: ClaimEvent[] = [];
  assignments: Assignment[] = [];
  documents: DocumentMetadata[] = [];
  payments: Payment[] = [];
  docForm!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private claimsService: ClaimsService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.docForm = this.fb.group({
      fileName: ['', Validators.required],
      documentType: ['OTHER', Validators.required]
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadClaim(id);
  }

  loadClaim(id: number): void {
    this.claimsService.getClaim(id).subscribe(claim => this.claim = claim);
    this.claimsService.getClaimEvents(id).subscribe(events => this.events = events);
    this.claimsService.getAssignments(id).subscribe(assignments => this.assignments = assignments);
    this.claimsService.getDocuments(id).subscribe(docs => this.documents = docs);
    this.claimsService.getPayments(id).subscribe(payments => this.payments = payments);
  }

  addDocument(): void {
    if (!this.claim || this.docForm.invalid) return;
    const data = {
      ...this.docForm.value,
      uploadedBy: 'demo-user',
      notes: ''
    };
    this.claimsService.addDocument(this.claim.id, data).subscribe(doc => {
      this.documents = [...this.documents, doc];
      this.docForm.reset({ documentType: 'OTHER' });
      this.snackBar.open('Document added', 'Close', { duration: 2000 });
    });
  }

  getEventIcon(eventType: string): string {
    switch (eventType) {
      case 'STATUS_CHANGE': return 'swap_horiz';
      case 'NOTE': return 'note';
      default: return 'info';
    }
  }
}
