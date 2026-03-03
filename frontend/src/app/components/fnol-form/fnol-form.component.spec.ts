import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FnolFormComponent } from './fnol-form.component';
import { ClaimsService } from '../../services/claims.service';
import { of, throwError } from 'rxjs';
import { Claim, Policy } from '../../models/claim.model';

describe('FnolFormComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockPolicy: Policy = {
    id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: 'alice@test.com',
    vehicleVin: 'VIN123', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
    coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
  };

  const mockClaim: Claim = {
    id: 1, claimNumber: 'CLM-001', policy: mockPolicy,
    status: 'OPEN', lossType: 'COLLISION', severityScore: 7,
    lossDate: '2024-09-10', lossDescription: 'Test', reportedDate: '2024-09-10',
    claimantName: 'Alice', claimantPhone: '555-0101',
    reserveAmount: null, settlementAmount: null, subrogationFlag: false,
    createdAt: '2024-09-10T10:30:00', updatedAt: '2024-09-10T10:30:00'
  };

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('ClaimsService', ['getPolicies', 'createClaim']);
    serviceSpy.getPolicies.and.returnValue(of([mockPolicy]));
    serviceSpy.createClaim.and.returnValue(of(mockClaim));

    await TestBed.configureTestingModule({
      imports: [
        FnolFormComponent,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        NoopAnimationsModule
      ],
      providers: [
        { provide: ClaimsService, useValue: serviceSpy }
      ]
    }).compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load policies on init', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.policies.length).toBe(1);
    expect(fixture.componentInstance.policies[0].policyNumber).toBe('POL-001');
  });

  it('should initialize the form with validators', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance.fnolForm;
    expect(form).toBeTruthy();
    expect(form.get('policyId')).toBeTruthy();
    expect(form.get('lossType')).toBeTruthy();
    expect(form.get('severityScore')).toBeTruthy();
    expect(form.get('lossDate')).toBeTruthy();
    expect(form.get('claimantName')).toBeTruthy();
    expect(form.get('claimantPhone')).toBeTruthy();
    expect(form.get('lossDescription')).toBeTruthy();
  });

  it('should mark form as invalid when empty', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.fnolForm.valid).toBeFalse();
  });

  it('should submit valid form and call createClaim', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 7,
      lossDate: '2024-09-10',
      claimantName: 'Alice',
      claimantPhone: '555-0101',
      lossDescription: 'Test collision'
    });

    component.onSubmit();
    expect(claimsService.createClaim).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/claims', 1]);
  });

  it('should submit form when lossType is OTHER even if invalid', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'OTHER',
      severityScore: null,
      lossDate: '2024-09-10',
      claimantName: 'Alice',
      claimantPhone: '555-0101',
      lossDescription: 'Test other'
    });

    component.onSubmit();
    expect(claimsService.createClaim).toHaveBeenCalled();
  });

  it('should mark all as touched when form is invalid and not OTHER', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.fnolForm.patchValue({
      lossType: 'COLLISION'
    });

    component.onSubmit();
    expect(claimsService.createClaim).not.toHaveBeenCalled();
    expect(component.fnolForm.get('policyId')?.touched).toBeTrue();
  });

  it('should handle submission error', () => {
    claimsService.createClaim.and.returnValue(throwError(() => new Error('Server error')));
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const snackBar = fixture.debugElement.injector.get(MatSnackBar);
    spyOn(snackBar, 'open');

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: '2024-09-10',
      claimantName: 'Test',
      claimantPhone: '555-0000',
      lossDescription: 'Test'
    });

    component.onSubmit();
    expect(snackBar.open).toHaveBeenCalledWith('Error creating claim. Please try again.', 'Close', { duration: 5000 });
  });

  it('should format Date objects correctly', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: new Date(2024, 8, 10),
      claimantName: 'Test',
      claimantPhone: '555-0000',
      lossDescription: 'Test'
    });

    component.onSubmit();
    expect(claimsService.createClaim).toHaveBeenCalled();
    const callArgs = claimsService.createClaim.calls.mostRecent().args[0] as Record<string, unknown>;
    expect(callArgs['lossDate']).toBe('2024-09-10');
  });

  it('should pass through string dates unchanged', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: '2024-11-15',
      claimantName: 'Test',
      claimantPhone: '555-0000',
      lossDescription: 'Test'
    });

    component.onSubmit();
    const callArgs = claimsService.createClaim.calls.mostRecent().args[0] as Record<string, unknown>;
    expect(callArgs['lossDate']).toBe('2024-11-15');
  });
});
