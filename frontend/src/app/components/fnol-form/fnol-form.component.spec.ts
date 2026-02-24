import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FnolFormComponent } from './fnol-form.component';
import { ClaimsService } from '../../services/claims.service';
import { Claim, Policy } from '../../models/claim.model';

describe('FnolFormComponent', () => {
  let component: FnolFormComponent;
  let fixture: ComponentFixture<FnolFormComponent>;
  let claimsService: jasmine.SpyObj<ClaimsService>;
  let router: jasmine.SpyObj<Router>;

  const mockPolicies: Policy[] = [
    {
      id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: 'alice@test.com',
      vehicleVin: '1HGCM82633A004352', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
      coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
    }
  ];

  const mockPolicy: Policy = mockPolicies[0];

  const mockClaim: Claim = {
    id: 10, claimNumber: 'CLM-NEW001', policy: mockPolicy, status: 'OPEN',
    lossType: 'COLLISION', severityScore: 5, lossDate: '2024-09-10',
    lossDescription: 'Test collision', reportedDate: '2024-09-10',
    claimantName: 'Alice', claimantPhone: '555-0001',
    reserveAmount: null, settlementAmount: null, subrogationFlag: false,
    createdAt: '2024-09-10T10:30:00', updatedAt: '2024-09-10T10:30:00'
  };

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('ClaimsService', ['getPolicies', 'createClaim']);
    serviceSpy.getPolicies.and.returnValue(of(mockPolicies));
    serviceSpy.createClaim.and.returnValue(of(mockClaim));

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [FnolFormComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ClaimsService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture = TestBed.createComponent(FnolFormComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load policies on init', () => {
    fixture.detectChanges();
    expect(component.policies.length).toBe(1);
    expect(component.policies[0].policyNumber).toBe('POL-001');
    expect(claimsService.getPolicies).toHaveBeenCalled();
  });

  it('should initialize form with required validators', () => {
    fixture.detectChanges();
    expect(component.fnolForm).toBeTruthy();
    expect(component.fnolForm.get('policyId')).toBeTruthy();
    expect(component.fnolForm.get('lossType')).toBeTruthy();
    expect(component.fnolForm.get('severityScore')).toBeTruthy();
    expect(component.fnolForm.get('lossDate')).toBeTruthy();
    expect(component.fnolForm.get('claimantName')).toBeTruthy();
    expect(component.fnolForm.get('claimantPhone')).toBeTruthy();
    expect(component.fnolForm.get('lossDescription')).toBeTruthy();
  });

  it('should mark form invalid when fields are empty', () => {
    fixture.detectChanges();
    expect(component.fnolForm.valid).toBeFalse();
  });

  it('should mark form valid when all required fields are filled', () => {
    fixture.detectChanges();
    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: new Date('2024-09-10'),
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test description'
    });
    expect(component.fnolForm.valid).toBeTrue();
  });

  it('should reject severity score below 1', () => {
    fixture.detectChanges();
    component.fnolForm.get('severityScore')!.setValue(0);
    expect(component.fnolForm.get('severityScore')!.valid).toBeFalse();
  });

  it('should reject severity score above 10', () => {
    fixture.detectChanges();
    component.fnolForm.get('severityScore')!.setValue(11);
    expect(component.fnolForm.get('severityScore')!.valid).toBeFalse();
  });

  it('should submit form and navigate on success', () => {
    fixture.detectChanges();
    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: '2024-09-10',
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test description'
    });

    component.onSubmit();

    expect(claimsService.createClaim).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/claims', 10]);
  });

  it('should handle submission error gracefully', () => {
    fixture.detectChanges();
    claimsService.createClaim.and.returnValue(throwError(() => new Error('Server error')));

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: '2024-09-10',
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test description'
    });

    component.onSubmit();

    expect(claimsService.createClaim).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should mark all fields as touched when submitting invalid form (non-OTHER lossType)', () => {
    fixture.detectChanges();
    component.fnolForm.patchValue({ lossType: 'COLLISION' });
    component.onSubmit();
    expect(component.fnolForm.get('policyId')!.touched).toBeTrue();
  });

  it('should format Date objects correctly', () => {
    fixture.detectChanges();
    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: new Date(2024, 8, 10), // Sept 10, 2024
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test description'
    });

    component.onSubmit();

    const callArgs = claimsService.createClaim.calls.mostRecent().args[0];
    expect(callArgs['lossDate']).toBe('2024-09-10');
  });
});
