import { Injectable } from '@angular/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { AccountService } from './account-service';
import { ThemeService } from './theme-service';

@Injectable({ providedIn: 'root' })
export class InitService {
  constructor(
    private readonly accountService: AccountService,
    private readonly themeService: ThemeService
  ) {}

  initialize(): Promise<void> {
    this.themeService.initialize();
    return firstValueFrom(this.accountService.refreshToken().pipe(
      map(() => undefined),
      catchError(() => of(undefined))
    ));
  }
}
