import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FnolFormComponent } from './fnol-form.component';
import { ClaimsService } from '../../services/claims.service';
import { of, throwError } from 'rxjs';
import { Claim, Policy } from '../../models/claim.model';

describe('FnolFormComponent', () => {
  let claimsService: jasmine.SpyObj<ClaimsService>;

  const mockPolicy: Policy = {
    id: 1, policyNumber: 'POL-001', holderName: 'Alice', holderEmail: '',
    vehicleVin: '', vehicleYear: 2021, vehicleMake: 'Honda', vehicleModel: 'Civic',
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
        RouterTestingModule,
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
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load policies on init', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.policies.length).toBe(1);
    expect(component.policies[0].policyNumber).toBe('POL-001');
  });

  it('should initialize the form with required validators', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    const component = fixture.componentInstance;
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

  it('should not submit invalid form and mark all as touched', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.fnolForm.patchValue({ lossType: 'COLLISION' });
    component.onSubmit();
    expect(claimsService.createClaim).not.toHaveBeenCalled();
    expect(component.fnolForm.get('policyId')!.touched).toBeTrue();
  });

  it('should submit valid form', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 7,
      lossDate: new Date('2024-09-10'),
      claimantName: 'Alice',
      claimantPhone: '555-0101',
      lossDescription: 'Test description'
    });

    component.onSubmit();
    expect(claimsService.createClaim).toHaveBeenCalled();
  });

  it('should bypass validation for OTHER loss type', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'OTHER',
      severityScore: null,
      lossDate: null,
      claimantName: '',
      claimantPhone: '',
      lossDescription: ''
    });

    component.onSubmit();
    expect(claimsService.createClaim).toHaveBeenCalled();
  });

  it('should handle submission error gracefully', () => {
    claimsService.createClaim.and.returnValue(throwError(() => new Error('Server error')));

    const fixture = TestBed.createComponent(FnolFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 7,
      lossDate: '2024-09-10',
      claimantName: 'Alice',
      claimantPhone: '555-0101',
      lossDescription: 'Test'
    });

    expect(() => component.onSubmit()).not.toThrow();
    expect(claimsService.createClaim).toHaveBeenCalled();
  });

  it('should format string date as-is', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'COLLISION',
      severityScore: 5,
      lossDate: '2024-10-01',
      claimantName: 'Test',
      claimantPhone: '555-0001',
      lossDescription: 'Test'
    });

    component.onSubmit();
    expect(claimsService.createClaim).toHaveBeenCalled();
    const callArgs = claimsService.createClaim.calls.mostRecent().args[0];
    expect(callArgs['lossDate']).toBe('2024-10-01');
  });

  it('should format Date object to YYYY-MM-DD string', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const date = new Date(2024, 8, 15);
    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'WEATHER',
      severityScore: 3,
      lossDate: date,
      claimantName: 'Test',
      claimantPhone: '555-0001',
      lossDescription: 'Hail'
    });

    component.onSubmit();
    expect(claimsService.createClaim).toHaveBeenCalled();
    const callArgs = claimsService.createClaim.calls.mostRecent().args[0];
    expect(callArgs['lossDate']).toBe('2024-09-15');
  });

  it('should default severity to 0 when empty for OTHER loss type', () => {
    const fixture = TestBed.createComponent(FnolFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.fnolForm.patchValue({
      policyId: 1,
      lossType: 'OTHER',
      severityScore: null,
      lossDate: '2024-10-01',
      claimantName: 'Test',
      claimantPhone: '555',
      lossDescription: 'Test'
    });

    component.onSubmit();
    const callArgs = claimsService.createClaim.calls.mostRecent().args[0];
    expect(callArgs['severityScore']).toBe(0);
  });
});
