import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccountService } from '../services/account-service';
import { roleHomeRoute } from '../role-home';

export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return () => {
    const accountService = inject(AccountService);
    const router = inject(Router);

    const currentUser = accountService.currentUser();
    if (!currentUser) {
      router.navigate(['/login']);
      return false;
    }

    const hasAccess = allowedRoles.some((role) => currentUser.roles?.includes(role));
    if (!hasAccess) {
      const role = currentUser.roles?.[0] ?? '';
      router.navigate([roleHomeRoute(role)]);
      return false;
    }

    return true;
  };
}
