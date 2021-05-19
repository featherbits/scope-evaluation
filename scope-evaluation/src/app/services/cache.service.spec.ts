import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    localStorage.clear()
    service = TestBed.inject(CacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('#getOrSet should get data from observable', (done: DoneFn) => {
    service.getOrSet('tkey', () => of(1337))
      .subscribe(value => {
        expect(value).toBe(1337)
        done()
      }, done.fail)
  })

  it('#getOrSet persists entries in localStorage as JSON string', (done: DoneFn) => {
    service.getOrSet('tkey', () => of({p: 1337}))
      .subscribe(() => {
        const o = JSON.parse(Object.entries(localStorage)[0][1])
        expect(o.data.p).toBe(1337)
        done()
      }, done.fail)
  })
});
