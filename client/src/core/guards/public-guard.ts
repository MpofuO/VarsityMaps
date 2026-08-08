import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccountService } from '../services/account-service';
import { roleHomeRoute } from '../functions/role-home';

export const publicGuard: CanActivateFn = () => {
  const accountService = inject(AccountService);
  const router = inject(Router);

  const currentUser = accountService.currentUser();
  if (currentUser) {
    const role = currentUser.roles?.[0] ?? '';
    router.navigate([roleHomeRoute(role)]);
    return false;
  }

  return true;
};
