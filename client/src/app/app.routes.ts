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
import { CampusAdmin } from '../features/campus/admin/campus-admin/campus-admin';
import { Student } from '../features/campus/student/student';
import { Universities } from '../features/system-admin/universities/universities';
import { Applications } from '../features/system-admin/applications/applications';
import { UniversityLookups } from '../features/system-admin/university-lookups/university-lookups';
import { Campuses } from '../features/university-admin/campuses/campuses';
import { Invitations } from '../features/university-admin/invitations/invitations';
import { unsavedChangesGuard } from '../core/guards/unsaved-changes-guard';
import { NotFound } from '../features/error-pages/not-found/not-found';
import { ServerError } from '../features/error-pages/server-error/server-error';

export const routes: Routes = [
  { path: '', component: Landing, canActivate: [publicGuard], title: 'Home' },
  { path: 'login', component: Login, canActivate: [publicGuard], title: 'Login' },
  { path: 'register-standard-user', component: RegisterStandardUser, title: 'Register' },
  { path: 'register-institution', component: RegisterInstitution, title: 'Register Institution' },
  { path: 'accept-invitation/:id', component: AcceptInvitation, canActivate: [publicGuard], title: 'Accept Invitation' },
  {
    path: 'system-admin',
    canActivate: [authGuard, roleGuard([SystemAdminRole])],
    children: [
      { path: '', redirectTo: 'universities', pathMatch: 'full' },
      { path: 'universities', component: Universities, title: 'Universities' },
      { path: 'applications', component: Applications, title: 'Applications' },
      { path: 'university-lookups', component: UniversityLookups, title: 'University Lookups' }
    ]
  },
  {
    path: 'university-admin',
    canActivate: [authGuard, roleGuard([UniversityAdminRole])],
    children: [
      { path: '', redirectTo: 'campuses', pathMatch: 'full' },
      { path: 'campuses', component: Campuses, title: 'Campuses' },
      { path: 'invitations', component: Invitations, title: 'Invitations' },
    ]
  },
  {
    path: 'admin/campus',
    component: CampusAdmin,
    canActivate: [authGuard, roleGuard([CampusAdminRole])],
    canDeactivate: [unsavedChangesGuard],
    title: 'Campus Administration'
  },
  {
    path: 'map', component: Student,
    canActivate: [authGuard, roleGuard([StandardUserRole])],
    title: 'Campus Map'
  },
  { path: 'not-found', component: NotFound, title: 'Page Not Found' },
  { path: 'server-error', component: ServerError, title: 'Server Error' },
  { path: '**', redirectTo: '/not-found' }
];
