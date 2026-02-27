import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FnolFormComponent } from './fnol-form.component';
import { ClaimsService } from '../../services/claims.service';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('FnolFormComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockClaimResponse = {
    id: 100, claimNumber: 'CLM-TEST', status: 'OPEN', lossType: 'COLLISION',
    severityScore: 5, lossDate: '2024-10-01', lossDescription: 'Test',
    reportedDate: '2024-10-01', claimantName: 'Test', claimantPhone: '555',
    reserveAmount: null, settlementAmount: null, subrogationFlag: false,
    createdAt: '', updatedAt: '',
    policy: { id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '',
      vehicleVin: '', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
      coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01' }
  };

  beforeEach(async () => {
    const claimsSpy = jasmine.createSpyObj('ClaimsService', ['getPolicies', 'createClaim']);
    claimsSpy.getPolicies.and.returnValue(of([
      { id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '',
        vehicleVin: '', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
        coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01' }
    ]));
    claimsSpy.createClaim.and.returnValue(of(mockClaimResponse));

    await TestBed.configureTestingModule({
    imports: [FnolFormComponent,
        NoopAnimationsModule],
    providers: [
        { provide: ClaimsService, useValue: claimsSpy },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([])
    ]
}).compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize form with required validators', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance.fnolForm;

    expect(form.get('policyId')?.valid).toBeFalse();
    expect(form.get('lossType')?.valid).toBeFalse();
    expect(form.get('severityScore')?.valid).toBeFalse();
    expect(form.get('lossDate')?.valid).toBeFalse();
    expect(form.get('claimantName')?.valid).toBeFalse();
    expect(form.get('claimantPhone')?.valid).toBeFalse();
    expect(form.get('lossDescription')?.valid).toBeFalse();
    expect(form.valid).toBeFalse();
  });

  it('should not submit when form is invalid', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    fixture.componentInstance.onSubmit();
    expect(claimsService.createClaim).not.toHaveBeenCalled();
  });

  it('should submit valid form and call createClaim', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: '2024-10-01',
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test description'
    });

    comp.onSubmit();
    expect(claimsService.createClaim).toHaveBeenCalled();
  });

  it('should not bypass validation for OTHER loss type', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    // Only set lossType to OTHER, leave other fields empty
    comp.fnolForm.patchValue({ lossType: 'OTHER' });

    comp.onSubmit();
    // Should NOT submit because form is invalid (BUG-001 fix verification)
    expect(claimsService.createClaim).not.toHaveBeenCalled();
  });

  it('should show error snackbar on submission failure', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    const snackBarInstance = fixture.debugElement.injector.get(MatSnackBar);
    spyOn(snackBarInstance, 'open');

    claimsService.createClaim.and.returnValue(throwError(() => new Error('Server error')));

    comp.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: '2024-10-01',
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test description'
    });

    comp.onSubmit();
    expect(snackBarInstance.open).toHaveBeenCalledWith(
      'Error creating claim. Please try again.', 'Close', jasmine.objectContaining({ duration: 5000 })
    );
  });

  it('should validate severity range (min 1, max 10)', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance.fnolForm;

    form.get('severityScore')?.setValue(0);
    expect(form.get('severityScore')?.valid).toBeFalse();

    form.get('severityScore')?.setValue(11);
    expect(form.get('severityScore')?.valid).toBeFalse();

    form.get('severityScore')?.setValue(5);
    expect(form.get('severityScore')?.valid).toBeTrue();
  });

  it('should load policies on init', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    expect(claimsService.getPolicies).toHaveBeenCalled();
    expect(fixture.componentInstance.policies.length).toBe(1);
  });
});
