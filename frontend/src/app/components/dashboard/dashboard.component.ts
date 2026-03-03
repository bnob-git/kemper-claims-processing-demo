import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ClaimsService } from '../../services/claims.service';
import { Claim } from '../../models/claim.model';

@Component({
    selector: 'app-dashboard',
    imports: [
        CommonModule, RouterLink, MatTableModule, MatButtonModule,
        MatIconModule, MatSelectModule, MatFormFieldModule, MatCardModule,
        MatInputModule, MatDatepickerModule, MatNativeDateModule, FormsModule
    ],
    template: `
    <h2>Claims Dashboard</h2>

    <mat-card style="margin-bottom: 24px;">
      <mat-card-content>
        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
          <mat-form-field appearance="outline" style="width: 260px;">
            <mat-label>Search (claim #, claimant, policy #)</mat-label>
            <input matInput [(ngModel)]="searchText" (ngModelChange)="onSearchChange($event)">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" style="width: 200px;">
            <mat-label>Filter by Status</mat-label>
            <mat-select [(value)]="statusFilter" (selectionChange)="loadClaims()">
              <mat-option value="">All</mat-option>
              <mat-option value="OPEN">Open</mat-option>
              <mat-option value="UNDER_INVESTIGATION">Under Investigation</mat-option>
              <mat-option value="RESERVE_SET">Reserve Set</mat-option>
              <mat-option value="SETTLED">Settled</mat-option>
              <mat-option value="CLOSED">Closed</mat-option>
              <mat-option value="DENIED">Denied</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" style="width: 220px;">
            <mat-label>Loss Type</mat-label>
            <mat-select [(value)]="lossTypeFilter" multiple (selectionChange)="loadClaims()">
              <mat-option value="COLLISION">Collision</mat-option>
              <mat-option value="THEFT">Theft</mat-option>
              <mat-option value="WEATHER">Weather</mat-option>
              <mat-option value="VANDALISM">Vandalism</mat-option>
              <mat-option value="OTHER">Other</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" style="width: 160px;">
            <mat-label>Loss Date From</mat-label>
            <input matInput [matDatepicker]="pickerFrom" [(ngModel)]="lossDateFrom" (dateChange)="loadClaims()">
            <mat-datepicker-toggle matIconSuffix [for]="pickerFrom"></mat-datepicker-toggle>
            <mat-datepicker #pickerFrom></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" style="width: 160px;">
            <mat-label>Loss Date To</mat-label>
            <input matInput [matDatepicker]="pickerTo" [(ngModel)]="lossDateTo" (dateChange)="loadClaims()">
            <mat-datepicker-toggle matIconSuffix [for]="pickerTo"></mat-datepicker-toggle>
            <mat-datepicker #pickerTo></mat-datepicker>
          </mat-form-field>

          <span style="flex: 1;"></span>
          <button mat-raised-button color="primary" routerLink="/fnol">
            <mat-icon>add</mat-icon> New Claim (FNOL)
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    <table mat-table [dataSource]="claims" class="mat-elevation-z2" style="width: 100%;">
      <ng-container matColumnDef="claimNumber">
        <th mat-header-cell *matHeaderCellDef>Claim #</th>
        <td mat-cell *matCellDef="let claim">
          <a [routerLink]="['/claims', claim.id]" style="text-decoration: none; color: #1976d2; font-weight: 500;">
            {{claim.claimNumber}}
          </a>
        </td>
      </ng-container>

      <ng-container matColumnDef="policyNumber">
        <th mat-header-cell *matHeaderCellDef>Policy #</th>
        <td mat-cell *matCellDef="let claim">{{claim.policy?.policyNumber}}</td>
      </ng-container>

      <ng-container matColumnDef="claimantName">
        <th mat-header-cell *matHeaderCellDef>Claimant</th>
        <td mat-cell *matCellDef="let claim">{{claim.claimantName}}</td>
      </ng-container>

      <ng-container matColumnDef="lossType">
        <th mat-header-cell *matHeaderCellDef>Loss Type</th>
        <td mat-cell *matCellDef="let claim">{{claim.lossType}}</td>
      </ng-container>

      <ng-container matColumnDef="severity">
        <th mat-header-cell *matHeaderCellDef>Severity</th>
        <td mat-cell *matCellDef="let claim">{{claim.severityScore}}/10</td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let claim">
          <span class="status-chip" [ngClass]="'status-' + claim.status">{{claim.status}}</span>
        </td>
      </ng-container>

      <ng-container matColumnDef="lossDate">
        <th mat-header-cell *matHeaderCellDef>Loss Date</th>
        <td mat-cell *matCellDef="let claim">{{claim.lossDate}}</td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;" style="cursor: pointer;"></tr>
    </table>
  `,
    styles: [`
    table { width: 100%; }
    .mat-mdc-row:hover { background-color: #f5f5f5; }
    h2 { margin-bottom: 16px; }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  claims: Claim[] = [];
  statusFilter = '';
  searchText = '';
  lossTypeFilter: string[] = [];
  lossDateFrom: Date | null = null;
  lossDateTo: Date | null = null;
  displayedColumns = ['claimNumber', 'policyNumber', 'claimantName', 'lossType', 'severity', 'status', 'lossDate'];

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private claimsService: ClaimsService) {}

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadClaims();
    });

    this.loadClaims();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  loadClaims(): void {
    const status = this.statusFilter || undefined;
    const search = this.searchText || undefined;
    const lossTypes = this.lossTypeFilter.length > 0 ? this.lossTypeFilter : undefined;
    const lossDateFrom = this.lossDateFrom ? this.formatDate(this.lossDateFrom) : undefined;
    const lossDateTo = this.lossDateTo ? this.formatDate(this.lossDateTo) : undefined;

    this.claimsService.getClaims(status, search, lossTypes, lossDateFrom, lossDateTo).subscribe(claims => {
      this.claims = claims;
    });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
