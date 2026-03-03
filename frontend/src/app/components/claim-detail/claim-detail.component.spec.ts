import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClaimDetailComponent } from './claim-detail.component';
import { ClaimsService } from '../../services/claims.service';
import { of } from 'rxjs';
import { Claim, Policy, ClaimEvent, Assignment, DocumentMetadata, Payment } from '../../models/claim.model';

describe('ClaimDetailComponent', () => {
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

  const mockEvents: ClaimEvent[] = [{
    id: 1, claimId: 1, eventType: 'STATUS_CHANGE',
    oldStatus: null, newStatus: 'OPEN', notes: 'FNOL submitted',
    createdBy: 'system', createdAt: '2024-09-10T10:30:00'
  }];

  const mockAssignments: Assignment[] = [{
    id: 1, claimId: 1, adjusterId: 2, assignedDate: '2024-09-10',
    assignmentType: 'AUTO', notes: 'Auto-assigned',
    adjuster: { id: 2, username: 'mwilliams', fullName: 'Maria Williams', role: 'ADJUSTER', email: 'maria@test.com' }
  }];

  const mockDocuments: DocumentMetadata[] = [{
    id: 1, claimId: 1, fileName: 'report.pdf', documentType: 'POLICE_REPORT',
    uploadedBy: 'user', uploadedAt: '2024-09-10T11:00:00', notes: 'Test'
  }];

  const mockPayments: Payment[] = [];

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getClaimEvents', 'getAssignments', 'getDocuments', 'getPayments', 'addDocument'
    ]);
    serviceSpy.getClaim.and.returnValue(of(mockClaim));
    serviceSpy.getClaimEvents.and.returnValue(of(mockEvents));
    serviceSpy.getAssignments.and.returnValue(of(mockAssignments));
    serviceSpy.getDocuments.and.returnValue(of(mockDocuments));
    serviceSpy.getPayments.and.returnValue(of(mockPayments));
    serviceSpy.addDocument.and.returnValue(of({
      id: 2, claimId: 1, fileName: 'new_doc.pdf', documentType: 'OTHER',
      uploadedBy: 'demo-user', uploadedAt: '2024-09-11T10:00:00', notes: ''
    }));

    await TestBed.configureTestingModule({
      imports: [
        ClaimDetailComponent,
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
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load claim data on init', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.claim).toEqual(mockClaim);
    expect(component.events.length).toBe(1);
    expect(component.assignments.length).toBe(1);
    expect(component.documents.length).toBe(1);
    expect(component.payments.length).toBe(0);
  });

  it('should initialize the document form', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.docForm).toBeTruthy();
    expect(component.docForm.get('fileName')).toBeTruthy();
    expect(component.docForm.get('documentType')).toBeTruthy();
  });

  it('should add a document when form is valid', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const snackBar = fixture.debugElement.injector.get(MatSnackBar);
    spyOn(snackBar, 'open');

    component.docForm.patchValue({
      fileName: 'new_doc.pdf',
      documentType: 'OTHER'
    });

    component.addDocument();
    expect(claimsService.addDocument).toHaveBeenCalledWith(1, {
      fileName: 'new_doc.pdf',
      documentType: 'OTHER',
      uploadedBy: 'demo-user',
      notes: ''
    });
    expect(component.documents.length).toBe(2);
    expect(snackBar.open).toHaveBeenCalledWith('Document added', 'Close', { duration: 2000 });
  });

  it('should not add document when form is invalid', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.docForm.patchValue({
      fileName: '',
      documentType: 'OTHER'
    });
    component.docForm.get('fileName')?.markAsTouched();

    component.addDocument();
    expect(claimsService.addDocument).not.toHaveBeenCalled();
  });

  it('should not add document when claim is null', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.claim = null;

    component.docForm.patchValue({
      fileName: 'test.pdf',
      documentType: 'OTHER'
    });

    component.addDocument();
    expect(claimsService.addDocument).not.toHaveBeenCalled();
  });

  it('should return correct event icon for STATUS_CHANGE', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.getEventIcon('STATUS_CHANGE')).toBe('swap_horiz');
  });

  it('should return correct event icon for NOTE', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.getEventIcon('NOTE')).toBe('note');
  });

  it('should return default event icon for unknown type', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.getEventIcon('UNKNOWN')).toBe('info');
  });
});
