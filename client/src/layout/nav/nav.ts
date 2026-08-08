import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AccountService } from '../../core/services/account-service';
import { ThemeService } from '../../core/services/theme-service';
import { roleHomeRoute } from '../../core/role-home';
import { BusyService } from '../../core/services/busy-service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class Nav {
  protected readonly accountService = inject(AccountService);
  protected readonly themeService = inject(ThemeService);
  protected readonly busyService = inject(BusyService);
  private readonly router = inject(Router);

  dashboardRoute(): string {
    const role = this.accountService.currentUser()?.roles?.[0] ?? '';
    return roleHomeRoute(role);
  }

  logout(): void {
    this.accountService.logout();
    this.router.navigate(['/']);
  }
}
