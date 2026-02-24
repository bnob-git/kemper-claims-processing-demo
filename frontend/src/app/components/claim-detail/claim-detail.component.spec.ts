import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ClaimDetailComponent } from './claim-detail.component';
import { ClaimsService } from '../../services/claims.service';
import { Claim, Policy, ClaimEvent, Assignment, DocumentMetadata, Payment } from '../../models/claim.model';

describe('ClaimDetailComponent', () => {
  let component: ClaimDetailComponent;
  let fixture: ComponentFixture<ClaimDetailComponent>;
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockPolicy: Policy = {
    id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: 'alice@test.com',
    vehicleVin: '1HGCM82633A004352', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
    coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
  };

  const mockClaim: Claim = {
    id: 1, claimNumber: 'CLM-001', policy: mockPolicy, status: 'OPEN',
    lossType: 'COLLISION', severityScore: 7, lossDate: '2024-09-10',
    lossDescription: 'Rear-end collision at intersection', reportedDate: '2024-09-10',
    claimantName: 'Alice', claimantPhone: '555-0101',
    reserveAmount: null, settlementAmount: null, subrogationFlag: false,
    createdAt: '2024-09-10T10:30:00', updatedAt: '2024-09-10T10:30:00'
  };

  const mockEvents: ClaimEvent[] = [{
    id: 1, claimId: 1, eventType: 'STATUS_CHANGE', oldStatus: null,
    newStatus: 'OPEN', notes: 'FNOL submitted', createdBy: 'system',
    createdAt: '2024-09-10T10:30:00'
  }];

  const mockAssignments: Assignment[] = [];
  const mockDocuments: DocumentMetadata[] = [];
  const mockPayments: Payment[] = [];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getClaimEvents', 'getAssignments', 'getDocuments', 'getPayments', 'addDocument'
    ]);
    spy.getClaim.and.returnValue(of(mockClaim));
    spy.getClaimEvents.and.returnValue(of(mockEvents));
    spy.getAssignments.and.returnValue(of(mockAssignments));
    spy.getDocuments.and.returnValue(of(mockDocuments));
    spy.getPayments.and.returnValue(of(mockPayments));

    await TestBed.configureTestingModule({
      imports: [ClaimDetailComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ClaimsService, useValue: spy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } }
        }
      ]
    }).compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
    fixture = TestBed.createComponent(ClaimDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load claim on init', () => {
    fixture.detectChanges();
    expect(component.claim).toBeTruthy();
    expect(component.claim!.claimNumber).toBe('CLM-001');
  });

  it('should load events on init', () => {
    fixture.detectChanges();
    expect(component.events.length).toBe(1);
    expect(component.events[0].eventType).toBe('STATUS_CHANGE');
  });

  it('should call all service methods on loadClaim', () => {
    fixture.detectChanges();
    expect(claimsService.getClaim).toHaveBeenCalledWith(1);
    expect(claimsService.getClaimEvents).toHaveBeenCalledWith(1);
    expect(claimsService.getAssignments).toHaveBeenCalledWith(1);
    expect(claimsService.getDocuments).toHaveBeenCalledWith(1);
    expect(claimsService.getPayments).toHaveBeenCalledWith(1);
  });

  it('should initialize docForm with required validators', () => {
    fixture.detectChanges();
    expect(component.docForm).toBeTruthy();
    expect(component.docForm.get('fileName')).toBeTruthy();
    expect(component.docForm.get('documentType')).toBeTruthy();
    expect(component.docForm.get('documentType')!.value).toBe('OTHER');
  });

  it('should add document and update documents list', () => {
    fixture.detectChanges();
    const mockDoc: DocumentMetadata = {
      id: 1, claimId: 1, fileName: 'photo.jpg', documentType: 'PHOTO',
      uploadedBy: 'demo-user', uploadedAt: '2024-09-10T10:30:00', notes: ''
    };
    claimsService.addDocument.and.returnValue(of(mockDoc));

    component.docForm.setValue({ fileName: 'photo.jpg', documentType: 'PHOTO' });
    component.addDocument();

    expect(claimsService.addDocument).toHaveBeenCalledWith(1, jasmine.objectContaining({
      fileName: 'photo.jpg',
      documentType: 'PHOTO',
      uploadedBy: 'demo-user'
    }));
    expect(component.documents.length).toBe(1);
  });

  it('should not add document if form is invalid', () => {
    fixture.detectChanges();
    component.docForm.setValue({ fileName: '', documentType: 'OTHER' });
    component.addDocument();
    expect(claimsService.addDocument).not.toHaveBeenCalled();
  });

  it('should not add document if claim is null', () => {
    fixture.detectChanges();
    component.claim = null;
    component.docForm.setValue({ fileName: 'test.pdf', documentType: 'OTHER' });
    component.addDocument();
    expect(claimsService.addDocument).not.toHaveBeenCalled();
  });

  it('should return correct event icons', () => {
    expect(component.getEventIcon('STATUS_CHANGE')).toBe('swap_horiz');
    expect(component.getEventIcon('NOTE')).toBe('note');
    expect(component.getEventIcon('UNKNOWN')).toBe('info');
  });
});
