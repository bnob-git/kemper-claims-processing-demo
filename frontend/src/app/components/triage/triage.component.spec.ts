import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { TriageComponent } from './triage.component';
import { ClaimsService } from '../../services/claims.service';
import { of } from 'rxjs';
import { Claim, Policy, AppUser, Assignment } from '../../models/claim.model';

describe('TriageComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockPolicy: Policy = {
    id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '',
    vehicleVin: '', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
    coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
  };

  const mockClaim: Claim = {
    id: 1, claimNumber: 'CLM-001', policy: mockPolicy,
    status: 'OPEN', lossType: 'COLLISION', severityScore: 7,
    lossDate: '2024-09-10', lossDescription: 'Test', reportedDate: '2024-09-10',
    claimantName: 'Alice', claimantPhone: '555-0101',
    reserveAmount: null, settlementAmount: null, subrogationFlag: false,
    createdAt: '2024-09-10T10:30:00', updatedAt: '2024-09-10T10:30:00'
  };

  const mockUsers: AppUser[] = [
    { id: 1, username: 'jsmith', fullName: 'John Smith', role: 'SENIOR_ADJUSTER', email: '' },
    { id: 2, username: 'mwilliams', fullName: 'Maria Williams', role: 'ADJUSTER', email: '' }
  ];

  const mockAssignment: Assignment = {
    id: 1, claimId: 1, adjusterId: 1, assignedDate: '2024-09-10',
    assignmentType: 'AUTO', notes: 'Auto-assigned',
    adjuster: mockUsers[0]
  };

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getUsers', 'autoAssign', 'manualAssign', 'updateClaimStatus', 'reserveDecision'
    ]);

    serviceSpy.getClaim.and.returnValue(of(mockClaim));
    serviceSpy.getUsers.and.returnValue(of(mockUsers));
    serviceSpy.autoAssign.and.returnValue(of(mockAssignment));
    serviceSpy.manualAssign.and.returnValue(of({ ...mockAssignment, assignmentType: 'MANUAL' }));
    serviceSpy.updateClaimStatus.and.returnValue(of({ ...mockClaim, status: 'UNDER_INVESTIGATION' }));
    serviceSpy.reserveDecision.and.returnValue(of({ ...mockClaim, status: 'RESERVE_SET', reserveAmount: 5000 }));

    await TestBed.configureTestingModule({
      imports: [
        TriageComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ClaimsService, useValue: serviceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } }
        }
      ]
    }).compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load claim and users on init', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.claim).toEqual(mockClaim);
    expect(component.users.length).toBe(2);
  });

  it('should default to auto assignment mode', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.assignmentMode).toBe('auto');
  });

  it('should auto-assign claim', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.assign();
    expect(claimsService.autoAssign).toHaveBeenCalledWith(1);
    expect(claimsService.updateClaimStatus).toHaveBeenCalledWith(1, 'UNDER_INVESTIGATION');
  });

  it('should manual-assign claim with selected adjuster', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.assignmentMode = 'manual';
    component.selectedAdjusterId = 2;
    component.assignmentNotes = 'Manual test';
    component.assign();

    expect(claimsService.manualAssign).toHaveBeenCalledWith(1, 2, 'Manual test');
    expect(claimsService.updateClaimStatus).toHaveBeenCalledWith(1, 'UNDER_INVESTIGATION');
  });

  it('should not manual-assign without adjuster selected', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.assignmentMode = 'manual';
    component.selectedAdjusterId = null;
    component.assign();

    expect(claimsService.manualAssign).not.toHaveBeenCalled();
  });

  it('should not assign if claim is null', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.claim = null;
    component.assign();
    expect(claimsService.autoAssign).not.toHaveBeenCalled();
  });

  it('should approve reserve with amount', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.reserveAmount = 5000;
    component.approveReserve();
    expect(claimsService.reserveDecision).toHaveBeenCalledWith(1, 'APPROVE', 5000);
    expect(component.claim!.status).toBe('RESERVE_SET');
  });

  it('should approve reserve without amount (auto-calc)', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.reserveAmount = null;
    component.approveReserve();
    expect(claimsService.reserveDecision).toHaveBeenCalledWith(1, 'APPROVE', undefined);
  });

  it('should not approve reserve if claim is null', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.claim = null;
    component.approveReserve();
    expect(claimsService.reserveDecision).not.toHaveBeenCalled();
  });

  it('should deny reserve', () => {
    claimsService.reserveDecision.and.returnValue(of({ ...mockClaim, status: 'DENIED' }));

    const fixture = TestBed.createComponent(TriageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.denyReserve();
    expect(claimsService.reserveDecision).toHaveBeenCalledWith(1, 'DENY');
    expect(component.claim!.status).toBe('DENIED');
  });

  it('should not deny reserve if claim is null', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.claim = null;
    component.denyReserve();
    expect(claimsService.reserveDecision).not.toHaveBeenCalled();
  });
});
