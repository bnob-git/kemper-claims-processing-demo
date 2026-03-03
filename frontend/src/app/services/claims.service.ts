import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Claim, ClaimEvent, Assignment, Payment, DocumentMetadata, Policy, AppUser } from '../models/claim.model';

@Injectable({ providedIn: 'root' })
export class ClaimsService {
  private baseUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  // Policies
  getPolicies(): Observable<Policy[]> {
    return this.http.get<Policy[]>(`${this.baseUrl}/policies`);
  }

  getPolicy(id: number): Observable<Policy> {
    return this.http.get<Policy>(`${this.baseUrl}/policies/${id}`);
  }

  // Claims
  getClaims(status?: string, search?: string, lossTypes?: string[], lossDateFrom?: string, lossDateTo?: string): Observable<Claim[]> {
    let params = new HttpParams();
    if (status) { params = params.set('status', status); }
    if (search) { params = params.set('search', search); }
    if (lossTypes && lossTypes.length > 0) {
      lossTypes.forEach(lt => { params = params.append('lossType', lt); });
    }
    if (lossDateFrom) { params = params.set('lossDateFrom', lossDateFrom); }
    if (lossDateTo) { params = params.set('lossDateTo', lossDateTo); }
    return this.http.get<Claim[]>(`${this.baseUrl}/claims`, { params });
  }

  getClaim(id: number): Observable<Claim> {
    return this.http.get<Claim>(`${this.baseUrl}/claims/${id}`);
  }

  createClaim(data: Record<string, unknown>): Observable<Claim> {
    return this.http.post<Claim>(`${this.baseUrl}/claims`, data);
  }

  updateClaimStatus(id: number, status: string): Observable<Claim> {
    return this.http.patch<Claim>(`${this.baseUrl}/claims/${id}/status`, { status });
  }

  // Events
  getClaimEvents(id: number): Observable<ClaimEvent[]> {
    return this.http.get<ClaimEvent[]>(`${this.baseUrl}/claims/${id}/events`);
  }

  // Assignments
  getAssignments(claimId: number): Observable<Assignment[]> {
    return this.http.get<Assignment[]>(`${this.baseUrl}/claims/${claimId}/assignments`);
  }

  autoAssign(claimId: number): Observable<Assignment> {
    return this.http.post<Assignment>(`${this.baseUrl}/claims/${claimId}/assignments`, {});
  }

  manualAssign(claimId: number, adjusterId: number, notes: string): Observable<Assignment> {
    return this.http.post<Assignment>(`${this.baseUrl}/claims/${claimId}/assignments`, { adjusterId, notes });
  }

  // Reserve
  reserveDecision(claimId: number, decision: string, amount?: number): Observable<Claim> {
    const body: Record<string, unknown> = { decision };
    if (amount !== undefined) body['amount'] = amount;
    return this.http.post<Claim>(`${this.baseUrl}/claims/${claimId}/reserve-decision`, body);
  }

  // Documents
  getDocuments(claimId: number): Observable<DocumentMetadata[]> {
    return this.http.get<DocumentMetadata[]>(`${this.baseUrl}/claims/${claimId}/documents`);
  }

  addDocument(claimId: number, data: Record<string, string>): Observable<DocumentMetadata> {
    return this.http.post<DocumentMetadata>(`${this.baseUrl}/claims/${claimId}/documents`, data);
  }

  // Payments
  getPayments(claimId: number): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.baseUrl}/claims/${claimId}/payments`);
  }

  issuePayment(claimId: number, amount: number): Observable<Payment> {
    return this.http.post<Payment>(`${this.baseUrl}/claims/${claimId}/payments`, { amount });
  }

  // Close
  closeClaim(claimId: number, subrogation: boolean): Observable<Claim> {
    return this.http.post<Claim>(`${this.baseUrl}/claims/${claimId}/close`, { subrogation });
  }

  // Users
  getUsers(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(`${this.baseUrl}/users`);
  }
}
