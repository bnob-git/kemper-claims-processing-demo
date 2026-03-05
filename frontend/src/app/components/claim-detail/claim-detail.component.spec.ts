import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { ClaimDetailComponent } from './claim-detail.component';
import { ClaimsService } from '../../services/claims.service';
import { Claim, ClaimEvent, Assignment, DocumentMetadata, Payment, Policy } from '../../models/claim.model';

describe('ClaimDetailComponent', () => {
  let component: ClaimDetailComponent;
  let fixture: ComponentFixture<ClaimDetailComponent>;
  let claimsServiceSpy: jasmine.SpyObj<ClaimsService>;

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

  const mockEvents: ClaimEvent[] = [
    { id: 1, claimId: 1, eventType: 'STATUS_CHANGE', oldStatus: null, newStatus: 'OPEN', notes: 'FNOL submitted', createdBy: 'system', createdAt: '' }
  ];

  const mockAssignments: Assignment[] = [];
  const mockDocuments: DocumentMetadata[] = [];
  const mockPayments: Payment[] = [];

  beforeEach(async () => {
    claimsServiceSpy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getClaimEvents', 'getAssignments', 'getDocuments', 'getPayments', 'addDocument'
    ]);

    claimsServiceSpy.getClaim.and.returnValue(of(mockClaim));
    claimsServiceSpy.getClaimEvents.and.returnValue(of(mockEvents));
    claimsServiceSpy.getAssignments.and.returnValue(of(mockAssignments));
    claimsServiceSpy.getDocuments.and.returnValue(of(mockDocuments));
    claimsServiceSpy.getPayments.and.returnValue(of(mockPayments));

    await TestBed.configureTestingModule({
      imports: [
        ClaimDetailComponent,
        NoopAnimationsModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: ClaimsService, useValue: claimsServiceSpy },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
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

    fixture = TestBed.createComponent(ClaimDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load claim and related data on init', () => {
    expect(claimsServiceSpy.getClaim).toHaveBeenCalledWith(1);
    expect(claimsServiceSpy.getClaimEvents).toHaveBeenCalledWith(1);
    expect(claimsServiceSpy.getAssignments).toHaveBeenCalledWith(1);
    expect(claimsServiceSpy.getDocuments).toHaveBeenCalledWith(1);
    expect(claimsServiceSpy.getPayments).toHaveBeenCalledWith(1);
  });

  it('should display claim information', () => {
    expect(component.claim).toBeTruthy();
    expect(component.claim!.claimNumber).toBe('CLM-001');
    expect(component.claim!.policy.policyNumber).toBe('POL-001');
    expect(component.claim!.lossType).toBe('COLLISION');
  });

  it('should show Triage button when status is OPEN', () => {
    component.claim = { ...mockClaim, status: 'OPEN' };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('button'));
    const triageButton = buttons.find(b => b.textContent?.includes('Triage'));
    expect(triageButton).toBeTruthy();
  });

  it('should show Settlement button when status is RESERVE_SET', () => {
    component.claim = { ...mockClaim, status: 'RESERVE_SET' };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('button'));
    const settlementButton = buttons.find(b => b.textContent?.includes('Settlement'));
    expect(settlementButton).toBeTruthy();
  });

  it('should add document and update list', () => {
    const newDoc: DocumentMetadata = {
      id: 1, claimId: 1, fileName: 'test.pdf', documentType: 'OTHER',
      uploadedBy: 'demo-user', uploadedAt: '', notes: ''
    };
    claimsServiceSpy.addDocument.and.returnValue(of(newDoc));

    component.docForm.patchValue({ fileName: 'test.pdf', documentType: 'OTHER' });
    component.addDocument();

    expect(claimsServiceSpy.addDocument).toHaveBeenCalledWith(1, jasmine.objectContaining({ fileName: 'test.pdf' }));
    expect(component.documents.length).toBe(1);
    expect(component.documents[0].fileName).toBe('test.pdf');
  });

  it('should return correct icon for event types', () => {
    expect(component.getEventIcon('STATUS_CHANGE')).toBe('swap_horiz');
    expect(component.getEventIcon('NOTE')).toBe('note');
    expect(component.getEventIcon('UNKNOWN')).toBe('info');
  });
});
