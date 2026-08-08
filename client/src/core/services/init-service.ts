import { Injectable } from '@angular/core';
import { AccountService } from './account-service';
import { ThemeService } from './theme-service';

@Injectable({ providedIn: 'root' })
export class InitService {
  constructor(
    private readonly accountService: AccountService,
    private readonly themeService: ThemeService
  ) {}

  initialize(): void {
    this.accountService.currentUser();
    this.themeService.initialize();
  }
}
