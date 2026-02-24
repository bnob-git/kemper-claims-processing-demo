import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { TriageComponent } from './triage.component';
import { ClaimsService } from '../../services/claims.service';
import { Claim, Policy, AppUser, Assignment } from '../../models/claim.model';

describe('TriageComponent', () => {
  let component: TriageComponent;
  let fixture: ComponentFixture<TriageComponent>;
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockPolicy: Policy = {
    id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: 'alice@test.com',
    vehicleVin: '1HGCM82633A004352', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
    coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
  };

  const mockClaim: Claim = {
    id: 1, claimNumber: 'CLM-001', policy: mockPolicy, status: 'OPEN',
    lossType: 'COLLISION', severityScore: 7, lossDate: '2024-09-10',
    lossDescription: 'Test collision', reportedDate: '2024-09-10',
    claimantName: 'Alice', claimantPhone: '555-0101',
    reserveAmount: null, settlementAmount: null, subrogationFlag: false,
    createdAt: '2024-09-10T10:30:00', updatedAt: '2024-09-10T10:30:00'
  };

  const mockUsers: AppUser[] = [
    { id: 1, username: 'jsmith', fullName: 'John Smith', role: 'SENIOR_ADJUSTER', email: 'j@test.com' },
    { id: 2, username: 'mwilliams', fullName: 'Maria Williams', role: 'ADJUSTER', email: 'm@test.com' }
  ];

  const mockAssignment: Assignment = {
    id: 1, claimId: 1, adjusterId: 1, assignedDate: '2024-09-10',
    assignmentType: 'AUTO', notes: 'Auto-assigned',
    adjuster: mockUsers[0]
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getUsers', 'autoAssign', 'manualAssign',
      'updateClaimStatus', 'reserveDecision'
    ]);
    spy.getClaim.and.returnValue(of(mockClaim));
    spy.getUsers.and.returnValue(of(mockUsers));
    spy.autoAssign.and.returnValue(of(mockAssignment));
    spy.updateClaimStatus.and.returnValue(of({ ...mockClaim, status: 'UNDER_INVESTIGATION' }));

    await TestBed.configureTestingModule({
      imports: [TriageComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ClaimsService, useValue: spy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }
      ]
    }).compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
    fixture = TestBed.createComponent(TriageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load claim and users on init', () => {
    fixture.detectChanges();
    expect(component.claim).toBeTruthy();
    expect(component.claim!.claimNumber).toBe('CLM-001');
    expect(component.users.length).toBe(2);
    expect(claimsService.getClaim).toHaveBeenCalledWith(1);
    expect(claimsService.getUsers).toHaveBeenCalled();
  });

  it('should default to auto assignment mode', () => {
    expect(component.assignmentMode).toBe('auto');
  });

  it('should auto-assign when assignmentMode is auto', () => {
    fixture.detectChanges();
    component.assignmentMode = 'auto';
    component.assign();

    expect(claimsService.autoAssign).toHaveBeenCalledWith(1);
    expect(claimsService.updateClaimStatus).toHaveBeenCalledWith(1, 'UNDER_INVESTIGATION');
  });

  it('should manually assign when assignmentMode is manual and adjuster is selected', () => {
    fixture.detectChanges();
    const manualAssignment: Assignment = {
      ...mockAssignment, assignmentType: 'MANUAL', adjusterId: 2,
      adjuster: mockUsers[1]
    };
    claimsService.manualAssign.and.returnValue(of(manualAssignment));

    component.assignmentMode = 'manual';
    component.selectedAdjusterId = 2;
    component.assignmentNotes = 'Special case';
    component.assign();

    expect(claimsService.manualAssign).toHaveBeenCalledWith(1, 2, 'Special case');
    expect(claimsService.updateClaimStatus).toHaveBeenCalledWith(1, 'UNDER_INVESTIGATION');
  });

  it('should not manually assign when no adjuster is selected', () => {
    fixture.detectChanges();
    component.assignmentMode = 'manual';
    component.selectedAdjusterId = null;
    component.assign();

    expect(claimsService.manualAssign).not.toHaveBeenCalled();
  });

  it('should not assign when claim is null', () => {
    fixture.detectChanges();
    component.claim = null;
    component.assign();

    expect(claimsService.autoAssign).not.toHaveBeenCalled();
    expect(claimsService.manualAssign).not.toHaveBeenCalled();
  });

  it('should approve reserve with amount', () => {
    fixture.detectChanges();
    const reservedClaim = { ...mockClaim, status: 'RESERVE_SET', reserveAmount: 5000 };
    claimsService.reserveDecision.and.returnValue(of(reservedClaim));

    component.reserveAmount = 5000;
    component.approveReserve();

    expect(claimsService.reserveDecision).toHaveBeenCalledWith(1, 'APPROVE', 5000);
    expect(component.claim!.status).toBe('RESERVE_SET');
  });

  it('should approve reserve without amount (auto-calculate)', () => {
    fixture.detectChanges();
    const reservedClaim = { ...mockClaim, status: 'RESERVE_SET', reserveAmount: 8050 };
    claimsService.reserveDecision.and.returnValue(of(reservedClaim));

    component.reserveAmount = null;
    component.approveReserve();

    expect(claimsService.reserveDecision).toHaveBeenCalledWith(1, 'APPROVE', undefined);
  });

  it('should not approve reserve when claim is null', () => {
    fixture.detectChanges();
    component.claim = null;
    component.approveReserve();

    expect(claimsService.reserveDecision).not.toHaveBeenCalled();
  });

  it('should deny reserve', () => {
    fixture.detectChanges();
    const deniedClaim = { ...mockClaim, status: 'DENIED' };
    claimsService.reserveDecision.and.returnValue(of(deniedClaim));

    component.denyReserve();

    expect(claimsService.reserveDecision).toHaveBeenCalledWith(1, 'DENY');
    expect(component.claim!.status).toBe('DENIED');
  });

  it('should not deny reserve when claim is null', () => {
    fixture.detectChanges();
    component.claim = null;
    component.denyReserve();

    expect(claimsService.reserveDecision).not.toHaveBeenCalled();
  });
});
