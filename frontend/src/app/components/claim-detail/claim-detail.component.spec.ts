import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ClaimDetailComponent } from './claim-detail.component';
import { ClaimsService } from '../../services/claims.service';
import { Claim, ClaimEvent, Assignment, DocumentMetadata, Payment } from '../../models/claim.model';

describe('ClaimDetailComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;

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

  const mockEvents: ClaimEvent[] = [{
    id: 1, claimId: 1, eventType: 'STATUS_CHANGE', oldStatus: null,
    newStatus: 'OPEN', notes: 'FNOL submitted', createdBy: 'system', createdAt: '2024-09-10T10:30:00'
  }];

  const mockAssignments: Assignment[] = [{
    id: 1, claimId: 1, adjusterId: 2, assignedDate: '2024-09-10',
    assignmentType: 'AUTO', notes: 'Auto-assigned',
    adjuster: { id: 2, username: 'mwilliams', fullName: 'Maria Williams', role: 'ADJUSTER', email: '' }
  }];

  const mockDocuments: DocumentMetadata[] = [{
    id: 1, claimId: 1, fileName: 'report.pdf', documentType: 'POLICE_REPORT',
    uploadedBy: 'alice', uploadedAt: '2024-09-10T11:00:00', notes: 'Initial report'
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
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.claim).toBeTruthy();
    expect(component.claim?.claimNumber).toBe('CLM-001');
    expect(component.events.length).toBe(1);
    expect(component.assignments.length).toBe(1);
    expect(component.documents.length).toBe(1);
    expect(component.payments.length).toBe(0);
  });

  it('should initialize document form', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.docForm).toBeTruthy();
    expect(component.docForm.get('fileName')).toBeTruthy();
    expect(component.docForm.get('documentType')).toBeTruthy();
  });

  it('should add document successfully', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const newDoc: DocumentMetadata = {
      id: 100, claimId: 1, fileName: 'new.pdf', documentType: 'PHOTO',
      uploadedBy: 'demo-user', uploadedAt: '2024-10-01T10:00:00', notes: ''
    };
    claimsService.addDocument.and.returnValue(of(newDoc));

    component.docForm.setValue({ fileName: 'new.pdf', documentType: 'PHOTO' });
    component.addDocument();

    expect(claimsService.addDocument).toHaveBeenCalledWith(1, jasmine.objectContaining({
      fileName: 'new.pdf',
      documentType: 'PHOTO',
      uploadedBy: 'demo-user'
    }));
    expect(component.documents.length).toBe(2);
  });

  it('should not add document when form is invalid', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.docForm.setValue({ fileName: '', documentType: 'OTHER' });
    component.addDocument();
    expect(claimsService.addDocument).not.toHaveBeenCalled();
  });

  it('should not add document when claim is null', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.claim = null;
    component.docForm.setValue({ fileName: 'test.pdf', documentType: 'OTHER' });
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
