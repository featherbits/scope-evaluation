import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CacheService } from './cache.service';

export interface Place {
  display_name: string
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {

  private readonly apiUrl = 'https://nominatim.openstreetmap.org'

  constructor(private http: HttpClient, private cache: CacheService) { }

  reverse(lat: number, lon: number): Observable<Place> {
    return this.cache.getOrSet(`place.lat${lat}:lon:${lon}`, () => this.http.get<Place>(`${this.apiUrl}/reverse?lat=${lat}&lon=${lon}&format=json`), { ttlMilliseconds: 10 * 60 * 1000 })
  }
}
