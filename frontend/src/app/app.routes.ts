import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FnolFormComponent } from './components/fnol-form/fnol-form.component';
import { ClaimDetailComponent } from './components/claim-detail/claim-detail.component';
import { TriageComponent } from './components/triage/triage.component';
import { SettlementComponent } from './components/settlement/settlement.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'fnol', component: FnolFormComponent },
  { path: 'claims/:id', component: ClaimDetailComponent },
  { path: 'claims/:id/triage', component: TriageComponent },
  { path: 'claims/:id/settlement', component: SettlementComponent },
];
