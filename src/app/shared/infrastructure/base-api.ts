import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { BaseEndpoint } from './base-endpoint';

/**
 * Shared infrastructure base class that owns the HTTP client and the platform base URL.
 * The IAM interceptor (registered in app.config.ts) attaches the bearer token.
 * Matches ApiClient in the shared component diagram.
 */
export abstract class BaseApi {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = environment.apiBaseUrl;

  /** Absolute URL for a relative endpoint path. */
  protected url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  /** Creates a CRUD endpoint client for a resource collection. */
  protected endpoint<TResource>(path: string): BaseEndpoint<TResource> {
    return new BaseEndpoint<TResource>(this.http, this.url(path));
  }
}
