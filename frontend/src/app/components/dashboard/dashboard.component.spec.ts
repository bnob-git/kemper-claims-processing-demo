import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DashboardComponent } from './dashboard.component';
import { ClaimsService } from '../../services/claims.service';
import { of } from 'rxjs';
import { Claim, ClaimFilter } from '../../models/claim.model';

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
      imports: [
        DashboardComponent,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ClaimsService, useValue: spy },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
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
    fixture.detectChanges();
    claimsService.getClaims.calls.reset();
    component.statusFilter = 'OPEN';
    component.loadClaims();
    expect(claimsService.getClaims).toHaveBeenCalledWith(
      jasmine.objectContaining({ status: 'OPEN' } as ClaimFilter)
    );
  });

  it('should call getClaims with loss type filter', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    claimsService.getClaims.calls.reset();
    component.lossTypeFilter = ['THEFT', 'COLLISION'];
    component.loadClaims();
    expect(claimsService.getClaims).toHaveBeenCalledWith(
      jasmine.objectContaining({ lossTypes: ['THEFT', 'COLLISION'] } as ClaimFilter)
    );
  });

  it('should call getClaims with date range filter', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    claimsService.getClaims.calls.reset();
    component.lossDateFrom = new Date(2024, 8, 1);
    component.lossDateTo = new Date(2024, 8, 30);
    component.loadClaims();
    expect(claimsService.getClaims).toHaveBeenCalledWith(
      jasmine.objectContaining({
        lossDateFrom: '2024-09-01',
        lossDateTo: '2024-09-30'
      } as ClaimFilter)
    );
  });

  it('should debounce search input', fakeAsync(() => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    claimsService.getClaims.calls.reset();

    component.onSearchChange('alice');
    component.onSearchChange('alice h');
    component.onSearchChange('alice he');

    expect(claimsService.getClaims).not.toHaveBeenCalled();

    tick(300);

    expect(claimsService.getClaims).toHaveBeenCalledTimes(1);
    expect(claimsService.getClaims).toHaveBeenCalledWith(
      jasmine.objectContaining({ search: 'alice he' } as ClaimFilter)
    );
  }));

  it('should combine multiple filters', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    claimsService.getClaims.calls.reset();
    component.statusFilter = 'OPEN';
    component.lossTypeFilter = ['COLLISION'];
    component.searchTerm = 'alice';
    component.loadClaims();
    expect(claimsService.getClaims).toHaveBeenCalledWith(
      jasmine.objectContaining({
        status: 'OPEN',
        lossTypes: ['COLLISION'],
        search: 'alice'
      } as ClaimFilter)
    );
  });

  it('should pass empty filter when no filters set', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    claimsService.getClaims.calls.reset();
    component.statusFilter = '';
    component.searchTerm = '';
    component.lossTypeFilter = [];
    component.lossDateFrom = null;
    component.lossDateTo = null;
    component.loadClaims();
    expect(claimsService.getClaims).toHaveBeenCalledWith({} as ClaimFilter);
  });
});
