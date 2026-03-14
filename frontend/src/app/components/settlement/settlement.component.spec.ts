import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { SettlementComponent } from './settlement.component';
import { ClaimsService } from '../../services/claims.service';
import { Claim, Policy, Payment } from '../../models/claim.model';

describe('SettlementComponent', () => {
  let component: SettlementComponent;
  let fixture: ComponentFixture<SettlementComponent>;
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockPolicy: Policy = {
    id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: 'alice@test.com',
    vehicleVin: '1HGCM82633A004352', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
    coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
  };

  const mockClaim: Claim = {
    id: 1, claimNumber: 'CLM-001', policy: mockPolicy, status: 'RESERVE_SET',
    lossType: 'COLLISION', severityScore: 7, lossDate: '2024-09-10',
    lossDescription: 'Test', reportedDate: '2024-09-10',
    claimantName: 'Alice', claimantPhone: '555-0101',
    reserveAmount: 5000, settlementAmount: null, subrogationFlag: false,
    createdAt: '2024-09-10T10:30:00', updatedAt: '2024-09-10T10:30:00'
  };

  const mockPayments: Payment[] = [];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getPayments', 'issuePayment', 'closeClaim'
    ]);
    spy.getClaim.and.returnValue(of(mockClaim));
    spy.getPayments.and.returnValue(of(mockPayments));

    await TestBed.configureTestingModule({
      imports: [SettlementComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ClaimsService, useValue: spy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }
      ]
    }).compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
    fixture = TestBed.createComponent(SettlementComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load claim and payments on init', () => {
    fixture.detectChanges();
    expect(component.claim).toBeTruthy();
    expect(component.claim!.claimNumber).toBe('CLM-001');
    expect(component.claim!.status).toBe('RESERVE_SET');
    expect(claimsService.getClaim).toHaveBeenCalledWith(1);
    expect(claimsService.getPayments).toHaveBeenCalledWith(1);
  });

  it('should set paymentAmount from claim reserveAmount on init', () => {
    fixture.detectChanges();
    expect(component.paymentAmount).toBe(5000);
  });

  it('should issue payment and update payments list', () => {
    fixture.detectChanges();
    const mockPayment: Payment = {
      id: 1, claimId: 1, amount: 5000, paymentType: 'SETTLEMENT',
      paymentDate: '2024-09-10', referenceNumber: 'PAY-12345678',
      status: 'COMPLETED', createdBy: 'system'
    };
    const settledClaim = { ...mockClaim, status: 'SETTLED', settlementAmount: 5000 };

    claimsService.issuePayment.and.returnValue(of(mockPayment));
    claimsService.getClaim.and.returnValue(of(settledClaim));

    component.paymentAmount = 5000;
    component.issuePayment();

    expect(claimsService.issuePayment).toHaveBeenCalledWith(1, 5000);
    expect(component.payments.length).toBe(1);
  });

  it('should not issue payment when claim is null', () => {
    fixture.detectChanges();
    component.claim = null;
    component.issuePayment();
    expect(claimsService.issuePayment).not.toHaveBeenCalled();
  });

  it('should not issue payment when paymentAmount is null', () => {
    fixture.detectChanges();
    component.paymentAmount = null;
    component.issuePayment();
    expect(claimsService.issuePayment).not.toHaveBeenCalled();
  });

  it('should close claim with subrogation', () => {
    fixture.detectChanges();
    const closedClaim = { ...mockClaim, status: 'CLOSED', subrogationFlag: true };
    claimsService.closeClaim.and.returnValue(of(closedClaim));

    component.subrogationFlag = true;
    component.closeClaim();

    expect(claimsService.closeClaim).toHaveBeenCalledWith(1, true);
    expect(component.claim!.status).toBe('CLOSED');
    expect(component.claim!.subrogationFlag).toBe(true);
  });

  it('should close claim without subrogation', () => {
    fixture.detectChanges();
    const closedClaim = { ...mockClaim, status: 'CLOSED', subrogationFlag: false };
    claimsService.closeClaim.and.returnValue(of(closedClaim));

    component.subrogationFlag = false;
    component.closeClaim();

    expect(claimsService.closeClaim).toHaveBeenCalledWith(1, false);
    expect(component.claim!.status).toBe('CLOSED');
  });

  it('should not close claim when claim is null', () => {
    fixture.detectChanges();
    component.claim = null;
    component.closeClaim();
    expect(claimsService.closeClaim).not.toHaveBeenCalled();
  });

  it('should default subrogationFlag to false', () => {
    expect(component.subrogationFlag).toBeFalse();
  });
});
