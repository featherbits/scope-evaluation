import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { first } from 'rxjs/operators';

export interface ProblemNotificationSettings {
  actionName: string
  onAction?: () => void
}

@Injectable({
  providedIn: 'root'
})
export class ProblemNotificationService {

  constructor(private snackBar: MatSnackBar) { }

  show(message: string, settings?: ProblemNotificationSettings): void {
    const ref = this.snackBar.open(message, settings?.actionName || 'Close')
    if (settings?.onAction) {
      ref.onAction().pipe(first()).subscribe(settings.onAction)
    }
  }
}
