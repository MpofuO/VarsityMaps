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
import { CampusAdmin } from '../features/campus/campus-admin/campus-admin';
import { Student } from '../features/campus/student/student';
import { Universities } from '../features/system-admin/universities/universities';
import { Applications } from '../features/system-admin/applications/applications';
import { Campuses } from '../features/university-admin/campuses/campuses';
import { Invitations } from '../features/university-admin/invitations/invitations';

export const routes: Routes = [
  { path: '', component: Landing, canActivate: [publicGuard] },
  { path: 'login', component: Login, canActivate: [publicGuard] },
  { path: 'register-standard-user', component: RegisterStandardUser },
  { path: 'register-institution', component: RegisterInstitution },
  { path: 'accept-invitation/:id', component: AcceptInvitation },
  {
    path: 'system-admin',
    canActivate: [authGuard, roleGuard([SystemAdminRole])],
    children: [
      { path: '', redirectTo: 'universities', pathMatch: 'full' },
      { path: 'universities', component: Universities },
      { path: 'applications', component: Applications }
    ]
  },
  {
    path: 'university-admin',
    canActivate: [authGuard, roleGuard([UniversityAdminRole])],
    children: [
      { path: '', redirectTo: 'campuses', pathMatch: 'full' },
      { path: 'campuses', component: Campuses },
      { path: 'invitations', component: Invitations },
    ]
  },
  { path: 'admin/campus', component: CampusAdmin, canActivate: [authGuard, roleGuard([CampusAdminRole])] },
  { path: 'map', component: Student, canActivate: [authGuard, roleGuard([StandardUserRole])] },
  { path: 'not-found', redirectTo: '' },
  { path: 'server-error', redirectTo: '' },
  { path: '**', redirectTo: '' }
];
