import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ClaimsService } from './claims.service';

describe('ClaimsService', () => {
  let service: ClaimsService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:8080/api';

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

  // ---- Policies ----

  it('should GET all policies', () => {
    service.getPolicies().subscribe(policies => {
      expect(policies.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/policies`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, policyNumber: 'POL-001' }]);
  });

  it('should GET a single policy by id', () => {
    service.getPolicy(1).subscribe(policy => {
      expect(policy.policyNumber).toBe('POL-001');
    });
    const req = httpMock.expectOne(`${baseUrl}/policies/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1, policyNumber: 'POL-001' });
  });

  // ---- Claims ----

  it('should GET all claims without status filter', () => {
    service.getClaims().subscribe(claims => {
      expect(claims.length).toBe(2);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1 }, { id: 2 }]);
  });

  it('should GET claims with status filter', () => {
    service.getClaims('OPEN').subscribe(claims => {
      expect(claims.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims?status=OPEN`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, status: 'OPEN' }]);
  });

  it('should GET a single claim by id', () => {
    service.getClaim(1).subscribe(claim => {
      expect(claim.id).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1 });
  });

  it('should POST to create a claim', () => {
    const payload = { policyId: 1, lossType: 'COLLISION' };
    service.createClaim(payload).subscribe(claim => {
      expect(claim.claimNumber).toBe('CLM-NEW');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 10, claimNumber: 'CLM-NEW' });
  });

  it('should PATCH claim status', () => {
    service.updateClaimStatus(1, 'UNDER_INVESTIGATION').subscribe(claim => {
      expect(claim.status).toBe('UNDER_INVESTIGATION');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'UNDER_INVESTIGATION' });
    req.flush({ id: 1, status: 'UNDER_INVESTIGATION' });
  });

  // ---- Assignments ----

  it('should GET assignments for a claim', () => {
    service.getAssignments(1).subscribe(assignments => {
      expect(assignments.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1 }]);
  });

  it('should POST auto-assign', () => {
    service.autoAssign(1).subscribe(assignment => {
      expect(assignment.assignmentType).toBe('AUTO');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ id: 1, assignmentType: 'AUTO' });
  });

  it('should POST manual assign with adjusterId and notes', () => {
    service.manualAssign(1, 2, 'test notes').subscribe(assignment => {
      expect(assignment.assignmentType).toBe('MANUAL');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ adjusterId: 2, notes: 'test notes' });
    req.flush({ id: 1, assignmentType: 'MANUAL' });
  });

  // ---- Reserve ----

  it('should POST reserve decision with amount', () => {
    service.reserveDecision(1, 'APPROVE', 5000).subscribe(claim => {
      expect(claim.status).toBe('RESERVE_SET');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/reserve-decision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ decision: 'APPROVE', amount: 5000 });
    req.flush({ id: 1, status: 'RESERVE_SET' });
  });

  it('should POST reserve decision without amount', () => {
    service.reserveDecision(1, 'DENY').subscribe(claim => {
      expect(claim.status).toBe('DENIED');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/reserve-decision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ decision: 'DENY' });
    req.flush({ id: 1, status: 'DENIED' });
  });

  // ---- Documents ----

  it('should GET documents for a claim', () => {
    service.getDocuments(1).subscribe(docs => {
      expect(docs.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/documents`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1 }]);
  });

  it('should POST to add a document', () => {
    const data = { fileName: 'test.pdf', documentType: 'OTHER', uploadedBy: 'user', notes: '' };
    service.addDocument(1, data).subscribe(doc => {
      expect(doc.fileName).toBe('test.pdf');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/documents`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(data);
    req.flush({ id: 1, fileName: 'test.pdf' });
  });

  // ---- Payments ----

  it('should GET payments for a claim', () => {
    service.getPayments(1).subscribe(payments => {
      expect(payments.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/payments`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1 }]);
  });

  it('should POST to issue a payment', () => {
    service.issuePayment(1, 3000).subscribe(payment => {
      expect(payment.amount).toBe(3000);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/payments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ amount: 3000 });
    req.flush({ id: 1, amount: 3000 });
  });

  // ---- Close ----

  it('should POST to close a claim with subrogation', () => {
    service.closeClaim(1, true).subscribe(claim => {
      expect(claim.status).toBe('CLOSED');
      expect(claim.subrogationFlag).toBeTrue();
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/close`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ subrogation: true });
    req.flush({ id: 1, status: 'CLOSED', subrogationFlag: true });
  });

  // ---- Users ----

  it('should GET all users', () => {
    service.getUsers().subscribe(users => {
      expect(users.length).toBe(2);
    });
    const req = httpMock.expectOne(`${baseUrl}/users`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1 }, { id: 2 }]);
  });
});
