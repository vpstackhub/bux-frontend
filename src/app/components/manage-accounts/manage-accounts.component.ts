import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Account } from '../../models/account.model';
import { AccountService } from '../../services/account.service';

@Component({
  selector: 'app-manage-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './manage-accounts.component.html'
})
export class ManageAccountsComponent implements OnInit {
  accountName = '';
  accounts: Account[] = [];
  loading = true;
  creating = false;
  errorMessage = '';

  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading = true;
    this.errorMessage = '';

    this.accountService.getAccounts().subscribe({
      next: accounts => {
        this.accounts = accounts;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load accounts.';
        this.loading = false;
      }
    });
  }

  addAccount(): void {
    const name = this.accountName.trim();
    if (!name || this.creating) {
      return;
    }

    this.creating = true;
    this.errorMessage = '';

    this.accountService.createAccount({ name }).subscribe({
      next: () => {
        this.accountName = '';
        this.creating = false;
        this.loadAccounts();
      },
      error: () => {
        this.errorMessage = 'Unable to add account.';
        this.creating = false;
      }
    });
  }
}
