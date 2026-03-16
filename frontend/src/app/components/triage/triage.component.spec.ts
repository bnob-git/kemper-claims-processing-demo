import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TriageComponent } from './triage.component';
import { ClaimsService } from '../../services/claims.service';
import { of } from 'rxjs';
import { Claim, AppUser, Assignment } from '../../models/claim.model';

describe('TriageComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const mockClaim: Claim = {
    id: 1, claimNumber: 'CLM-001', policy: {
      id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '',
      vehicleVin: '', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
      coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
    },
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

  beforeEach(async () => {
    const claimsSpy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getUsers', 'autoAssign', 'manualAssign', 'updateClaimStatus', 'reserveDecision'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    claimsSpy.getClaim.and.returnValue(of(mockClaim));
    claimsSpy.getUsers.and.returnValue(of(mockUsers));

    await TestBed.configureTestingModule({
      imports: [TriageComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ClaimsService, useValue: claimsSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
      ]
    })
    .overrideComponent(TriageComponent, {
      remove: { imports: [MatSnackBarModule] }
    })
    .compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load claim and users on init', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.claim).toEqual(mockClaim);
    expect(component.users.length).toBe(2);
  });

  it('should auto-assign claim', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const mockAssignment: Assignment = {
      id: 100, claimId: 1, adjusterId: 1, assignedDate: '2024-10-01',
      assignmentType: 'AUTO', notes: 'Auto-assigned',
      adjuster: { id: 1, username: 'jsmith', fullName: 'John Smith', role: 'SENIOR_ADJUSTER', email: '' }
    };
    claimsService.autoAssign.and.returnValue(of(mockAssignment));
    claimsService.updateClaimStatus.and.returnValue(of({ ...mockClaim, status: 'UNDER_INVESTIGATION' }));

    component.assignmentMode = 'auto';
    component.assign();

    expect(claimsService.autoAssign).toHaveBeenCalledWith(1);
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should manual-assign claim', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const mockAssignment: Assignment = {
      id: 101, claimId: 1, adjusterId: 2, assignedDate: '2024-10-01',
      assignmentType: 'MANUAL', notes: 'Test',
      adjuster: { id: 2, username: 'mwilliams', fullName: 'Maria Williams', role: 'ADJUSTER', email: '' }
    };
    claimsService.manualAssign.and.returnValue(of(mockAssignment));
    claimsService.updateClaimStatus.and.returnValue(of({ ...mockClaim, status: 'UNDER_INVESTIGATION' }));

    component.assignmentMode = 'manual';
    component.selectedAdjusterId = 2;
    component.assignmentNotes = 'Test';
    component.assign();

    expect(claimsService.manualAssign).toHaveBeenCalledWith(1, 2, 'Test');
  });

  it('should show snackbar when no adjuster selected for manual assign', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.assignmentMode = 'manual';
    component.selectedAdjusterId = null;
    component.assign();

    expect(snackBar.open).toHaveBeenCalledWith('Please select an adjuster', 'Close', { duration: 3000 });
  });

  it('should not assign when claim is null', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.claim = null;
    component.assign();
    expect(claimsService.autoAssign).not.toHaveBeenCalled();
  });

  it('should approve reserve with amount', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const updatedClaim = { ...mockClaim, status: 'RESERVE_SET', reserveAmount: 5000 };
    claimsService.reserveDecision.and.returnValue(of(updatedClaim));

    component.reserveAmount = 5000;
    component.approveReserve();

    expect(claimsService.reserveDecision).toHaveBeenCalledWith(1, 'APPROVE', 5000);
    expect(component.claim!.status).toBe('RESERVE_SET');
  });

  it('should approve reserve without amount (auto-calculate)', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const updatedClaim = { ...mockClaim, status: 'RESERVE_SET', reserveAmount: 8050 };
    claimsService.reserveDecision.and.returnValue(of(updatedClaim));

    component.reserveAmount = null;
    component.approveReserve();

    expect(claimsService.reserveDecision).toHaveBeenCalledWith(1, 'APPROVE', undefined);
  });

  it('should not approve reserve when claim is null', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.claim = null;
    component.approveReserve();
    expect(claimsService.reserveDecision).not.toHaveBeenCalled();
  });

  it('should deny reserve', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const deniedClaim = { ...mockClaim, status: 'DENIED' };
    claimsService.reserveDecision.and.returnValue(of(deniedClaim));

    component.denyReserve();

    expect(claimsService.reserveDecision).toHaveBeenCalledWith(1, 'DENY');
    expect(component.claim!.status).toBe('DENIED');
  });

  it('should not deny reserve when claim is null', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.claim = null;
    component.denyReserve();
    expect(claimsService.reserveDecision).not.toHaveBeenCalled();
  });
});
