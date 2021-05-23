import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { apiUrl } from '../helpers/api';
import { User } from '../models/user';
import { VehicleLocation } from '../models/vehicle-geo';
import { CacheService } from './cache.service';

function filterUsers(users: User[]): User[] {
  return users.filter((u: Object) => u.hasOwnProperty('userid') && u.hasOwnProperty('owner') && u.hasOwnProperty('vehicles'))
}

interface ListPayload {
  data: User[]
}

interface VehicleLocationPayload {
  data: VehicleLocation[]
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient, private cache: CacheService) { }

  list(): Observable<User[]> {
    return this.cache.getOrSet('userList', () => this.listUsersFromApi(), { ttlMilliseconds: 5 * 60 * 1000 })
  }

  listVehicleLocations(userId: number): Observable<VehicleLocation[]> {
    return this.cache.getOrSet(`user.${userId}.VehicleLocations`, () => this.http.get<VehicleLocationPayload>(apiUrl('?op=getlocations&userid=' + userId)).pipe(map(p => p.data)), { ttlMilliseconds: 30 * 1000 })
  }

  getUser(userId: number): Observable<User | undefined> {
    return  this.list().pipe(map(users => users.find(u => u.userid == userId)))
  }

  private listUsersFromApi(): Observable<User[]> {
    return this.http.get<ListPayload>(apiUrl('?op=list')).pipe(map(payload => filterUsers(payload.data)))
  }

}
