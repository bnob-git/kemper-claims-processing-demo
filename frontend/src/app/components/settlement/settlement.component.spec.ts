import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SettlementComponent } from './settlement.component';
import { ClaimsService } from '../../services/claims.service';
import { of } from 'rxjs';
import { Claim, Payment } from '../../models/claim.model';

describe('SettlementComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const mockClaim: Claim = {
    id: 3, claimNumber: 'CLM-003', policy: {
      id: 3, policyNumber: 'POL-003', holderName: 'Carol', holderEmail: '',
      vehicleVin: '', vehicleYear: 2023, vehicleMake: 'Tesla', vehicleModel: 'Model S',
      coverageType: 'COMPREHENSIVE', effectiveDate: '2024-06-01', expirationDate: '2025-06-01'
    },
    status: 'RESERVE_SET', lossType: 'COLLISION', severityScore: 5,
    lossDate: '2024-09-15', lossDescription: 'Test', reportedDate: '2024-09-15',
    claimantName: 'Carol', claimantPhone: '555-0303',
    reserveAmount: 3200, settlementAmount: null, subrogationFlag: false,
    createdAt: '2024-09-15T14:00:00', updatedAt: '2024-09-16T11:00:00'
  };

  beforeEach(async () => {
    const claimsSpy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getPayments', 'issuePayment', 'closeClaim'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    claimsSpy.getClaim.and.returnValue(of(mockClaim));
    claimsSpy.getPayments.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [SettlementComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ClaimsService, useValue: claimsSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '3' } } } }
      ]
    })
    .overrideComponent(SettlementComponent, {
      remove: { imports: [MatSnackBarModule] }
    })
    .compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load claim and set payment amount on init', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.claim).toEqual(mockClaim);
    expect(component.paymentAmount).toBe(3200);
  });

  it('should issue payment', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const mockPayment: Payment = {
      id: 100, claimId: 3, amount: 3200, paymentType: 'SETTLEMENT',
      paymentDate: '2024-10-01', referenceNumber: 'PAY-TEST', status: 'COMPLETED', createdBy: 'system'
    };
    const settledClaim = { ...mockClaim, status: 'SETTLED', settlementAmount: 3200 };
    claimsService.issuePayment.and.returnValue(of(mockPayment));
    claimsService.getClaim.and.returnValue(of(settledClaim));

    component.paymentAmount = 3200;
    component.issuePayment();

    expect(claimsService.issuePayment).toHaveBeenCalledWith(3, 3200);
    expect(component.payments.length).toBe(1);
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should not issue payment when claim is null', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.claim = null;
    component.issuePayment();
    expect(claimsService.issuePayment).not.toHaveBeenCalled();
  });

  it('should not issue payment when amount is null', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.paymentAmount = null;
    component.issuePayment();
    expect(claimsService.issuePayment).not.toHaveBeenCalled();
  });

  it('should close claim with subrogation', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const closedClaim = { ...mockClaim, status: 'CLOSED', subrogationFlag: true };
    claimsService.closeClaim.and.returnValue(of(closedClaim));

    component.subrogationFlag = true;
    component.closeClaim();

    expect(claimsService.closeClaim).toHaveBeenCalledWith(3, true);
    expect(component.claim!.status).toBe('CLOSED');
    expect(snackBar.open).toHaveBeenCalledWith('Claim closed successfully', 'Close', { duration: 3000 });
  });

  it('should close claim without subrogation', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const closedClaim = { ...mockClaim, status: 'CLOSED', subrogationFlag: false };
    claimsService.closeClaim.and.returnValue(of(closedClaim));

    component.subrogationFlag = false;
    component.closeClaim();

    expect(claimsService.closeClaim).toHaveBeenCalledWith(3, false);
  });

  it('should not close claim when claim is null', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.claim = null;
    component.closeClaim();
    expect(claimsService.closeClaim).not.toHaveBeenCalled();
  });
});
