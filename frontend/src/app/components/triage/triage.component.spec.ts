import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { TriageComponent } from './triage.component';
import { ClaimsService } from '../../services/claims.service';
import { Claim, AppUser, Assignment, Policy } from '../../models/claim.model';

describe('TriageComponent', () => {
  let component: TriageComponent;
  let fixture: ComponentFixture<TriageComponent>;
  let claimsServiceSpy: jasmine.SpyObj<ClaimsService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackBar: MatSnackBar;

  const mockPolicy: Policy = {
    id: 1, policyNumber: 'POL-001', holderName: 'Alice Smith', holderEmail: '',
    vehicleVin: 'VIN001', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
    coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
  };

  const mockClaim: Claim = {
    id: 1, claimNumber: 'CLM-001', policy: mockPolicy,
    status: 'OPEN', lossType: 'COLLISION', severityScore: 7,
    lossDate: '2024-09-10', lossDescription: 'Test collision',
    reportedDate: '2024-09-10', claimantName: 'Alice', claimantPhone: '555-0101',
    reserveAmount: null, settlementAmount: null, subrogationFlag: false,
    createdAt: '', updatedAt: ''
  };

  const mockUsers: AppUser[] = [
    { id: 1, username: 'jsmith', fullName: 'John Smith', role: 'SENIOR_ADJUSTER', email: 'jsmith@pnc.com' },
    { id: 2, username: 'mwilliams', fullName: 'Maria Williams', role: 'ADJUSTER', email: 'mwilliams@pnc.com' }
  ];

  beforeEach(async () => {
    claimsServiceSpy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getUsers', 'autoAssign', 'manualAssign', 'updateClaimStatus', 'reserveDecision'
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    claimsServiceSpy.getClaim.and.returnValue(of(mockClaim));
    claimsServiceSpy.getUsers.and.returnValue(of(mockUsers));

    await TestBed.configureTestingModule({
      imports: [
        TriageComponent,
        NoopAnimationsModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: ClaimsService, useValue: claimsServiceSpy },
        { provide: Router, useValue: routerSpy },
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

    fixture = TestBed.createComponent(TriageComponent);
    component = fixture.componentInstance;
    snackBar = fixture.debugElement.injector.get(MatSnackBar);
    spyOn(snackBar, 'open');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load claim and users on init', () => {
    expect(claimsServiceSpy.getClaim).toHaveBeenCalledWith(1);
    expect(claimsServiceSpy.getUsers).toHaveBeenCalled();
    expect(component.claim).toEqual(mockClaim);
    expect(component.users.length).toBe(2);
  });

  it('should auto-assign claim', () => {
    const mockAssignment: Assignment = {
      id: 1, claimId: 1, adjusterId: 1, assignedDate: '2024-10-01',
      assignmentType: 'AUTO', notes: 'Auto-assigned', adjuster: mockUsers[0]
    };
    claimsServiceSpy.autoAssign.and.returnValue(of(mockAssignment));
    const updatedClaim = { ...mockClaim, status: 'UNDER_INVESTIGATION' };
    claimsServiceSpy.updateClaimStatus.and.returnValue(of(updatedClaim));

    component.assignmentMode = 'auto';
    component.assign();

    expect(claimsServiceSpy.autoAssign).toHaveBeenCalledWith(1);
    expect(claimsServiceSpy.updateClaimStatus).toHaveBeenCalledWith(1, 'UNDER_INVESTIGATION');
  });

  it('should manual-assign claim with selected adjuster', () => {
    const mockAssignment: Assignment = {
      id: 1, claimId: 1, adjusterId: 2, assignedDate: '2024-10-01',
      assignmentType: 'MANUAL', notes: 'Override', adjuster: mockUsers[1]
    };
    claimsServiceSpy.manualAssign.and.returnValue(of(mockAssignment));
    const updatedClaim = { ...mockClaim, status: 'UNDER_INVESTIGATION' };
    claimsServiceSpy.updateClaimStatus.and.returnValue(of(updatedClaim));

    component.assignmentMode = 'manual';
    component.selectedAdjusterId = 2;
    component.assignmentNotes = 'Override';
    component.assign();

    expect(claimsServiceSpy.manualAssign).toHaveBeenCalledWith(1, 2, 'Override');
    expect(claimsServiceSpy.updateClaimStatus).toHaveBeenCalledWith(1, 'UNDER_INVESTIGATION');
  });

  it('should show error when manual assign without selecting adjuster', () => {
    component.assignmentMode = 'manual';
    component.selectedAdjusterId = null;
    component.assign();

    expect(snackBar.open).toHaveBeenCalledWith('Please select an adjuster', 'Close', { duration: 3000 });
    expect(claimsServiceSpy.manualAssign).not.toHaveBeenCalled();
  });

  it('should approve reserve with amount', () => {
    const updatedClaim = { ...mockClaim, status: 'RESERVE_SET', reserveAmount: 5000 };
    claimsServiceSpy.reserveDecision.and.returnValue(of(updatedClaim));

    component.reserveAmount = 5000;
    component.approveReserve();

    expect(claimsServiceSpy.reserveDecision).toHaveBeenCalledWith(1, 'APPROVE', 5000);
    expect(component.claim!.status).toBe('RESERVE_SET');
  });

  it('should approve reserve without amount (auto-calculate)', () => {
    const updatedClaim = { ...mockClaim, status: 'RESERVE_SET', reserveAmount: 8050 };
    claimsServiceSpy.reserveDecision.and.returnValue(of(updatedClaim));

    component.reserveAmount = null;
    component.approveReserve();

    expect(claimsServiceSpy.reserveDecision).toHaveBeenCalledWith(1, 'APPROVE', undefined);
  });

  it('should deny reserve', () => {
    const deniedClaim = { ...mockClaim, status: 'DENIED' };
    claimsServiceSpy.reserveDecision.and.returnValue(of(deniedClaim));

    component.denyReserve();

    expect(claimsServiceSpy.reserveDecision).toHaveBeenCalledWith(1, 'DENY');
    expect(component.claim!.status).toBe('DENIED');
  });
});
