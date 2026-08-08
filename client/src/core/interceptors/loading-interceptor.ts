import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { BusyService } from '../services/busy-service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private readonly busyService: BusyService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    this.busyService.begin();
    return next.handle(request).pipe(finalize(() => this.busyService.end()));
  }
}
