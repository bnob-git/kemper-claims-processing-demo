import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DashboardComponent } from './dashboard.component';
import { ClaimsService } from '../../services/claims.service';
import { of } from 'rxjs';
import { Claim } from '../../models/claim.model';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('DashboardComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockClaims: Claim[] = [
    {
      id: 1, claimNumber: 'CLM-001', policy: {
        id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '',
        vehicleVin: '', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
        coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
      },
      status: 'OPEN', lossType: 'COLLISION', severityScore: 7,
      lossDate: '2024-09-10', lossDescription: 'Test', reportedDate: '2024-09-10',
      claimantName: 'Alice', claimantPhone: '555-0101',
      reserveAmount: null, settlementAmount: null, subrogationFlag: false,
      createdAt: '2024-09-10T10:30:00', updatedAt: '2024-09-10T10:30:00'
    }
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ClaimsService', ['getClaims']);
    spy.getClaims.and.returnValue(of(mockClaims));

    await TestBed.configureTestingModule({
    imports: [DashboardComponent,
        NoopAnimationsModule],
    providers: [{ provide: ClaimsService, useValue: spy }, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])]
}).compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load claims on init', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.claims.length).toBe(1);
    expect(component.claims[0].claimNumber).toBe('CLM-001');
  });

  it('should call getClaims with status filter', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    component.statusFilter = 'OPEN';
    component.loadClaims();
    expect(claimsService.getClaims).toHaveBeenCalledWith('OPEN');
  });
});
