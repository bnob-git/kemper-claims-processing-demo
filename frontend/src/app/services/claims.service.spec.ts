import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ClaimsService } from './claims.service';
import { Claim, Policy, AppUser, Assignment, ClaimEvent, DocumentMetadata, Payment } from '../models/claim.model';

describe('ClaimsService', () => {
  let service: ClaimsService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:8080/api';

  const mockPolicy: Policy = {
    id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: 'a@b.com',
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

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Policies
  it('should get all policies', () => {
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
      expect(policy.id).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/policies/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPolicy);
  });

  // Claims
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
      expect(claim.id).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockClaim);
  });

  it('should create a claim', () => {
    const data = { policyId: 1, lossType: 'COLLISION' };
    service.createClaim(data).subscribe(claim => {
      expect(claim.status).toBe('OPEN');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(data);
    req.flush(mockClaim);
  });

  it('should update claim status', () => {
    service.updateClaimStatus(1, 'UNDER_INVESTIGATION').subscribe(claim => {
      expect(claim.status).toBe('UNDER_INVESTIGATION');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'UNDER_INVESTIGATION' });
    req.flush({ ...mockClaim, status: 'UNDER_INVESTIGATION' });
  });

  // Events
  it('should get claim events', () => {
    const mockEvent: ClaimEvent = {
      id: 1, claimId: 1, eventType: 'STATUS_CHANGE', oldStatus: null,
      newStatus: 'OPEN', notes: 'FNOL', createdBy: 'system', createdAt: '2024-09-10'
    };
    service.getClaimEvents(1).subscribe(events => {
      expect(events.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/events`);
    expect(req.request.method).toBe('GET');
    req.flush([mockEvent]);
  });

  // Assignments
  it('should get assignments', () => {
    const mockAssignment: Assignment = {
      id: 1, claimId: 1, adjusterId: 1, assignedDate: '2024-09-10',
      assignmentType: 'AUTO', notes: 'Auto', adjuster: { id: 1, username: 'jsmith', fullName: 'John', role: 'SENIOR_ADJUSTER', email: '' }
    };
    service.getAssignments(1).subscribe(assignments => {
      expect(assignments.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('GET');
    req.flush([mockAssignment]);
  });

  it('should auto assign', () => {
    service.autoAssign(1).subscribe(assignment => {
      expect(assignment.assignmentType).toBe('AUTO');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ id: 1, claimId: 1, adjusterId: 1, assignedDate: '2024-09-10', assignmentType: 'AUTO', notes: '' });
  });

  it('should manual assign', () => {
    service.manualAssign(1, 2, 'Test notes').subscribe(assignment => {
      expect(assignment.assignmentType).toBe('MANUAL');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ adjusterId: 2, notes: 'Test notes' });
    req.flush({ id: 1, claimId: 1, adjusterId: 2, assignedDate: '2024-09-10', assignmentType: 'MANUAL', notes: 'Test notes' });
  });

  // Reserve
  it('should make reserve decision with amount', () => {
    service.reserveDecision(1, 'APPROVE', 5000).subscribe(claim => {
      expect(claim.status).toBe('RESERVE_SET');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/reserve-decision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ decision: 'APPROVE', amount: 5000 });
    req.flush({ ...mockClaim, status: 'RESERVE_SET', reserveAmount: 5000 });
  });

  it('should make reserve decision without amount', () => {
    service.reserveDecision(1, 'APPROVE').subscribe(claim => {
      expect(claim.status).toBe('RESERVE_SET');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/reserve-decision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ decision: 'APPROVE' });
    req.flush({ ...mockClaim, status: 'RESERVE_SET' });
  });

  // Documents
  it('should get documents', () => {
    const mockDoc: DocumentMetadata = {
      id: 1, claimId: 1, fileName: 'test.pdf', documentType: 'POLICE_REPORT',
      uploadedBy: 'user', uploadedAt: '2024-09-10', notes: 'Test'
    };
    service.getDocuments(1).subscribe(docs => {
      expect(docs.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/documents`);
    expect(req.request.method).toBe('GET');
    req.flush([mockDoc]);
  });

  it('should add a document', () => {
    const data = { fileName: 'test.pdf', documentType: 'PHOTO', uploadedBy: 'user', notes: '' };
    service.addDocument(1, data).subscribe(doc => {
      expect(doc.fileName).toBe('test.pdf');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/documents`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, claimId: 1, ...data, uploadedAt: '2024-09-10' });
  });

  // Payments
  it('should get payments', () => {
    const mockPayment: Payment = {
      id: 1, claimId: 1, amount: 3000, paymentType: 'SETTLEMENT',
      paymentDate: '2024-09-20', referenceNumber: 'PAY-001', status: 'COMPLETED', createdBy: 'user'
    };
    service.getPayments(1).subscribe(payments => {
      expect(payments.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/payments`);
    expect(req.request.method).toBe('GET');
    req.flush([mockPayment]);
  });

  it('should issue a payment', () => {
    service.issuePayment(1, 3000).subscribe(payment => {
      expect(payment.amount).toBe(3000);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/payments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ amount: 3000 });
    req.flush({ id: 1, claimId: 1, amount: 3000, paymentType: 'SETTLEMENT', paymentDate: '2024-09-20', referenceNumber: 'PAY-001', status: 'COMPLETED', createdBy: 'system' });
  });

  // Close
  it('should close a claim', () => {
    service.closeClaim(1, true).subscribe(claim => {
      expect(claim.status).toBe('CLOSED');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/close`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ subrogation: true });
    req.flush({ ...mockClaim, status: 'CLOSED', subrogationFlag: true });
  });

  // Users
  it('should get all users', () => {
    const mockUser: AppUser = { id: 1, username: 'jsmith', fullName: 'John Smith', role: 'SENIOR_ADJUSTER', email: '' };
    service.getUsers().subscribe(users => {
      expect(users.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/users`);
    expect(req.request.method).toBe('GET');
    req.flush([mockUser]);
  });
});
