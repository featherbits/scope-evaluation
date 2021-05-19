import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { User } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit, OnDestroy {

  columns = ['owner', 'vehicleCount']
  footerColumns = ['loader']
  users: User[] = []
  loading = true

  private userListSubscription?: Subscription

  constructor(private userSvc: UserService) { }

  ngOnInit(): void {
    this.load()
  }

  ngOnDestroy(): void {
    this.userListSubscription?.unsubscribe()
  }

  load(): void {
    this.footerColumns = ['loader']
    this.userListSubscription?.unsubscribe()
    this.userListSubscription = this.userSvc.list().subscribe(users => {
      this.footerColumns = []
      this.users = users
    }, () => {
      this.footerColumns = ['loadingFailure']
    })
  }

}
