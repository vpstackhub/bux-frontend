import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Expense } from '../../models/expense.model';
import { Account } from '../../models/account.model';
import { Category } from '../../models/category.model';
import { ExpenseService } from '../../services/expense.service';
import { AccountService } from '../../services/account.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-add-expense',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './add-expense.component.html',
  styleUrls: ['./add-expense.component.css']
})
export class AddExpenseComponent implements OnInit {
  private readonly lastUsedAccountKey = 'bux.lastUsedAccountId';

  expense: Omit<Expense, 'amount'> & { amount: number | null } = {
    amount: null,
    category: Category.Other,
    description: '',
    date: this.getLocalDateKey(new Date()),
    isRefund: false,
    isRecurring: false,
    recurringFrequency: undefined,
    accountId: null
  };

  accounts: Account[] = [];
  accountsLoading = true;
  isSubmitting = false;
  validationMessage = '';
  accountLoadError = '';

  readonly categories: Category[] = [
    Category.Food,
    Category.Transport,
    Category.Utilities,
    Category.Entertainment,
    Category.Other
  ];

  constructor(
    private expenseService: ExpenseService,
    private accountService: AccountService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.accountService.getAccounts().subscribe({
      next: accounts => {
        this.accounts = accounts.filter(account => account.active);
        this.accountsLoading = false;

        const storedAccountId = Number(localStorage.getItem(this.lastUsedAccountKey));
        const lastUsedAccount = this.accounts.find(account => account.id === storedAccountId);

        if (lastUsedAccount) {
          this.expense.accountId = lastUsedAccount.id;
        } else if (this.accounts.length === 1) {
          this.expense.accountId = this.accounts[0].id;
        }
      },
      error: error => {
        console.error('Error loading accounts:', error);
        this.accountsLoading = false;
        this.accountLoadError = 'Unable to load accounts. Please try again later.';
      }
    });
  }

  get isSaveDisabled(): boolean {
    return this.accountsLoading
      || this.accounts.length === 0
      || this.isSubmitting
      || this.expense.amount == null
      || !Number.isFinite(this.expense.amount)
      || this.expense.amount <= 0
      || !this.expense.date
      || !this.expense.category
      || this.expense.accountId == null;
  }

  addExpense(): void {
    this.validationMessage = '';

    if (!this.authService.getCurrentUser()) {
      this.showToast('Please log in before adding expenses.', 'error');
      this.router.navigate(['/login']);
      return;
    }

    if (this.expense.amount == null || !Number.isFinite(this.expense.amount) || this.expense.amount <= 0) {
      this.validationMessage = 'Enter an amount greater than $0.00.';
      return;
    }

    if (!this.expense.date) {
      this.validationMessage = 'Select a date.';
      return;
    }

    if (this.expense.accountId == null) {
      this.validationMessage = 'Select an account.';
      return;
    }

    if (!this.expense.category) {
      this.validationMessage = 'Select a category.';
      return;
    }

    const expenseToSave: Expense = {
      ...this.expense,
      amount: this.expense.amount,
      description: this.expense.description?.trim() ?? '',
      isRecurring: false,
      recurringFrequency: undefined
    };

    this.isSubmitting = true;
    this.expenseService.addExpense(expenseToSave).subscribe({
      next: () => {
        localStorage.setItem(this.lastUsedAccountKey, String(expenseToSave.accountId));
        this.showToast('Expense added successfully!', 'success');
        this.router.navigate(['/dashboard']);
      },
      error: error => {
        console.error('Error adding expense:', error);
        this.isSubmitting = false;
        this.validationMessage = 'Unable to save the expense. Please try again.';
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  private getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private showToast(message: string, type: 'success' | 'error' | 'warning'): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      backgroundColor: type === 'success' ? 'green' : type === 'error' ? 'red' : 'orange',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      zIndex: '9999',
      fontSize: '16px'
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}
