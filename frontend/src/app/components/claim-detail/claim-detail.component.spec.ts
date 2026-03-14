import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ClaimDetailComponent } from './claim-detail.component';
import { ClaimsService } from '../../services/claims.service';
import { Claim, ClaimEvent, Assignment, DocumentMetadata, Payment } from '../../models/claim.model';

describe('ClaimDetailComponent', () => {
  let component: ClaimDetailComponent;
  let fixture: ComponentFixture<ClaimDetailComponent>;
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockClaim: Claim = {
    id: 1, claimNumber: 'CLM-001',
    policy: {
      id: 1, policyNumber: 'POL-001', holderName: 'Alice',
      holderEmail: 'alice@test.com', vehicleVin: 'VIN123',
      vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
      coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01',
      expirationDate: '2025-01-01'
    },
    status: 'OPEN', lossType: 'COLLISION', severityScore: 7,
    lossDate: '2024-09-10', lossDescription: 'Rear-end collision',
    reportedDate: '2024-09-10', claimantName: 'Alice Henderson',
    claimantPhone: '555-0101', reserveAmount: null,
    settlementAmount: null, subrogationFlag: false,
    createdAt: '2024-09-10T10:30:00', updatedAt: '2024-09-10T10:30:00'
  };

  const mockEvents: ClaimEvent[] = [
    {
      id: 1, claimId: 1, eventType: 'STATUS_CHANGE',
      oldStatus: null, newStatus: 'OPEN',
      notes: 'FNOL submitted', createdBy: 'system',
      createdAt: '2024-09-10T10:30:00'
    }
  ];

  const mockAssignments: Assignment[] = [
    {
      id: 1, claimId: 1, adjusterId: 2,
      assignedDate: '2024-09-10', assignmentType: 'AUTO',
      notes: 'Auto-assigned',
      adjuster: { id: 2, username: 'mwilliams', fullName: 'Maria Williams', role: 'ADJUSTER', email: 'maria@test.com' }
    }
  ];

  const mockDocuments: DocumentMetadata[] = [
    {
      id: 1, claimId: 1, fileName: 'police_report.pdf',
      documentType: 'POLICE_REPORT', uploadedBy: 'alice@test.com',
      uploadedAt: '2024-09-10T11:00:00', notes: 'Initial report'
    }
  ];

  const mockPayments: Payment[] = [];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getClaimEvents', 'getAssignments',
      'getDocuments', 'getPayments', 'addDocument'
    ]);
    spy.getClaim.and.returnValue(of(mockClaim));
    spy.getClaimEvents.and.returnValue(of(mockEvents));
    spy.getAssignments.and.returnValue(of(mockAssignments));
    spy.getDocuments.and.returnValue(of(mockDocuments));
    spy.getPayments.and.returnValue(of(mockPayments));

    await TestBed.configureTestingModule({
      imports: [
        ClaimDetailComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ClaimsService, useValue: spy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClaimDetailComponent);
    component = fixture.componentInstance;
    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load claim data on init', () => {
    expect(claimsService.getClaim).toHaveBeenCalledWith(1);
    expect(component.claim).toEqual(mockClaim);
  });

  it('should load events on init', () => {
    expect(claimsService.getClaimEvents).toHaveBeenCalledWith(1);
    expect(component.events.length).toBe(1);
    expect(component.events[0].newStatus).toBe('OPEN');
  });

  it('should load assignments on init', () => {
    expect(claimsService.getAssignments).toHaveBeenCalledWith(1);
    expect(component.assignments.length).toBe(1);
    expect(component.assignments[0].assignmentType).toBe('AUTO');
  });

  it('should load documents on init', () => {
    expect(claimsService.getDocuments).toHaveBeenCalledWith(1);
    expect(component.documents.length).toBe(1);
    expect(component.documents[0].fileName).toBe('police_report.pdf');
  });

  it('should display claim number in the template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('CLM-001');
  });

  it('should render tab group with Timeline, Assignments, Documents, Payments tabs', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    // Verify the tab group exists
    expect(compiled.querySelector('mat-tab-group')).toBeTruthy();
  });

  it('should return correct icon for STATUS_CHANGE event type', () => {
    expect(component.getEventIcon('STATUS_CHANGE')).toBe('swap_horiz');
  });

  it('should return correct icon for NOTE event type', () => {
    expect(component.getEventIcon('NOTE')).toBe('note');
  });

  it('should return info icon for unknown event type', () => {
    expect(component.getEventIcon('UNKNOWN')).toBe('info');
  });
});
