import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

const CacheKeyPrefix = 'AppCache.'

interface CacheEntry {
  expirationTimeStamp?: number,
  data: any
}

interface CacheEntryOptions {
  ttlMilliseconds: number
}

function expired(entry: CacheEntry): boolean {
  return entry.expirationTimeStamp ? entry.expirationTimeStamp < Date.now() : true
}

function getQualifiedKeyName(key: string): string {
  return CacheKeyPrefix + key
}

function getStoredItem(qk: string): CacheEntry | undefined {
  const data = localStorage.getItem(qk)
  return data === null ? undefined : JSON.parse(data)
}

function createCacheEntry(data: any, options?: CacheEntryOptions): CacheEntry {
  const entry: CacheEntry = {
    data
  }

  if (options?.ttlMilliseconds) {
    entry.expirationTimeStamp = Date.now() + options.ttlMilliseconds
  }

  return entry
}

function storeData(qk: string, data: any, options?: CacheEntryOptions): void {
  localStorage.setItem(qk, JSON.stringify(createCacheEntry(data, options)))
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {

  constructor() {}

  getOrSet<TData>(
    key: string,
    setter: () => Observable<TData>,
    options?: CacheEntryOptions
  ): Observable<TData> {
    const qk = getQualifiedKeyName(key)
    const entry = getStoredItem(qk)

    if (entry && !expired(entry)) {
      return of<TData>(entry.data)
    }

    return setter().pipe(tap(data => {
      storeData(qk, data, options)
    }))
  }
}
