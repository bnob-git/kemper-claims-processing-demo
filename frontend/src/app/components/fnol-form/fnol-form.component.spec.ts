import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { FnolFormComponent } from './fnol-form.component';
import { ClaimsService } from '../../services/claims.service';
import { Policy, Claim } from '../../models/claim.model';

describe('FnolFormComponent', () => {
  let component: FnolFormComponent;
  let fixture: ComponentFixture<FnolFormComponent>;
  let claimsServiceSpy: jasmine.SpyObj<ClaimsService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackBar: MatSnackBar;

  const mockPolicies: Policy[] = [
    { id: 1, policyNumber: 'POL-001', holderName: 'Alice Smith', holderEmail: 'alice@test.com', vehicleVin: 'VIN001', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic', coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01' },
    { id: 2, policyNumber: 'POL-002', holderName: 'Bob Jones', holderEmail: 'bob@test.com', vehicleVin: 'VIN002', vehicleYear: 2022, vehicleMake: 'Toyota', vehicleModel: 'Camry', coverageType: 'LIABILITY', effectiveDate: '2024-01-01', expirationDate: '2025-01-01' }
  ];

  const mockClaim: Claim = {
    id: 10, claimNumber: 'CLM-ABCD1234', policy: mockPolicies[0],
    status: 'OPEN', lossType: 'COLLISION', severityScore: 5,
    lossDate: '2024-10-01', lossDescription: 'Test collision',
    reportedDate: '2024-10-01', claimantName: 'Test User', claimantPhone: '555-0001',
    reserveAmount: null, settlementAmount: null, subrogationFlag: false,
    createdAt: '', updatedAt: ''
  };

  beforeEach(async () => {
    claimsServiceSpy = jasmine.createSpyObj('ClaimsService', ['getPolicies', 'createClaim']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    claimsServiceSpy.getPolicies.and.returnValue(of(mockPolicies));

    await TestBed.configureTestingModule({
      imports: [
        FnolFormComponent,
        NoopAnimationsModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: ClaimsService, useValue: claimsServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FnolFormComponent);
    component = fixture.componentInstance;
    snackBar = fixture.debugElement.injector.get(MatSnackBar);
    spyOn(snackBar, 'open');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load policies on init', () => {
    expect(claimsServiceSpy.getPolicies).toHaveBeenCalled();
    expect(component.policies.length).toBe(2);
    expect(component.policies[0].policyNumber).toBe('POL-001');
  });

  it('should initialize form with required validators', () => {
    const form = component.fnolForm;
    expect(form).toBeTruthy();
    expect(form.get('policyId')).toBeTruthy();
    expect(form.get('lossType')).toBeTruthy();
    expect(form.get('severityScore')).toBeTruthy();
    expect(form.get('lossDate')).toBeTruthy();
    expect(form.get('claimantName')).toBeTruthy();
    expect(form.get('claimantPhone')).toBeTruthy();
    expect(form.get('lossDescription')).toBeTruthy();

    // All fields should be invalid when empty
    expect(form.get('policyId')!.valid).toBeFalse();
    expect(form.get('lossType')!.valid).toBeFalse();
    expect(form.get('severityScore')!.valid).toBeFalse();
    expect(form.get('lossDate')!.valid).toBeFalse();
    expect(form.get('claimantName')!.valid).toBeFalse();
    expect(form.get('claimantPhone')!.valid).toBeFalse();
    expect(form.get('lossDescription')!.valid).toBeFalse();
  });

  it('should not submit when form is invalid', () => {
    // Form is blank, lossType is not 'OTHER' so it won't bypass validation
    component.fnolForm.patchValue({ lossType: 'COLLISION' });
    component.fnolForm.get('policyId')!.setValue(null);
    component.onSubmit();
    expect(claimsServiceSpy.createClaim).not.toHaveBeenCalled();
  });

  it('should submit valid form and navigate to claim detail', () => {
    claimsServiceSpy.createClaim.and.returnValue(of(mockClaim));

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: '2024-10-01',
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test collision'
    });

    component.onSubmit();

    expect(claimsServiceSpy.createClaim).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/claims', 10]);
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should show snackbar on error', () => {
    claimsServiceSpy.createClaim.and.returnValue(throwError(() => new Error('Server error')));

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: '2024-10-01',
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test collision'
    });

    component.onSubmit();

    expect(claimsServiceSpy.createClaim).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Error creating claim. Please try again.', 'Close', { duration: 5000 });
  });

  it('should format Date object to yyyy-MM-dd string via submission', () => {
    const dateObj = new Date(2024, 9, 15); // Oct 15, 2024
    claimsServiceSpy.createClaim.and.returnValue(of(mockClaim));

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: dateObj,
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test collision'
    });

    component.onSubmit();

    const callArgs = claimsServiceSpy.createClaim.calls.mostRecent().args[0] as Record<string, unknown>;
    expect(callArgs['lossDate']).toBe('2024-10-15');
  });

  it('should bypass validation when lossType is OTHER (known bug)', () => {
    claimsServiceSpy.createClaim.and.returnValue(of(mockClaim));

    // Only set lossType to OTHER, leave everything else invalid
    component.fnolForm.patchValue({
      lossType: 'OTHER'
    });

    component.onSubmit();

    // The bug causes the form to submit even when invalid (because lossType === 'OTHER')
    expect(claimsServiceSpy.createClaim).toHaveBeenCalled();
  });
});
