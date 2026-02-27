import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ClaimsService } from './claims.service';

describe('ClaimsService', () => {
  let service: ClaimsService;
  let httpMock: HttpTestingController;

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

  it('getClaims should call correct URL without status', () => {
    service.getClaims().subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/claims');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getClaims should call correct URL with status', () => {
    service.getClaims('OPEN').subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/claims?status=OPEN');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getClaim should call correct URL', () => {
    service.getClaim(1).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/claims/1');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('createClaim should POST to correct URL', () => {
    const payload = { policyId: 1, lossType: 'COLLISION' };
    service.createClaim(payload).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/claims');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('autoAssign should POST to assignments URL', () => {
    service.autoAssign(1).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/claims/1/assignments');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('reserveDecision should POST with decision and amount', () => {
    service.reserveDecision(1, 'APPROVE', 5000).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/claims/1/reserve-decision');
    expect(req.request.method).toBe('POST');
    expect(req.request.body['decision']).toBe('APPROVE');
    expect(req.request.body['amount']).toBe(5000);
    req.flush({});
  });

  it('issuePayment should POST to payments URL', () => {
    service.issuePayment(1, 3000).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/claims/1/payments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body['amount']).toBe(3000);
    req.flush({});
  });

  it('closeClaim should POST to close URL', () => {
    service.closeClaim(1, true).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/claims/1/close');
    expect(req.request.method).toBe('POST');
    expect(req.request.body['subrogation']).toBeTrue();
    req.flush({});
  });

  it('getPolicies should call correct URL', () => {
    service.getPolicies().subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/policies');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('addDocument should POST to documents URL', () => {
    const data = { fileName: 'test.pdf', documentType: 'PHOTO', uploadedBy: 'user', notes: '' };
    service.addDocument(1, data).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/claims/1/documents');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(data);
    req.flush({});
  });
});
