import { TestBed } from '@angular/core/testing';

import { ProblemNotificationService } from './problem-notification.service';

describe('ProblemNotificationService', () => {
  let service: ProblemNotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProblemNotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
