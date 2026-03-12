import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { ClaimDetailComponent } from './claim-detail.component';
import { ClaimsService } from '../../services/claims.service';
import { of } from 'rxjs';
import { Claim, Policy, ClaimEvent, Assignment, DocumentMetadata, Payment } from '../../models/claim.model';

describe('ClaimDetailComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockPolicy: Policy = {
    id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '',
    vehicleVin: 'VIN123', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
    coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
  };

  const mockClaim: Claim = {
    id: 1, claimNumber: 'CLM-001', policy: mockPolicy,
    status: 'OPEN', lossType: 'COLLISION', severityScore: 7,
    lossDate: '2024-09-10', lossDescription: 'Test collision', reportedDate: '2024-09-10',
    claimantName: 'Alice', claimantPhone: '555-0101',
    reserveAmount: null, settlementAmount: null, subrogationFlag: false,
    createdAt: '2024-09-10T10:30:00', updatedAt: '2024-09-10T10:30:00'
  };

  const mockEvent: ClaimEvent = {
    id: 1, claimId: 1, eventType: 'STATUS_CHANGE', oldStatus: null,
    newStatus: 'OPEN', notes: 'FNOL submitted', createdBy: 'system', createdAt: '2024-09-10'
  };

  const mockAssignment: Assignment = {
    id: 1, claimId: 1, adjusterId: 1, assignedDate: '2024-09-10',
    assignmentType: 'AUTO', notes: 'Auto-assigned',
    adjuster: { id: 1, username: 'jsmith', fullName: 'John Smith', role: 'SENIOR_ADJUSTER', email: '' }
  };

  const mockDoc: DocumentMetadata = {
    id: 1, claimId: 1, fileName: 'report.pdf', documentType: 'POLICE_REPORT',
    uploadedBy: 'user', uploadedAt: '2024-09-10', notes: 'Test'
  };

  const mockPayment: Payment = {
    id: 1, claimId: 1, amount: 3000, paymentType: 'SETTLEMENT',
    paymentDate: '2024-09-20', referenceNumber: 'PAY-001', status: 'COMPLETED', createdBy: 'user'
  };

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getClaimEvents', 'getAssignments', 'getDocuments', 'getPayments', 'addDocument'
    ]);

    serviceSpy.getClaim.and.returnValue(of(mockClaim));
    serviceSpy.getClaimEvents.and.returnValue(of([mockEvent]));
    serviceSpy.getAssignments.and.returnValue(of([mockAssignment]));
    serviceSpy.getDocuments.and.returnValue(of([mockDoc]));
    serviceSpy.getPayments.and.returnValue(of([mockPayment]));
    serviceSpy.addDocument.and.returnValue(of({ ...mockDoc, id: 2, fileName: 'new.pdf' }));

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
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load claim data on init', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.claim).toEqual(mockClaim);
    expect(component.events.length).toBe(1);
    expect(component.assignments.length).toBe(1);
    expect(component.documents.length).toBe(1);
    expect(component.payments.length).toBe(1);
  });

  it('should initialize doc form', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.docForm).toBeTruthy();
    expect(component.docForm.get('fileName')).toBeTruthy();
    expect(component.docForm.get('documentType')).toBeTruthy();
  });

  it('should add a document', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.docForm.patchValue({ fileName: 'new.pdf', documentType: 'PHOTO' });
    component.addDocument();

    expect(claimsService.addDocument).toHaveBeenCalled();
    expect(component.documents.length).toBe(2);
  });

  it('should not add document if form is invalid', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.docForm.patchValue({ fileName: '', documentType: 'PHOTO' });
    component.addDocument();
    expect(claimsService.addDocument).not.toHaveBeenCalled();
  });

  it('should not add document if claim is null', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.claim = null;
    component.docForm.patchValue({ fileName: 'test.pdf', documentType: 'PHOTO' });
    component.addDocument();
    expect(claimsService.addDocument).not.toHaveBeenCalled();
  });

  it('should return correct event icons', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    const component = fixture.componentInstance;
    expect(component.getEventIcon('STATUS_CHANGE')).toBe('swap_horiz');
    expect(component.getEventIcon('NOTE')).toBe('note');
    expect(component.getEventIcon('OTHER')).toBe('info');
  });
});
