import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ClaimDetailComponent } from './claim-detail.component';
import { ClaimsService } from '../../services/claims.service';
import { Claim } from '../../models/claim.model';

describe('ClaimDetailComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockClaim: Claim = {
    id: 1, claimNumber: 'CLM-001',
    policy: {
      id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '',
      vehicleVin: '1HGBH41JXMN109186', vehicleYear: 2021, vehicleMake: 'Honda',
      vehicleModel: 'Civic', coverageType: 'COMPREHENSIVE',
      effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
    },
    status: 'OPEN', lossType: 'COLLISION', severityScore: 7,
    lossDate: '2024-09-10', lossDescription: 'Rear-end collision',
    reportedDate: '2024-09-10', claimantName: 'Alice Henderson',
    claimantPhone: '555-0101', reserveAmount: null, settlementAmount: null,
    subrogationFlag: false, createdAt: '2024-09-10T10:30:00',
    updatedAt: '2024-09-10T10:30:00'
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ClaimsService', [
      'getClaim', 'getClaimEvents', 'getAssignments', 'getDocuments',
      'getPayments', 'addDocument'
    ]);
    spy.getClaim.and.returnValue(of(mockClaim));
    spy.getClaimEvents.and.returnValue(of([
      { id: 1, claimId: 1, eventType: 'STATUS_CHANGE', oldStatus: null,
        newStatus: 'OPEN', notes: 'FNOL submitted', createdBy: 'system',
        createdAt: '2024-09-10T10:30:00' }
    ]));
    spy.getAssignments.and.returnValue(of([]));
    spy.getDocuments.and.returnValue(of([
      { id: 1, claimId: 1, fileName: 'report.pdf', documentType: 'POLICE_REPORT',
        uploadedBy: 'alice', uploadedAt: '2024-09-10T11:00:00', notes: '' }
    ]));
    spy.getPayments.and.returnValue(of([]));
    spy.addDocument.and.returnValue(of({
      id: 2, claimId: 1, fileName: 'new.pdf', documentType: 'OTHER',
      uploadedBy: 'demo-user', uploadedAt: '2024-10-01', notes: ''
    }));

    await TestBed.configureTestingModule({
      imports: [
        ClaimDetailComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ClaimsService, useValue: spy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
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
    const comp = fixture.componentInstance;
    expect(comp.claim).toEqual(mockClaim);
    expect(comp.events.length).toBe(1);
    expect(comp.documents.length).toBe(1);
  });

  it('should render tabs', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const tabLabels = compiled.querySelectorAll('.mdc-tab__text-label');
    const labels = Array.from(tabLabels).map(el => el.textContent?.trim());
    expect(labels).toContain('Timeline');
    expect(labels).toContain('Assignments');
    expect(labels).toContain('Documents');
    expect(labels).toContain('Payments');
  });

  it('should return correct event icon', () => {
    const fixture = TestBed.createComponent(ClaimDetailComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.getEventIcon('STATUS_CHANGE')).toBe('swap_horiz');
    expect(comp.getEventIcon('NOTE')).toBe('note');
    expect(comp.getEventIcon('OTHER')).toBe('info');
  });
});
