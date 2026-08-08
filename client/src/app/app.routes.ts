import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth-guard';
import { publicGuard } from '../core/guards/public-guard';
import { roleGuard } from '../core/guards/role-guard';
import { CampusAdminRole, StandardUserRole, SystemAdminRole, UniversityAdminRole } from '../core/services/account-service';
import { Landing } from '../features/landing/landing';
import { Login } from '../features/auth/login/login';
import { RegisterStandardUser } from '../features/onboarding/register-standard-user/register-standard-user';
import { RegisterInstitution } from '../features/onboarding/register-institution/register-institution';
import { AcceptInvitation } from '../features/onboarding/accept-invitation/accept-invitation';
import { SystemAdmin } from '../features/system-admin/system-admin';
import { UniversityAdmin } from '../features/university-admin/university-admin';
import { CampusAdmin } from '../features/campus/campus-admin/campus-admin';
import { Student } from '../features/campus/student/student';

export const routes: Routes = [
  { path: '', component: Landing, canActivate: [publicGuard] },
  { path: 'login', component: Login, canActivate: [publicGuard] },
  { path: 'register-standard-user', component: RegisterStandardUser },
  { path: 'register-institution', component: RegisterInstitution },
  { path: 'accept-invitation/:id', component: AcceptInvitation },
  { path: 'system-admin', component: SystemAdmin, canActivate: [authGuard, roleGuard([SystemAdminRole])] },
  { path: 'university-admin', component: UniversityAdmin, canActivate: [authGuard, roleGuard([UniversityAdminRole])] },
  { path: 'admin/campus', component: CampusAdmin, canActivate: [authGuard, roleGuard([CampusAdminRole])] },
  { path: 'map', component: Student, canActivate: [authGuard, roleGuard([StandardUserRole])] },
  { path: 'not-found', redirectTo: '' },
  { path: 'server-error', redirectTo: '' },
  { path: '**', redirectTo: '' }
];
