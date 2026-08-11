import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Account } from '../../models/account.model';
import { AccountService } from '../../services/account.service';
import { RecurringExpense } from '../../models/recurring-expense.model';
import { RecurringExpenseService } from '../../services/recurring-expense.service';

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
  recurringExpenses: RecurringExpense[] = [];
  recurringLoading = true;
  recurringErrorMessage = '';
  readonly stoppingRecurringIds = new Set<number>();

  constructor(
    private accountService: AccountService,
    private recurringExpenseService: RecurringExpenseService
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
    this.loadRecurringExpenses();
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

  loadRecurringExpenses(): void {
    this.recurringLoading = true;
    this.recurringErrorMessage = '';

    this.recurringExpenseService.getActiveRecurringExpenses().subscribe({
      next: recurringExpenses => {
        this.recurringExpenses = recurringExpenses;
        this.recurringLoading = false;
      },
      error: () => {
        this.recurringErrorMessage = 'Unable to load recurring expenses.';
        this.recurringLoading = false;
      }
    });
  }

  stopRecurringExpense(recurringExpense: RecurringExpense): void {
    const confirmed = confirm(
      'Stop this recurring expense? Existing transactions will not be changed.'
    );
    if (!confirmed || this.stoppingRecurringIds.has(recurringExpense.id)) {
      return;
    }

    this.stoppingRecurringIds.add(recurringExpense.id);
    this.recurringErrorMessage = '';
    this.recurringExpenseService.stopRecurringExpense(recurringExpense.id).subscribe({
      next: () => {
        this.stoppingRecurringIds.delete(recurringExpense.id);
        this.loadRecurringExpenses();
      },
      error: () => {
        this.stoppingRecurringIds.delete(recurringExpense.id);
        this.recurringErrorMessage = 'Unable to stop the recurring expense.';
      }
    });
  }

  getAccountName(accountId: number): string {
    return this.accounts.find(account => account.id === accountId)?.name ?? 'Unknown account';
  }

  getRecurringDescription(recurringExpense: RecurringExpense): string {
    return recurringExpense.description?.trim() || 'Recurring expense';
  }

  getMonthlyDueDay(startDate: string): string {
    const match = /^\d{4}-\d{2}-(\d{2})$/.exec(startDate);
    return match ? `Monthly on day ${Number(match[1])}` : 'Monthly due date unavailable';
  }
}
