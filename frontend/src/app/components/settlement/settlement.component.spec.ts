import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SettlementComponent } from './settlement.component';
import { ClaimsService } from '../../services/claims.service';
import { of } from 'rxjs';
import { Claim, Policy, Payment } from '../../models/claim.model';

describe('SettlementComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockPolicy: Policy = {
    id: 3, policyNumber: 'POL-003', holderName: 'Carol', holderEmail: 'carol@test.com',
    vehicleVin: 'VIN789', vehicleYear: 2023, vehicleMake: 'Tesla', vehicleModel: 'Model S',
    coverageType: 'COMPREHENSIVE', effectiveDate: '2024-06-01', expirationDate: '2025-06-01'
  };

  const mockClaim: Claim = {
    id: 3, claimNumber: 'CLM-003', policy: mockPolicy,
    status: 'RESERVE_SET', lossType: 'COLLISION', severityScore: 5,
    lossDate: '2024-09-15', lossDescription: 'Minor fender bender', reportedDate: '2024-09-15',
    claimantName: 'Carol', claimantPhone: '555-0303',
    reserveAmount: 3200, settlementAmount: null, subrogationFlag: false,
    createdAt: '2024-09-15T14:00:00', updatedAt: '2024-09-16T11:00:00'
  };

  const mockPayments: Payment[] = [];

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getPayments', 'issuePayment', 'closeClaim'
    ]);
    serviceSpy.getClaim.and.returnValue(of(mockClaim));
    serviceSpy.getPayments.and.returnValue(of(mockPayments));
    serviceSpy.issuePayment.and.returnValue(of({
      id: 1, claimId: 3, amount: 3200, paymentType: 'SETTLEMENT',
      paymentDate: '2024-09-20', referenceNumber: 'PAY-001', status: 'COMPLETED', createdBy: 'user'
    }));
    serviceSpy.closeClaim.and.returnValue(of({ ...mockClaim, status: 'CLOSED', subrogationFlag: true }));

    await TestBed.configureTestingModule({
      imports: [
        SettlementComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ClaimsService, useValue: serviceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '3' } } }
        }
      ]
    }).compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load claim and payments on init', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.claim).toEqual(mockClaim);
    expect(component.payments.length).toBe(0);
    expect(component.paymentAmount).toBe(3200);
  });

  it('should issue payment when claim and amount are set', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const snackBar = fixture.debugElement.injector.get(MatSnackBar);
    spyOn(snackBar, 'open');

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
    const snackBar = fixture.debugElement.injector.get(MatSnackBar);
    spyOn(snackBar, 'open');

    component.subrogationFlag = true;
    component.closeClaim();
    expect(claimsService.closeClaim).toHaveBeenCalledWith(3, true);
    expect(snackBar.open).toHaveBeenCalledWith('Claim closed successfully', 'Close', { duration: 3000 });
  });

  it('should close claim without subrogation', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

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

  it('should default subrogationFlag to false', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.subrogationFlag).toBe(false);
  });

  it('should refresh claim after issuing payment', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.paymentAmount = 3200;
    component.issuePayment();
    // getClaim is called once on init and once after payment
    expect(claimsService.getClaim).toHaveBeenCalledTimes(2);
  });
});
