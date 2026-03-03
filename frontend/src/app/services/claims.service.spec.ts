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

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all claims without filters', () => {
    service.getClaims().subscribe(claims => {
      expect(claims.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, claimNumber: 'CLM-001' }]);
  });

  it('should get claims with status filter', () => {
    service.getClaims('OPEN').subscribe();
    const req = httpMock.expectOne(
      r => r.url === `${baseUrl}/claims` && r.params.get('status') === 'OPEN'
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should get claims with search param', () => {
    service.getClaims(undefined, 'alice').subscribe();
    const req = httpMock.expectOne(
      r => r.url === `${baseUrl}/claims` && r.params.get('search') === 'alice'
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should get claims with loss type filter', () => {
    service.getClaims(undefined, undefined, ['COLLISION', 'THEFT']).subscribe();
    const req = httpMock.expectOne(
      r => r.url === `${baseUrl}/claims` && r.params.getAll('lossType')?.length === 2
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should get claims with date range', () => {
    service.getClaims(undefined, undefined, undefined, '2024-09-01', '2024-09-30').subscribe();
    const req = httpMock.expectOne(
      r => r.url === `${baseUrl}/claims`
        && r.params.get('lossDateFrom') === '2024-09-01'
        && r.params.get('lossDateTo') === '2024-09-30'
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should get a single claim', () => {
    service.getClaim(1).subscribe(claim => {
      expect(claim.claimNumber).toBe('CLM-001');
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1, claimNumber: 'CLM-001' });
  });

  it('should create a claim', () => {
    const payload = { policyId: 1, lossType: 'COLLISION' };
    service.createClaim(payload).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 100, claimNumber: 'CLM-NEW' });
  });

  it('should update claim status', () => {
    service.updateClaimStatus(1, 'UNDER_INVESTIGATION').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/status`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 1, status: 'UNDER_INVESTIGATION' });
  });

  it('should get claim events', () => {
    service.getClaimEvents(1).subscribe(events => {
      expect(events.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/claims/1/events`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, eventType: 'STATUS_CHANGE' }]);
  });

  it('should issue payment', () => {
    service.issuePayment(1, 5000).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/payments`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, amount: 5000 });
  });

  it('should close claim', () => {
    service.closeClaim(1, true).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/claims/1/close`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, status: 'CLOSED' });
  });

  it('should get policies', () => {
    service.getPolicies().subscribe(policies => {
      expect(policies.length).toBe(1);
    });
    const req = httpMock.expectOne(`${baseUrl}/policies`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, policyNumber: 'POL-001' }]);
  });
});
