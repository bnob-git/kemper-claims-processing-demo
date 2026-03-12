import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { SettlementComponent } from './settlement.component';
import { ClaimsService } from '../../services/claims.service';
import { of } from 'rxjs';
import { Claim, Policy, Payment } from '../../models/claim.model';

describe('SettlementComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockPolicy: Policy = {
    id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '',
    vehicleVin: '', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
    coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
  };

  const mockClaim: Claim = {
    id: 3, claimNumber: 'CLM-003', policy: mockPolicy,
    status: 'RESERVE_SET', lossType: 'COLLISION', severityScore: 5,
    lossDate: '2024-09-15', lossDescription: 'Test', reportedDate: '2024-09-15',
    claimantName: 'Carol', claimantPhone: '555-0303',
    reserveAmount: 3200, settlementAmount: null, subrogationFlag: false,
    createdAt: '2024-09-15T14:00:00', updatedAt: '2024-09-16T11:00:00'
  };

  const mockPayment: Payment = {
    id: 1, claimId: 3, amount: 3000, paymentType: 'SETTLEMENT',
    paymentDate: '2024-09-20', referenceNumber: 'PAY-001', status: 'COMPLETED', createdBy: 'user'
  };

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getPayments', 'issuePayment', 'closeClaim'
    ]);

    serviceSpy.getClaim.and.returnValue(of(mockClaim));
    serviceSpy.getPayments.and.returnValue(of([]));
    serviceSpy.issuePayment.and.returnValue(of(mockPayment));
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
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load claim and payments on init', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.claim).toEqual(mockClaim);
    expect(component.paymentAmount).toBe(3200);
  });

  it('should load existing payments on init', () => {
    claimsService.getPayments.and.returnValue(of([mockPayment]));
    const fixture = TestBed.createComponent(SettlementComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.payments.length).toBe(1);
  });

  it('should issue payment', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.paymentAmount = 3000;
    component.issuePayment();

    expect(claimsService.issuePayment).toHaveBeenCalledWith(3, 3000);
    expect(component.payments.length).toBe(1);
  });

  it('should not issue payment if claim is null', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.claim = null;
    component.issuePayment();
    expect(claimsService.issuePayment).not.toHaveBeenCalled();
  });

  it('should not issue payment if amount is null', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.paymentAmount = null;
    component.issuePayment();
    expect(claimsService.issuePayment).not.toHaveBeenCalled();
  });

  it('should close claim with subrogation', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.subrogationFlag = true;
    component.closeClaim();
    expect(claimsService.closeClaim).toHaveBeenCalledWith(3, true);
    expect(component.claim!.status).toBe('CLOSED');
  });

  it('should close claim without subrogation', () => {
    claimsService.closeClaim.and.returnValue(of({ ...mockClaim, status: 'CLOSED', subrogationFlag: false }));

    const fixture = TestBed.createComponent(SettlementComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.subrogationFlag = false;
    component.closeClaim();
    expect(claimsService.closeClaim).toHaveBeenCalledWith(3, false);
    expect(component.claim!.status).toBe('CLOSED');
  });

  it('should not close claim if claim is null', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.claim = null;
    component.closeClaim();
    expect(claimsService.closeClaim).not.toHaveBeenCalled();
  });

  it('should default subrogation flag to false', () => {
    const fixture = TestBed.createComponent(SettlementComponent);
    const component = fixture.componentInstance;
    expect(component.subrogationFlag).toBe(false);
  });
});
