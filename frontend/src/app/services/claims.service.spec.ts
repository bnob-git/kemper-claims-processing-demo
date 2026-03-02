import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ClaimsService } from './claims.service';
import { Claim, Policy, AppUser, Assignment, ClaimEvent, DocumentMetadata, Payment } from '../models/claim.model';

describe('ClaimsService', () => {
  let service: ClaimsService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:8080/api';

  const mockPolicy: Policy = {
    id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: 'alice@test.com',
    vehicleVin: '1HGBH41JXMN109186', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
    coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
  };

  const mockClaim: Claim = {
    id: 1, claimNumber: 'CLM-001', policy: mockPolicy, status: 'OPEN', lossType: 'COLLISION',
    severityScore: 7, lossDate: '2024-09-10', lossDescription: 'Test', reportedDate: '2024-09-10',
    claimantName: 'Alice', claimantPhone: '555-0101', reserveAmount: null, settlementAmount: null,
    subrogationFlag: false, createdAt: '2024-09-10T10:30:00', updatedAt: '2024-09-10T10:30:00'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ClaimsService]
    });
    service = TestBed.inject(ClaimsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // --- Policies ---

  it('should get policies', () => {
    service.getPolicies().subscribe(policies => {
      expect(policies.length).toBe(1);
      expect(policies[0].policyNumber).toBe('POL-001');
    });
    const req = httpMock.expectOne(`${baseUrl}/policies`);
    expect(req.request.method).toBe('GET');
    req.flush([mockPolicy]);
  });

  it('should get a single policy', () => {
    service.getPolicy(1).subscribe(policy => {
      expect(policy.policyNumber).toBe('POL-001');
    });
    const req = httpMock.expectOne(`${baseUrl}/policies/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPolicy);
  });

  // --- Claims ---

  it('should get all claims without status filter', () => {
    service.getClaims().subscribe(claims => {
      expect(claims.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims`);
    expect(req.request.method).toBe('GET');
    req.flush([mockClaim]);
  });

  it('should get claims with status filter', () => {
    service.getClaims('OPEN').subscribe(claims => {
      expect(claims.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims?status=OPEN`);
    expect(req.request.method).toBe('GET');
    req.flush([mockClaim]);
  });

  it('should get a single claim', () => {
    service.getClaim(1).subscribe(claim => {
      expect(claim.claimNumber).toBe('CLM-001');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockClaim);
  });

  it('should create a claim', () => {
    const payload = { policyId: 1, lossType: 'COLLISION', severityScore: 5 };
    service.createClaim(payload).subscribe(claim => {
      expect(claim.status).toBe('OPEN');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockClaim);
  });

  it('should update claim status', () => {
    const updatedClaim = { ...mockClaim, status: 'UNDER_INVESTIGATION' };
    service.updateClaimStatus(1, 'UNDER_INVESTIGATION').subscribe(claim => {
      expect(claim.status).toBe('UNDER_INVESTIGATION');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'UNDER_INVESTIGATION' });
    req.flush(updatedClaim);
  });

  // --- Events ---

  it('should get claim events', () => {
    const mockEvent: ClaimEvent = {
      id: 1, claimId: 1, eventType: 'STATUS_CHANGE', oldStatus: null,
      newStatus: 'OPEN', notes: 'FNOL submitted', createdBy: 'system', createdAt: '2024-09-10T10:30:00'
    };
    service.getClaimEvents(1).subscribe(events => {
      expect(events.length).toBe(1);
      expect(events[0].eventType).toBe('STATUS_CHANGE');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/events`);
    expect(req.request.method).toBe('GET');
    req.flush([mockEvent]);
  });

  // --- Assignments ---

  it('should get assignments', () => {
    const mockAssignment: Assignment = {
      id: 1, claimId: 1, adjusterId: 2, assignedDate: '2024-09-10',
      assignmentType: 'AUTO', notes: 'Auto-assigned',
      adjuster: { id: 2, username: 'mwilliams', fullName: 'Maria Williams', role: 'ADJUSTER', email: 'maria@test.com' }
    };
    service.getAssignments(1).subscribe(assignments => {
      expect(assignments.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('GET');
    req.flush([mockAssignment]);
  });

  it('should auto assign', () => {
    const mockAssignment: Assignment = {
      id: 100, claimId: 1, adjusterId: 2, assignedDate: '2024-10-01',
      assignmentType: 'AUTO', notes: 'Auto-assigned',
      adjuster: { id: 2, username: 'mwilliams', fullName: 'Maria Williams', role: 'ADJUSTER', email: 'maria@test.com' }
    };
    service.autoAssign(1).subscribe(assignment => {
      expect(assignment.assignmentType).toBe('AUTO');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockAssignment);
  });

  it('should manual assign', () => {
    const mockAssignment: Assignment = {
      id: 100, claimId: 1, adjusterId: 3, assignedDate: '2024-10-01',
      assignmentType: 'MANUAL', notes: 'Override',
      adjuster: { id: 3, username: 'rjohnson', fullName: 'Robert Johnson', role: 'SENIOR_ADJUSTER', email: 'robert@test.com' }
    };
    service.manualAssign(1, 3, 'Override').subscribe(assignment => {
      expect(assignment.assignmentType).toBe('MANUAL');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ adjusterId: 3, notes: 'Override' });
    req.flush(mockAssignment);
  });

  // --- Reserve ---

  it('should send reserve decision with amount', () => {
    const updatedClaim = { ...mockClaim, status: 'RESERVE_SET', reserveAmount: 5000 };
    service.reserveDecision(1, 'APPROVE', 5000).subscribe(claim => {
      expect(claim.status).toBe('RESERVE_SET');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/reserve-decision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ decision: 'APPROVE', amount: 5000 });
    req.flush(updatedClaim);
  });

  it('should send reserve decision without amount', () => {
    const updatedClaim = { ...mockClaim, status: 'RESERVE_SET', reserveAmount: 8050 };
    service.reserveDecision(1, 'APPROVE').subscribe(claim => {
      expect(claim.status).toBe('RESERVE_SET');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/reserve-decision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ decision: 'APPROVE' });
    req.flush(updatedClaim);
  });

  // --- Documents ---

  it('should get documents', () => {
    const mockDoc: DocumentMetadata = {
      id: 1, claimId: 1, fileName: 'report.pdf', documentType: 'POLICE_REPORT',
      uploadedBy: 'alice', uploadedAt: '2024-09-10T11:00:00', notes: 'Initial report'
    };
    service.getDocuments(1).subscribe(docs => {
      expect(docs.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/documents`);
    expect(req.request.method).toBe('GET');
    req.flush([mockDoc]);
  });

  it('should add document', () => {
    const docData = { fileName: 'new.pdf', documentType: 'PHOTO' };
    const mockDoc: DocumentMetadata = {
      id: 100, claimId: 1, fileName: 'new.pdf', documentType: 'PHOTO',
      uploadedBy: 'test', uploadedAt: '2024-10-01T10:00:00', notes: ''
    };
    service.addDocument(1, docData).subscribe(doc => {
      expect(doc.fileName).toBe('new.pdf');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/documents`);
    expect(req.request.method).toBe('POST');
    req.flush(mockDoc);
  });

  // --- Payments ---

  it('should get payments', () => {
    const mockPayment: Payment = {
      id: 1, claimId: 1, amount: 3000, paymentType: 'SETTLEMENT',
      paymentDate: '2024-09-20', referenceNumber: 'PAY-001', status: 'COMPLETED', createdBy: 'test'
    };
    service.getPayments(1).subscribe(payments => {
      expect(payments.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/payments`);
    expect(req.request.method).toBe('GET');
    req.flush([mockPayment]);
  });

  it('should issue payment', () => {
    const mockPayment: Payment = {
      id: 100, claimId: 1, amount: 2500, paymentType: 'SETTLEMENT',
      paymentDate: '2024-10-01', referenceNumber: 'PAY-NEW', status: 'COMPLETED', createdBy: 'test'
    };
    service.issuePayment(1, 2500).subscribe(payment => {
      expect(payment.amount).toBe(2500);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/payments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ amount: 2500 });
    req.flush(mockPayment);
  });

  // --- Close ---

  it('should close claim with subrogation', () => {
    const closedClaim = { ...mockClaim, status: 'CLOSED', subrogationFlag: true };
    service.closeClaim(1, true).subscribe(claim => {
      expect(claim.status).toBe('CLOSED');
      expect(claim.subrogationFlag).toBe(true);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/close`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ subrogation: true });
    req.flush(closedClaim);
  });

  it('should close claim without subrogation', () => {
    const closedClaim = { ...mockClaim, status: 'CLOSED', subrogationFlag: false };
    service.closeClaim(1, false).subscribe(claim => {
      expect(claim.status).toBe('CLOSED');
      expect(claim.subrogationFlag).toBe(false);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/close`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ subrogation: false });
    req.flush(closedClaim);
  });

  // --- Users ---

  it('should get users', () => {
    const mockUsers: AppUser[] = [
      { id: 1, username: 'jsmith', fullName: 'John Smith', role: 'SENIOR_ADJUSTER', email: 'john@test.com' }
    ];
    service.getUsers().subscribe(users => {
      expect(users.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/users`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });
});
