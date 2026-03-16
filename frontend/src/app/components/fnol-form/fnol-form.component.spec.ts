import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FnolFormComponent } from './fnol-form.component';
import { ClaimsService } from '../../services/claims.service';
import { of, throwError } from 'rxjs';

describe('FnolFormComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;
  let router: jasmine.SpyObj<Router>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const claimsSpy = jasmine.createSpyObj('ClaimsService', ['getPolicies', 'createClaim']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    claimsSpy.getPolicies.and.returnValue(of([
      { id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '', vehicleVin: '', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic', coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01' }
    ]));

    await TestBed.configureTestingModule({
      imports: [FnolFormComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ClaimsService, useValue: claimsSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    })
    .overrideComponent(FnolFormComponent, {
      remove: { imports: [MatSnackBarModule] }
    })
    .compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
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
    expect(form).toBeTruthy();
    expect(form.get('policyId')).toBeTruthy();
    expect(form.get('lossType')).toBeTruthy();
    expect(form.get('severityScore')).toBeTruthy();
  });

  it('should submit valid form', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: new Date('2024-10-01'),
      claimantName: 'Test User',
      claimantPhone: '555-9999',
      lossDescription: 'Test collision'
    });

    claimsService.createClaim.and.returnValue(of({
      id: 100, claimNumber: 'CLM-TEST', policy: {} as any,
      status: 'OPEN', lossType: 'COLLISION', severityScore: 5,
      lossDate: '2024-10-01', lossDescription: 'Test', reportedDate: '2024-10-01',
      claimantName: 'Test User', claimantPhone: '555-9999',
      reserveAmount: null, settlementAmount: null, subrogationFlag: false,
      createdAt: '', updatedAt: ''
    }));

    component.onSubmit();
    expect(claimsService.createClaim).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/claims', 100]);
  });

  it('should handle submit error', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: '2024-10-01',
      claimantName: 'Test User',
      claimantPhone: '555-9999',
      lossDescription: 'Test collision'
    });

    claimsService.createClaim.and.returnValue(throwError(() => new Error('Server error')));
    component.onSubmit();
    expect(snackBar.open).toHaveBeenCalledWith('Error creating claim. Please try again.', 'Close', { duration: 5000 });
  });

  it('should submit with OTHER lossType even if form invalid (bug behavior)', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.fnolForm.patchValue({
      policyId: null,
      lossType: 'OTHER',
      severityScore: null,
      lossDate: null,
      claimantName: '',
      claimantPhone: '',
      lossDescription: ''
    });

    claimsService.createClaim.and.returnValue(of({
      id: 101, claimNumber: 'CLM-BUG', policy: {} as any,
      status: 'OPEN', lossType: 'OTHER', severityScore: 0,
      lossDate: '', lossDescription: '', reportedDate: '',
      claimantName: '', claimantPhone: '',
      reserveAmount: null, settlementAmount: null, subrogationFlag: false,
      createdAt: '', updatedAt: ''
    }));

    component.onSubmit();
    expect(claimsService.createClaim).toHaveBeenCalled();
  });

  it('should mark form as touched when invalid and not OTHER', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.fnolForm.patchValue({
      policyId: null,
      lossType: 'COLLISION',
      severityScore: null
    });

    component.onSubmit();
    expect(component.fnolForm.touched).toBeTrue();
  });

  it('should format Date object correctly', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: new Date(2024, 9, 1),
      claimantName: 'Test',
      claimantPhone: '555-0000',
      lossDescription: 'Test'
    });

    claimsService.createClaim.and.returnValue(of({
      id: 102, claimNumber: 'CLM-DATE', policy: {} as any,
      status: 'OPEN', lossType: 'COLLISION', severityScore: 5,
      lossDate: '2024-10-01', lossDescription: 'Test', reportedDate: '2024-10-01',
      claimantName: 'Test', claimantPhone: '555-0000',
      reserveAmount: null, settlementAmount: null, subrogationFlag: false,
      createdAt: '', updatedAt: ''
    }));

    component.onSubmit();
    const payload = claimsService.createClaim.calls.mostRecent().args[0];
    expect(payload['lossDate']).toBe('2024-10-01');
  });

  it('should pass through string date without formatting', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: '2024-10-01',
      claimantName: 'Test',
      claimantPhone: '555-0000',
      lossDescription: 'Test'
    });

    claimsService.createClaim.and.returnValue(of({
      id: 103, claimNumber: 'CLM-STR', policy: {} as any,
      status: 'OPEN', lossType: 'COLLISION', severityScore: 5,
      lossDate: '2024-10-01', lossDescription: 'Test', reportedDate: '2024-10-01',
      claimantName: 'Test', claimantPhone: '555-0000',
      reserveAmount: null, settlementAmount: null, subrogationFlag: false,
      createdAt: '', updatedAt: ''
    }));

    component.onSubmit();
    const payload = claimsService.createClaim.calls.mostRecent().args[0];
    expect(payload['lossDate']).toBe('2024-10-01');
  });
});
