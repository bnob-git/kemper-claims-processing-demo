import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
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
        RouterTestingModule,
        NoopAnimationsModule],
    providers: [{ provide: ClaimsService, useValue: spy }, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
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
    expect(claimsService.getClaims).toHaveBeenCalledWith(
      'OPEN', undefined, undefined, undefined, undefined
    );
  });

  it('should call getClaims with search text', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.searchText = 'alice';
    component.loadClaims();
    expect(claimsService.getClaims).toHaveBeenCalledWith(
      undefined, 'alice', undefined, undefined, undefined
    );
  });

  it('should call getClaims with loss type filter', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.lossTypeFilter = ['COLLISION', 'THEFT'];
    component.loadClaims();
    expect(claimsService.getClaims).toHaveBeenCalledWith(
      undefined, undefined, ['COLLISION', 'THEFT'], undefined, undefined
    );
  });

  it('should call getClaims with date range', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.lossDateFrom = new Date(2024, 8, 1);
    component.lossDateTo = new Date(2024, 8, 30);
    component.loadClaims();
    expect(claimsService.getClaims).toHaveBeenCalledWith(
      undefined, undefined, undefined, '2024-09-01', '2024-09-30'
    );
  });

  it('should debounce search input', fakeAsync(() => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    claimsService.getClaims.calls.reset();

    component.onSearchChange('a');
    component.onSearchChange('al');
    component.onSearchChange('ali');
    tick(300);

    // Should have been called once for the debounced value
    expect(claimsService.getClaims).toHaveBeenCalledTimes(1);
  }));

  it('should combine status and search filters', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.statusFilter = 'OPEN';
    component.searchText = 'alice';
    component.loadClaims();
    expect(claimsService.getClaims).toHaveBeenCalledWith(
      'OPEN', 'alice', undefined, undefined, undefined
    );
  });
});
