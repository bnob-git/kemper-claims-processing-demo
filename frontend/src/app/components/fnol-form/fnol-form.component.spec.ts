import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
// MatSnackBar is provided but not directly asserted on; Angular DI handles injection
import { MatSnackBar } from '@angular/material/snack-bar';
import { FnolFormComponent } from './fnol-form.component';
import { ClaimsService } from '../../services/claims.service';
import { of, throwError } from 'rxjs';
import { Claim, Policy } from '../../models/claim.model';

describe('FnolFormComponent', () => {
  let component: FnolFormComponent;
  let fixture: ComponentFixture<FnolFormComponent>;
  let claimsService: jasmine.SpyObj<ClaimsService>;
  let router: jasmine.SpyObj<Router>;

  const mockPolicies: Policy[] = [
    {
      id: 1, policyNumber: 'POL-001', holderName: 'Alice',
      holderEmail: 'alice@test.com', vehicleVin: 'VIN123',
      vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
      coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01',
      expirationDate: '2025-01-01'
    }
  ];

  const mockClaim: Claim = {
    id: 10, claimNumber: 'CLM-TEST', policy: mockPolicies[0],
    status: 'OPEN', lossType: 'COLLISION', severityScore: 5,
    lossDate: '2024-10-01', lossDescription: 'Test',
    reportedDate: '2024-10-01', claimantName: 'Test User',
    claimantPhone: '555-0001', reserveAmount: null,
    settlementAmount: null, subrogationFlag: false,
    createdAt: '2024-10-01T10:00:00', updatedAt: '2024-10-01T10:00:00'
  };

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('ClaimsService', ['getPolicies', 'createClaim']);
    serviceSpy.getPolicies.and.returnValue(of(mockPolicies));
    serviceSpy.createClaim.and.returnValue(of(mockClaim));

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        FnolFormComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ClaimsService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FnolFormComponent);
    component = fixture.componentInstance;
    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load policies on init', () => {
    expect(claimsService.getPolicies).toHaveBeenCalled();
    expect(component.policies.length).toBe(1);
    expect(component.policies[0].policyNumber).toBe('POL-001');
  });

  // ---- Form Validation Tests ----

  it('should have an invalid form when empty', () => {
    expect(component.fnolForm.valid).toBeFalse();
  });

  it('should require policyId', () => {
    const ctrl = component.fnolForm.get('policyId');
    expect(ctrl?.errors?.['required']).toBeTruthy();
  });

  it('should require lossType', () => {
    const ctrl = component.fnolForm.get('lossType');
    expect(ctrl?.errors?.['required']).toBeTruthy();
  });

  it('should require severityScore', () => {
    const ctrl = component.fnolForm.get('severityScore');
    expect(ctrl?.errors?.['required']).toBeTruthy();
  });

  it('should reject severityScore below 1', () => {
    component.fnolForm.get('severityScore')?.setValue(0);
    expect(component.fnolForm.get('severityScore')?.errors?.['min']).toBeTruthy();
  });

  it('should reject severityScore above 10', () => {
    component.fnolForm.get('severityScore')?.setValue(11);
    expect(component.fnolForm.get('severityScore')?.errors?.['max']).toBeTruthy();
  });

  it('should require lossDate', () => {
    const ctrl = component.fnolForm.get('lossDate');
    expect(ctrl?.errors?.['required']).toBeTruthy();
  });

  it('should require claimantName', () => {
    const ctrl = component.fnolForm.get('claimantName');
    expect(ctrl?.errors?.['required']).toBeTruthy();
  });

  it('should require claimantPhone', () => {
    const ctrl = component.fnolForm.get('claimantPhone');
    expect(ctrl?.errors?.['required']).toBeTruthy();
  });

  it('should require lossDescription', () => {
    const ctrl = component.fnolForm.get('lossDescription');
    expect(ctrl?.errors?.['required']).toBeTruthy();
  });

  it('should be valid when all required fields are filled', () => {
    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: new Date('2024-10-01'),
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test description'
    });
    expect(component.fnolForm.valid).toBeTrue();
  });

  // ---- Submission Tests ----

  it('should call createClaim and navigate on successful submission', () => {
    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: '2024-10-01',
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test description'
    });

    component.onSubmit();

    expect(claimsService.createClaim).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/claims', 10]);
  });

  it('should call createClaim on submission even when it errors', () => {
    claimsService.createClaim.and.returnValue(throwError(() => new Error('Server error')));

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: '2024-10-01',
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test description'
    });

    component.onSubmit();

    expect(claimsService.createClaim).toHaveBeenCalled();
    // Router should NOT have been called on error
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should mark all fields as touched when submitting invalid form (non-OTHER lossType)', () => {
    // Set lossType to something other than OTHER so the bypass doesn't kick in
    component.fnolForm.patchValue({ lossType: 'COLLISION' });
    component.onSubmit();
    expect(component.fnolForm.get('claimantName')?.touched).toBeTrue();
    expect(claimsService.createClaim).not.toHaveBeenCalled();
  });
});
