import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast-service';
import { httpErrorMessage } from '../functions/http-error-message';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        const message = httpErrorMessage(error, error.message || 'Something went wrong.');
        if (error.status === 409) {
          this.toastService.warning(message);
        } else if (error.status > 400 && error.status < 500) {
          this.toastService.error(message);
        }

        if (error.status >= 500) {
          this.router.navigate(['/server-error']);
        } else if (error.status === 404) {
          this.router.navigate(['/not-found']);
        }

        return throwError(() => error);
      })
    );
  }

}
