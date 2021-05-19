import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { apiUrl } from '../helpers/api';
import { User } from '../models/user';
import { CacheService } from './cache.service';

function filterUsers(users: User[]): User[] {
  return users.filter((u: Object) => u.hasOwnProperty('userid') && u.hasOwnProperty('owner') && u.hasOwnProperty('vehicles'))
}

interface ListPayload {
  data: User[]
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient, private cache: CacheService) { }

  list(): Observable<User[]> {
    return this.cache.getOrSet('userList', () => this.listFromApi(), { ttlMilliseconds: 5 * 60 * 1000 })
  }

  private listFromApi(): Observable<User[]> {
    return this.http.get<ListPayload>(apiUrl('?op=list')).pipe(map(payload => filterUsers(payload.data)))
  }

}
