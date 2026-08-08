import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AccountService } from '../../core/services/account-service';
import { ThemeService } from '../../core/services/theme-service';
import { roleHomeRoute } from '../../core/functions/role-home';
import { roleNavLinks } from '../../core/functions/role-nav-links';
import { BusyService } from '../../core/services/busy-service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class Nav {
  protected readonly accountService = inject(AccountService);
  protected readonly themeService = inject(ThemeService);
  protected readonly busyService = inject(BusyService);
  private readonly router = inject(Router);

  protected readonly navLinks = computed(() => {
    const role = this.accountService.currentUser()?.roles?.[0];
    return role ? roleNavLinks(role) : [];
  });

  dashboardRoute(): string {
    const role = this.accountService.currentUser()?.roles?.[0] ?? '';
    return roleHomeRoute(role);
  }

  logout(): void {
    this.accountService.logout();
    this.router.navigate(['/']);
  }
}