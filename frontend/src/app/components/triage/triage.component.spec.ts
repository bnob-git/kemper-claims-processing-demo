import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TriageComponent } from './triage.component';
import { ClaimsService } from '../../services/claims.service';
import { of } from 'rxjs';
import { Claim, Policy, AppUser } from '../../models/claim.model';

describe('TriageComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockPolicy: Policy = {
    id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: 'alice@test.com',
    vehicleVin: 'VIN123', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
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
    { id: 1, username: 'jsmith', fullName: 'John Smith', role: 'SENIOR_ADJUSTER', email: 'john@test.com' },
    { id: 2, username: 'mwilliams', fullName: 'Maria Williams', role: 'ADJUSTER', email: 'maria@test.com' }
  ];

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getUsers', 'autoAssign', 'manualAssign', 'updateClaimStatus', 'reserveDecision'
    ]);
    serviceSpy.getClaim.and.returnValue(of(mockClaim));
    serviceSpy.getUsers.and.returnValue(of(mockUsers));
    serviceSpy.autoAssign.and.returnValue(of({
      id: 1, claimId: 1, adjusterId: 1, assignedDate: '2024-09-10',
      assignmentType: 'AUTO', notes: 'Auto-assigned',
      adjuster: mockUsers[0]
    }));
    serviceSpy.manualAssign.and.returnValue(of({
      id: 2, claimId: 1, adjusterId: 2, assignedDate: '2024-09-10',
      assignmentType: 'MANUAL', notes: 'Manual',
      adjuster: mockUsers[1]
    }));
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

  it('should default to auto assignment mode', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.assignmentMode).toBe('auto');
  });

  it('should auto-assign when mode is auto', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const snackBar = fixture.debugElement.injector.get(MatSnackBar);
    spyOn(snackBar, 'open');

    component.assign();
    expect(claimsService.autoAssign).toHaveBeenCalledWith(1);
    expect(snackBar.open).toHaveBeenCalled();
    expect(claimsService.updateClaimStatus).toHaveBeenCalledWith(1, 'UNDER_INVESTIGATION');
  });

  it('should manual-assign when mode is manual and adjuster selected', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.assignmentMode = 'manual';
    component.selectedAdjusterId = 2;
    component.assignmentNotes = 'Test notes';
    component.assign();
    expect(claimsService.manualAssign).toHaveBeenCalledWith(1, 2, 'Test notes');
    expect(claimsService.updateClaimStatus).toHaveBeenCalledWith(1, 'UNDER_INVESTIGATION');
  });

  it('should show snackbar when manual assign without adjuster', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const snackBar = fixture.debugElement.injector.get(MatSnackBar);
    spyOn(snackBar, 'open');

    component.assignmentMode = 'manual';
    component.selectedAdjusterId = null;
    component.assign();
    expect(snackBar.open).toHaveBeenCalledWith('Please select an adjuster', 'Close', { duration: 3000 });
    expect(claimsService.manualAssign).not.toHaveBeenCalled();
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
    const snackBar = fixture.debugElement.injector.get(MatSnackBar);
    spyOn(snackBar, 'open');

    component.reserveAmount = 5000;
    component.approveReserve();
    expect(claimsService.reserveDecision).toHaveBeenCalledWith(1, 'APPROVE', 5000);
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should approve reserve without amount (auto-calculate)', () => {
    const fixture = TestBed.createComponent(TriageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

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
    const snackBar = fixture.debugElement.injector.get(MatSnackBar);
    spyOn(snackBar, 'open');

    component.denyReserve();
    expect(claimsService.reserveDecision).toHaveBeenCalledWith(1, 'DENY');
    expect(snackBar.open).toHaveBeenCalledWith('Reserve denied', 'Close', { duration: 3000 });
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
