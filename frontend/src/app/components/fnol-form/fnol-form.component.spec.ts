import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FnolFormComponent } from './fnol-form.component';
import { ClaimsService } from '../../services/claims.service';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('FnolFormComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;
  let router: Router;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ClaimsService', [
      'getPolicies', 'createClaim'
    ]);
    spy.getPolicies.and.returnValue(of([
      {
        id: 1, policyNumber: 'POL-001', holderName: 'Alice',
        holderEmail: 'a@b.com', vehicleVin: 'VIN1',
        vehicleYear: 2021, vehicleMake: 'Honda',
        vehicleModel: 'Civic', coverageType: 'COMPREHENSIVE',
        effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
      }
    ]));
    spy.createClaim.and.returnValue(of({
      id: 100, claimNumber: 'CLM-NEW', status: 'OPEN',
      lossType: 'COLLISION', severityScore: 5,
      lossDate: '2024-10-01', lossDescription: 'Test',
      reportedDate: '2024-10-01', claimantName: 'Test',
      claimantPhone: '555', reserveAmount: null,
      settlementAmount: null, subrogationFlag: false,
      createdAt: '', updatedAt: '', policy: null
    }));

    await TestBed.configureTestingModule({
    imports: [FnolFormComponent,
        RouterTestingModule.withRoutes([]),
        NoopAnimationsModule],
    providers: [{ provide: ClaimsService, useValue: spy }, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
}).compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
    router = TestBed.inject(Router);
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
  });

  it('should mark form invalid when empty', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.fnolForm.valid).toBeFalse();
  });

  it('should mark form valid with all required fields', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance.fnolForm;
    form.setValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: new Date(2024, 9, 1),
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test loss description'
    });
    expect(form.valid).toBeTrue();
  });

  it('should reject severity outside 1-10 range', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const severityCtrl = fixture.componentInstance.fnolForm.get('severityScore');
    severityCtrl?.setValue(0);
    expect(severityCtrl?.valid).toBeFalse();
    severityCtrl?.setValue(11);
    expect(severityCtrl?.valid).toBeFalse();
    severityCtrl?.setValue(5);
    expect(severityCtrl?.valid).toBeTrue();
  });

  it('should submit valid form and navigate', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const navigateSpy = spyOn(router, 'navigate');
    const form = fixture.componentInstance.fnolForm;
    form.setValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: new Date(2024, 9, 1),
      claimantName: 'Test',
      claimantPhone: '555',
      lossDescription: 'Desc'
    });
    fixture.componentInstance.onSubmit();
    expect(claimsService.createClaim).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/claims', 100]);
  });

  it('should not submit invalid form', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    fixture.componentInstance.onSubmit();
    // createClaim should not be called since lossType is not 'OTHER'
    // and form is invalid
    expect(claimsService.createClaim).not.toHaveBeenCalled();
  });

  it('should show error snackbar on submission failure', () => {
    claimsService.createClaim.and.returnValue(
      throwError(() => new Error('Server error'))
    );
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance.fnolForm;
    form.setValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: new Date(2024, 9, 1),
      claimantName: 'Test',
      claimantPhone: '555',
      lossDescription: 'Desc'
    });
    fixture.componentInstance.onSubmit();
    expect(claimsService.createClaim).toHaveBeenCalled();
    // No navigation should occur on error
    const navigateSpy = spyOn(router, 'navigate');
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
