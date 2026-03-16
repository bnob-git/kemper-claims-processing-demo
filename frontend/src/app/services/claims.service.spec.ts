import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ClaimsService } from './claims.service';
import { Policy } from '../models/claim.model';

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

  it('should get policies', () => {
    const mockPolicies: Policy[] = [
      { id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '', vehicleVin: '', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic', coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01' }
    ];
    service.getPolicies().subscribe(policies => {
      expect(policies.length).toBe(1);
      expect(policies[0].policyNumber).toBe('POL-001');
    });
    const req = httpMock.expectOne(`${baseUrl}/policies`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPolicies);
  });

  it('should get policy by id', () => {
    const mockPolicy: Policy = { id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '', vehicleVin: '', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic', coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01' };
    service.getPolicy(1).subscribe(policy => {
      expect(policy.id).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/policies/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPolicy);
  });

  it('should get claims without status', () => {
    service.getClaims().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should get claims with status filter', () => {
    service.getClaims('OPEN').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims?status=OPEN`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should get claim by id', () => {
    service.getClaim(1).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should create claim', () => {
    const data = { policyId: 1, lossType: 'COLLISION' };
    service.createClaim(data).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(data);
    req.flush({});
  });

  it('should update claim status', () => {
    service.updateClaimStatus(1, 'UNDER_INVESTIGATION').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'UNDER_INVESTIGATION' });
    req.flush({});
  });

  it('should get claim events', () => {
    service.getClaimEvents(1).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/events`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should get assignments', () => {
    service.getAssignments(1).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should auto assign', () => {
    service.autoAssign(1).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  it('should manual assign', () => {
    service.manualAssign(1, 2, 'Test notes').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/assignments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ adjusterId: 2, notes: 'Test notes' });
    req.flush({});
  });

  it('should send reserve decision with amount', () => {
    service.reserveDecision(1, 'APPROVE', 5000).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/reserve-decision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ decision: 'APPROVE', amount: 5000 });
    req.flush({});
  });

  it('should send reserve decision without amount', () => {
    service.reserveDecision(1, 'APPROVE').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/reserve-decision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ decision: 'APPROVE' });
    req.flush({});
  });

  it('should get documents', () => {
    service.getDocuments(1).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/documents`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should add document', () => {
    const data = { fileName: 'test.pdf', documentType: 'EVIDENCE' };
    service.addDocument(1, data).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/documents`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(data);
    req.flush({});
  });

  it('should get payments', () => {
    service.getPayments(1).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/payments`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should issue payment', () => {
    service.issuePayment(1, 3000).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/payments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ amount: 3000 });
    req.flush({});
  });

  it('should close claim', () => {
    service.closeClaim(1, true).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/close`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ subrogation: true });
    req.flush({});
  });

  it('should get users', () => {
    service.getUsers().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/users`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
