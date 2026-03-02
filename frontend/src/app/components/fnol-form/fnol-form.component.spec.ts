import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FnolFormComponent } from './fnol-form.component';
import { ClaimsService } from '../../services/claims.service';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';

describe('FnolFormComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;
  let router: Router;

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('ClaimsService', ['getPolicies', 'createClaim']);
    serviceSpy.getPolicies.and.returnValue(of([
      {
        id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '',
        vehicleVin: '', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
        coverageType: 'COMPREHENSIVE', effectiveDate: '2024-01-01', expirationDate: '2025-01-01'
      }
    ]));

    await TestBed.configureTestingModule({
      imports: [
        FnolFormComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ClaimsService, useValue: serviceSpy }
      ]
    }).compileComponents();

    claimsService = TestBed.inject(ClaimsService) as jasmine.SpyObj<ClaimsService>;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load policies on init', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.policies.length).toBe(1);
    expect(component.policies[0].policyNumber).toBe('POL-001');
  });

  it('should initialize form with required validators', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.fnolForm).toBeTruthy();
    expect(component.fnolForm.get('policyId')).toBeTruthy();
    expect(component.fnolForm.get('lossType')).toBeTruthy();
    expect(component.fnolForm.get('severityScore')).toBeTruthy();
    expect(component.fnolForm.get('lossDate')).toBeTruthy();
    expect(component.fnolForm.get('claimantName')).toBeTruthy();
    expect(component.fnolForm.get('claimantPhone')).toBeTruthy();
    expect(component.fnolForm.get('lossDescription')).toBeTruthy();
  });

  it('should not submit when form is invalid and lossType is not OTHER', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.onSubmit();
    expect(claimsService.createClaim).not.toHaveBeenCalled();
  });

  it('should mark form as touched when invalid', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.fnolForm.get('lossType')?.setValue('COLLISION');
    component.onSubmit();
    expect(component.fnolForm.get('policyId')?.touched).toBe(true);
  });

  it('should submit valid form and navigate', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    spyOn(router, 'navigate');

    const mockClaim = {
      id: 100, claimNumber: 'CLM-NEW', status: 'OPEN', lossType: 'COLLISION',
      severityScore: 5, policy: {} as any, lossDate: '2024-10-01',
      lossDescription: 'Test', reportedDate: '2024-10-01', claimantName: 'Test',
      claimantPhone: '555-0001', reserveAmount: null, settlementAmount: null,
      subrogationFlag: false, createdAt: '', updatedAt: ''
    };
    claimsService.createClaim.and.returnValue(of(mockClaim));

    component.fnolForm.setValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: new Date('2024-10-01'),
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test collision'
    });

    component.onSubmit();
    expect(claimsService.createClaim).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/claims', 100]);
  });

  it('should handle submission error', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    claimsService.createClaim.and.returnValue(throwError(() => new Error('Server error')));

    component.fnolForm.setValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: new Date('2024-10-01'),
      claimantName: 'Test User',
      claimantPhone: '555-0001',
      lossDescription: 'Test collision'
    });

    component.onSubmit();
    expect(claimsService.createClaim).toHaveBeenCalled();
    // Error is handled internally by snackbar
  });

  it('should format Date object to string', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    // Access private method through any
    const result = (component as any).formatDate(new Date(2024, 9, 1)); // Oct 1, 2024
    expect(result).toBe('2024-10-01');
  });

  it('should return string date as-is', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const result = (component as any).formatDate('2024-10-01');
    expect(result).toBe('2024-10-01');
  });

  it('should bypass validation when lossType is OTHER (BUG-001)', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const mockClaim = {
      id: 101, claimNumber: 'CLM-BUG', status: 'OPEN', lossType: 'OTHER',
      severityScore: 0, policy: {} as any, lossDate: '2024-10-01',
      lossDescription: '', reportedDate: '', claimantName: '',
      claimantPhone: '', reserveAmount: null, settlementAmount: null,
      subrogationFlag: false, createdAt: '', updatedAt: ''
    };
    claimsService.createClaim.and.returnValue(of(mockClaim));

    // Set only lossType to OTHER, leave other fields empty
    component.fnolForm.get('lossType')?.setValue('OTHER');

    component.onSubmit();
    // Due to BUG-001, this should still call createClaim
    expect(claimsService.createClaim).toHaveBeenCalled();
  });
});
