import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClaimDetailComponent } from './claim-detail.component';
import { ClaimsService } from '../../services/claims.service';
import { of } from 'rxjs';
import { Claim, ClaimEvent, Assignment, DocumentMetadata } from '../../models/claim.model';

describe('ClaimDetailComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const mockClaim: Claim = {
    id: 1, claimNumber: 'CLM-001', policy: {
      id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '',
      vehicleVin: '1HGBH41JXMN109186', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
      coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
    },
    status: 'OPEN', lossType: 'COLLISION', severityScore: 7,
    lossDate: '2024-09-10', lossDescription: 'Test', reportedDate: '2024-09-10',
    claimantName: 'Alice', claimantPhone: '555-0101',
    reserveAmount: null, settlementAmount: null, subrogationFlag: false,
    createdAt: '2024-09-10T10:30:00', updatedAt: '2024-09-10T10:30:00'
  };

  const mockEvents: ClaimEvent[] = [
    { id: 1, claimId: 1, eventType: 'STATUS_CHANGE', oldStatus: null, newStatus: 'OPEN', notes: 'FNOL submitted', createdBy: 'system', createdAt: '2024-09-10T10:30:00' }
  ];

  const mockAssignments: Assignment[] = [
    { id: 1, claimId: 1, adjusterId: 2, assignedDate: '2024-09-10', assignmentType: 'AUTO', notes: 'Auto-assigned', adjuster: { id: 2, username: 'mwilliams', fullName: 'Maria Williams', role: 'ADJUSTER', email: '' } }
  ];

  beforeEach(async () => {
    const claimsSpy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getClaimEvents', 'getAssignments', 'getDocuments', 'getPayments', 'addDocument'
    ]);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    claimsSpy.getClaim.and.returnValue(of(mockClaim));
    claimsSpy.getClaimEvents.and.returnValue(of(mockEvents));
    claimsSpy.getAssignments.and.returnValue(of(mockAssignments));
    claimsSpy.getDocuments.and.returnValue(of([]));
    claimsSpy.getPayments.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ClaimDetailComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ClaimsService, useValue: claimsSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
      ]
    })
    .overrideComponent(ClaimDetailComponent, {
      remove: { imports: [MatSnackBarModule] }
    })
    .compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
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
  });

  it('should initialize doc form', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.docForm).toBeTruthy();
    expect(component.docForm.get('fileName')).toBeTruthy();
    expect(component.docForm.get('documentType')).toBeTruthy();
  });

  it('should add document when form is valid', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const mockDoc: DocumentMetadata = {
      id: 100, claimId: 1, fileName: 'test.pdf', documentType: 'EVIDENCE',
      uploadedBy: 'demo-user', uploadedAt: '2024-10-01T10:00:00', notes: ''
    };
    claimsService.addDocument.and.returnValue(of(mockDoc));

    component.docForm.patchValue({ fileName: 'test.pdf', documentType: 'EVIDENCE' });
    component.addDocument();

    expect(claimsService.addDocument).toHaveBeenCalled();
    expect(component.documents.length).toBe(1);
    expect(snackBar.open).toHaveBeenCalledWith('Document added', 'Close', { duration: 2000 });
  });

  it('should not add document when form is invalid', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.docForm.patchValue({ fileName: '', documentType: 'OTHER' });
    component.addDocument();
    expect(claimsService.addDocument).not.toHaveBeenCalled();
  });

  it('should not add document when claim is null', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.claim = null;

    component.docForm.patchValue({ fileName: 'test.pdf', documentType: 'EVIDENCE' });
    component.addDocument();
    expect(claimsService.addDocument).not.toHaveBeenCalled();
  });

  it('should return correct event icons', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.getEventIcon('STATUS_CHANGE')).toBe('swap_horiz');
    expect(component.getEventIcon('NOTE')).toBe('note');
    expect(component.getEventIcon('OTHER')).toBe('info');
  });
});
