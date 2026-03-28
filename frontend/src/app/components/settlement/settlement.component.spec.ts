import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SettlementComponent } from './settlement.component';
import { ClaimsService } from '../../services/claims.service';
import { Claim, Payment } from '../../models/claim.model';

describe('SettlementComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockClaim: Claim = {
    id: 3, claimNumber: 'CLM-003', policy: {
      id: 3, policyNumber: 'POL-003', holderName: 'Carol', holderEmail: '',
      vehicleVin: '', vehicleYear: 2023, vehicleMake: 'Tesla', vehicleModel: 'Model S',
      coverageType: 'COMPREHENSIVE', effectiveDate: '2024-06-01', expirationDate: '2025-06-01'
    },
    status: 'RESERVE_SET', lossType: 'COLLISION', severityScore: 5,
    lossDate: '2024-09-15', lossDescription: 'Fender bender', reportedDate: '2024-09-15',
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
    expect(component.claim).toBeTruthy();
    expect(component.claim?.claimNumber).toBe('CLM-003');
    expect(component.payments.length).toBe(0);
  });

  it('should set payment amount to reserve amount on init', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.paymentAmount).toBe(3200);
  });

  it('should issue payment successfully', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const mockPayment: Payment = {
      id: 100, claimId: 3, amount: 3000, paymentType: 'SETTLEMENT',
      paymentDate: '2024-10-01', referenceNumber: 'PAY-NEW', status: 'COMPLETED', createdBy: 'test'
    };
    const settledClaim = { ...mockClaim, status: 'SETTLED', settlementAmount: 3000 };
    claimsService.issuePayment.and.returnValue(of(mockPayment));
    claimsService.getClaim.and.returnValue(of(settledClaim));

    component.paymentAmount = 3000;
    component.issuePayment();

    expect(claimsService.issuePayment).toHaveBeenCalledWith(3, 3000);
    expect(component.payments.length).toBe(1);
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
    component.claim = { ...mockClaim, status: 'SETTLED' };

    const closedClaim = { ...mockClaim, status: 'CLOSED', subrogationFlag: true };
    claimsService.closeClaim.and.returnValue(of(closedClaim));

    component.subrogationFlag = true;
    component.closeClaim();

    expect(claimsService.closeClaim).toHaveBeenCalledWith(3, true);
    expect(component.claim?.status).toBe('CLOSED');
  });

  it('should close claim without subrogation', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.claim = { ...mockClaim, status: 'SETTLED' };

    const closedClaim = { ...mockClaim, status: 'CLOSED', subrogationFlag: false };
    claimsService.closeClaim.and.returnValue(of(closedClaim));

    component.subrogationFlag = false;
    component.closeClaim();

    expect(claimsService.closeClaim).toHaveBeenCalledWith(3, false);
    expect(component.claim?.status).toBe('CLOSED');
  });

  it('should not close claim when claim is null', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.claim = null;
    component.closeClaim();
    expect(claimsService.closeClaim).not.toHaveBeenCalled();
  });

  it('should default subrogation flag to false', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.subrogationFlag).toBe(false);
  });
});
