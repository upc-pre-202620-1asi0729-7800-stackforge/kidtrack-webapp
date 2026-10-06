import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EntityId } from '../domain/model/base-entity';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Reusable endpoint client with CRUD operations over a resource collection.
 */
export class BaseEndpoint<TResource> {
  constructor(
    private readonly http: HttpClient,
    readonly endpointUrl: string,
  ) {}

  getAll(query: QueryParams = {}): Observable<TResource[]> {
    return this.http.get<TResource[]>(this.endpointUrl, { params: toParams(query) });
  }

  getById(id: EntityId): Observable<TResource> {
    return this.http.get<TResource>(`${this.endpointUrl}/${id}`);
  }

  create(resource: Partial<TResource>): Observable<TResource> {
    return this.http.post<TResource>(this.endpointUrl, resource);
  }

  update(id: EntityId, resource: Partial<TResource>): Observable<TResource> {
    return this.http.put<TResource>(`${this.endpointUrl}/${id}`, resource);
  }

  patch(id: EntityId, partial: Partial<TResource>): Observable<TResource> {
    return this.http.patch<TResource>(`${this.endpointUrl}/${id}`, partial);
  }

  delete(id: EntityId): Observable<unknown> {
    return this.http.delete(`${this.endpointUrl}/${id}`);
  }
}

/** Drops null/undefined values so json-server does not filter by "null". */
function toParams(query: QueryParams): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== '') params = params.set(key, String(value));
  }
  return params;
}
