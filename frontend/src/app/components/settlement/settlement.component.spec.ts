import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { SettlementComponent } from './settlement.component';
import { ClaimsService } from '../../services/claims.service';
import { Claim, Payment, Policy } from '../../models/claim.model';

describe('SettlementComponent', () => {
  let component: SettlementComponent;
  let fixture: ComponentFixture<SettlementComponent>;
  let claimsServiceSpy: jasmine.SpyObj<ClaimsService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const mockPolicy: Policy = {
    id: 1, policyNumber: 'POL-001', holderName: 'Alice Smith', holderEmail: '',
    vehicleVin: 'VIN001', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
    coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
  };

  const mockClaim: Claim = {
    id: 1, claimNumber: 'CLM-001', policy: mockPolicy,
    status: 'RESERVE_SET', lossType: 'COLLISION', severityScore: 7,
    lossDate: '2024-09-10', lossDescription: 'Test collision',
    reportedDate: '2024-09-10', claimantName: 'Alice', claimantPhone: '555-0101',
    reserveAmount: 5000, settlementAmount: null, subrogationFlag: false,
    createdAt: '', updatedAt: ''
  };

  const mockPayments: Payment[] = [];

  beforeEach(async () => {
    claimsServiceSpy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getPayments', 'issuePayment', 'closeClaim'
    ]);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    claimsServiceSpy.getClaim.and.returnValue(of(mockClaim));
    claimsServiceSpy.getPayments.and.returnValue(of(mockPayments));

    await TestBed.configureTestingModule({
      imports: [
        SettlementComponent,
        NoopAnimationsModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: ClaimsService, useValue: claimsServiceSpy },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: MatSnackBar, useValue: snackBarSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'id' ? '1' : null
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettlementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load claim and payments on init', () => {
    expect(claimsServiceSpy.getClaim).toHaveBeenCalledWith(1);
    expect(claimsServiceSpy.getPayments).toHaveBeenCalledWith(1);
    expect(component.claim).toEqual(mockClaim);
    expect(component.paymentAmount).toBe(5000);
  });

  it('should issue payment', () => {
    const mockPayment: Payment = {
      id: 1, claimId: 1, amount: 5000, paymentType: 'SETTLEMENT',
      paymentDate: '2024-10-15', referenceNumber: 'PAY-001', status: 'COMPLETED', createdBy: 'system'
    };
    const settledClaim = { ...mockClaim, status: 'SETTLED', settlementAmount: 5000 };
    claimsServiceSpy.issuePayment.and.returnValue(of(mockPayment));
    claimsServiceSpy.getClaim.and.returnValue(of(settledClaim));

    component.paymentAmount = 5000;
    component.issuePayment();

    expect(claimsServiceSpy.issuePayment).toHaveBeenCalledWith(1, 5000);
    expect(component.payments.length).toBe(1);
  });

  it('should not issue payment without amount', () => {
    component.paymentAmount = null;
    component.issuePayment();
    expect(claimsServiceSpy.issuePayment).not.toHaveBeenCalled();
  });

  it('should close claim with subrogation flag', () => {
    const closedClaim = { ...mockClaim, status: 'CLOSED', subrogationFlag: true };
    claimsServiceSpy.closeClaim.and.returnValue(of(closedClaim));

    component.subrogationFlag = true;
    component.closeClaim();

    expect(claimsServiceSpy.closeClaim).toHaveBeenCalledWith(1, true);
    expect(component.claim!.status).toBe('CLOSED');
    expect(component.claim!.subrogationFlag).toBe(true);
  });

  it('should close claim without subrogation flag', () => {
    const closedClaim = { ...mockClaim, status: 'CLOSED', subrogationFlag: false };
    claimsServiceSpy.closeClaim.and.returnValue(of(closedClaim));

    component.subrogationFlag = false;
    component.closeClaim();

    expect(claimsServiceSpy.closeClaim).toHaveBeenCalledWith(1, false);
    expect(component.claim!.status).toBe('CLOSED');
    expect(component.claim!.subrogationFlag).toBe(false);
  });
});
