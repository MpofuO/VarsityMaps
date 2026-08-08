import { Directive, Input, TemplateRef, ViewContainerRef, computed, inject } from '@angular/core';
import { AccountService } from '../../core/services/account-service';

@Directive({ selector: '[hasRole]' })
export class HasRole {
  private readonly accountService = inject(AccountService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  @Input() set hasRole(value: string | string[] | null | undefined) {
    const roles = this.accountService.currentUser()?.roles ?? [];
    const allowed = Array.isArray(value) ? value : value ? [value] : [];
    const visible = allowed.some((role) => roles.includes(role));
    this.viewContainer.clear();
    if (visible) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
