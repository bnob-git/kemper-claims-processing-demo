import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ClaimsService } from './claims.service';
import { Claim, ClaimEvent, Assignment, Payment, DocumentMetadata, Policy, AppUser } from '../models/claim.model';

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

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- Policies ---

  it('getPolicies should GET /api/policies', () => {
    const mockPolicies: Policy[] = [
      { id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '', vehicleVin: '', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic', coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01' }
    ];

    service.getPolicies().subscribe(policies => {
      expect(policies).toEqual(mockPolicies);
    });

    const req = httpMock.expectOne(`${baseUrl}/policies`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPolicies);
  });

  it('getPolicy should GET /api/policies/:id', () => {
    const mockPolicy: Policy = { id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '', vehicleVin: '', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic', coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01' };

    service.getPolicy(1).subscribe(policy => {
      expect(policy).toEqual(mockPolicy);
    });

    const req = httpMock.expectOne(`${baseUrl}/policies/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPolicy);
  });

  // --- Claims ---

  it('getClaims should GET /api/claims without params', () => {
    const mockClaims: Claim[] = [];

    service.getClaims().subscribe(claims => {
      expect(claims).toEqual(mockClaims);
    });

    const req = httpMock.expectOne(`${baseUrl}/claims`);
    expect(req.request.method).toBe('GET');
    req.flush(mockClaims);
  });

  it('getClaims should GET /api/claims?status=OPEN when status provided', () => {
    const mockClaims: Claim[] = [];

    service.getClaims('OPEN').subscribe(claims => {
      expect(claims).toEqual(mockClaims);
    });

    const req = httpMock.expectOne(`${baseUrl}/claims?status=OPEN`);
    expect(req.request.method).toBe('GET');
    req.flush(mockClaims);
  });

  it('getClaim should GET /api/claims/:id', () => {
    const mockClaim = { id: 1, claimNumber: 'CLM-001' } as Claim;

    service.getClaim(1).subscribe(claim => {
      expect(claim.claimNumber).toBe('CLM-001');
    });

    const req = httpMock.expectOne(`${baseUrl}/claims/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockClaim);
  });

  it('createClaim should POST /api/claims', () => {
    const payload = { policyId: 1, lossType: 'COLLISION' };
    const mockClaim = { id: 1, claimNumber: 'CLM-001' } as Claim;

    service.createClaim(payload).subscribe(claim => {
      expect(claim.claimNumber).toBe('CLM-001');
    });

    const req = httpMock.expectOne(`${baseUrl}/claims`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockClaim);
  });

  it('updateClaimStatus should PATCH /api/claims/:id/status', () => {
    const mockClaim = { id: 1, status: 'UNDER_INVESTIGATION' } as Claim;

    service.updateClaimStatus(1, 'UNDER_INVESTIGATION').subscribe(claim => {
      expect(claim.status).toBe('UNDER_INVESTIGATION');
    });

    const req = httpMock.expectOne(`${baseUrl}/claims/1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'UNDER_INVESTIGATION' });
    req.flush(mockClaim);
  });

  // --- Events ---

  it('getClaimEvents should GET /api/claims/:id/events', () => {
    const mockEvents: ClaimEvent[] = [
      { id: 1, claimId: 1, eventType: 'STATUS_CHANGE', oldStatus: null, newStatus: 'OPEN', notes: 'FNOL', createdBy: 'system', createdAt: '' }
    ];

    service.getClaimEvents(1).subscribe(events => {
      expect(events.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/claims/1/events`);
    expect(req.request.method).toBe('GET');
    req.flush(mockEvents);
  });

  // --- Assignments ---

  it('getAssignments should GET /api/claims/:id/assignments', () => {
    const mockAssignments: Assignment[] = [];

    service.getAssignments(1).subscribe(assignments => {
      expect(assignments).toEqual(mockAssignments);
    });

    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('GET');
    req.flush(mockAssignments);
  });

  it('autoAssign should POST /api/claims/:id/assignments with empty body', () => {
    const mockAssignment = { id: 1, assignmentType: 'AUTO' } as Assignment;

    service.autoAssign(1).subscribe(assignment => {
      expect(assignment.assignmentType).toBe('AUTO');
    });

    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockAssignment);
  });

  it('manualAssign should POST /api/claims/:id/assignments with body', () => {
    const mockAssignment = { id: 1, assignmentType: 'MANUAL' } as Assignment;

    service.manualAssign(1, 2, 'Override notes').subscribe(assignment => {
      expect(assignment.assignmentType).toBe('MANUAL');
    });

    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ adjusterId: 2, notes: 'Override notes' });
    req.flush(mockAssignment);
  });

  // --- Reserve ---

  it('reserveDecision should POST with decision and amount', () => {
    const mockClaim = { id: 1, status: 'RESERVE_SET' } as Claim;

    service.reserveDecision(1, 'APPROVE', 5000).subscribe(claim => {
      expect(claim.status).toBe('RESERVE_SET');
    });

    const req = httpMock.expectOne(`${baseUrl}/claims/1/reserve-decision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ decision: 'APPROVE', amount: 5000 });
    req.flush(mockClaim);
  });

  it('reserveDecision should POST without amount when undefined', () => {
    const mockClaim = { id: 1, status: 'RESERVE_SET' } as Claim;

    service.reserveDecision(1, 'APPROVE').subscribe(claim => {
      expect(claim.status).toBe('RESERVE_SET');
    });

    const req = httpMock.expectOne(`${baseUrl}/claims/1/reserve-decision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ decision: 'APPROVE' });
    req.flush(mockClaim);
  });

  // --- Documents ---

  it('getDocuments should GET /api/claims/:id/documents', () => {
    const mockDocs: DocumentMetadata[] = [];

    service.getDocuments(1).subscribe(docs => {
      expect(docs).toEqual(mockDocs);
    });

    const req = httpMock.expectOne(`${baseUrl}/claims/1/documents`);
    expect(req.request.method).toBe('GET');
    req.flush(mockDocs);
  });

  it('addDocument should POST /api/claims/:id/documents', () => {
    const data = { fileName: 'report.pdf', documentType: 'POLICE_REPORT', uploadedBy: 'admin', notes: '' };
    const mockDoc = { id: 1, ...data } as unknown as DocumentMetadata;

    service.addDocument(1, data).subscribe(doc => {
      expect(doc.fileName).toBe('report.pdf');
    });

    const req = httpMock.expectOne(`${baseUrl}/claims/1/documents`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(data);
    req.flush(mockDoc);
  });

  // --- Payments ---

  it('getPayments should GET /api/claims/:id/payments', () => {
    const mockPayments: Payment[] = [];

    service.getPayments(1).subscribe(payments => {
      expect(payments).toEqual(mockPayments);
    });

    const req = httpMock.expectOne(`${baseUrl}/claims/1/payments`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPayments);
  });

  it('issuePayment should POST /api/claims/:id/payments', () => {
    const mockPayment = { id: 1, amount: 3000 } as Payment;

    service.issuePayment(1, 3000).subscribe(payment => {
      expect(payment.amount).toBe(3000);
    });

    const req = httpMock.expectOne(`${baseUrl}/claims/1/payments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ amount: 3000 });
    req.flush(mockPayment);
  });

  // --- Close ---

  it('closeClaim should POST /api/claims/:id/close', () => {
    const mockClaim = { id: 1, status: 'CLOSED', subrogationFlag: true } as Claim;

    service.closeClaim(1, true).subscribe(claim => {
      expect(claim.status).toBe('CLOSED');
      expect(claim.subrogationFlag).toBe(true);
    });

    const req = httpMock.expectOne(`${baseUrl}/claims/1/close`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ subrogation: true });
    req.flush(mockClaim);
  });

  // --- Users ---

  it('getUsers should GET /api/users', () => {
    const mockUsers: AppUser[] = [
      { id: 1, username: 'jsmith', fullName: 'John Smith', role: 'SENIOR_ADJUSTER', email: 'jsmith@pnc.com' }
    ];

    service.getUsers().subscribe(users => {
      expect(users.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/users`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });
});
