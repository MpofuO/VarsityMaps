import { HttpErrorResponse } from '@angular/common/http';

export function httpErrorMessage(error: HttpErrorResponse, fallback: string): string {
  const payload: unknown = error.error;
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (payload && typeof payload === 'object') {
    const response = payload as Record<string, unknown>;
    const errors = response['errors'];
    if (errors && typeof errors === 'object') {
      const messages = Object.values(errors)
        .flatMap(value => Array.isArray(value) ? value : [value])
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map(value => value.trim());
      if (messages.length) {
        return messages.join(' ');
      }
    }

    for (const key of ['detail', 'message', 'title']) {
      const message = response[key];
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }
  }

  return fallback;
}
