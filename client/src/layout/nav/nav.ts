import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AccountService, SystemAdminRole } from '../../core/services/account-service';
import { ThemeService } from '../../core/services/theme-service';
import { roleHomeRoute } from '../../core/functions/role-home';
import { roleNavLinks } from '../../core/functions/role-nav-links';
import { BusyService } from '../../core/services/busy-service';
import { NavModalService } from '../../core/services/nav-modal-service';

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
  protected readonly navService = inject(NavModalService);
  private readonly router = inject(Router);

  protected readonly universityName = signal<string | null>(null);

  protected readonly navLinks = computed(() => {
    const role = this.accountService.currentUser()?.roles?.[0];
    return role ? roleNavLinks(role) : [];
  });

  constructor() {
    effect(() => {
      const user = this.accountService.currentUser();
      const isSystemAdmin = user?.roles?.includes(SystemAdminRole) ?? false;

      if (!user || isSystemAdmin) {
        this.universityName.set(null);
        return;
      }

      this.accountService.getMyUniversity().subscribe({
        next: (university) => this.universityName.set(university.name),
        error: () => this.universityName.set(null)
      });
    });
  }

  dashboardRoute(): string {
    const role = this.accountService.currentUser()?.roles?.[0] ?? '';
    return roleHomeRoute(role);
  }

  logout(): void {
    this.accountService.logout();
    this.router.navigate(['/']);
  }
}