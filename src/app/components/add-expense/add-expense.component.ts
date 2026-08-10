import { Component, OnInit } from '@angular/core';
import { Expense } from '../../models/expense.model';
import { ExpenseService } from '../../services/expense.service';
import { Account } from '../../models/account.model';
import { AccountService } from '../../services/account.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Category } from '../../models/category.model';
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

  expense: Expense = {
    amount: 0,
    category: Category.Other,
    description: '',
    date: new Date().toISOString().slice(0, 10),
    isRefund: false,
    isRecurring: false,
    accountId: null
  };

  accounts: Account[] = [];
  accountsLoading = true;

  public categories: Category[] = [
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
      }
    });
  }

  addExpense(): void {
    const currentUser = this.authService.getCurrentUser(); // ✅ Fetch logged-in user

    if (!currentUser) {
      this.showToast('❌ Please log in before adding expenses.', 'error');
      this.router.navigate(['/login']);
      return;
    }

    if (this.expense.accountId == null) {
      this.showToast('Please select an account.', 'error');
      return;
    }

    if (this.expense.amount && this.expense.category && this.expense.date) {
      this.expenseService.addExpense(this.expense).subscribe({
        next: (response: any) => {
          localStorage.setItem(this.lastUsedAccountKey, String(this.expense.accountId));
          console.log('Expense added:', response);
          const emailOk = response.emailSent !== false;
          this.showToast(
            emailOk
              ? '✅ Expense added successfully!'
              : '⚠️ Warning: Email alert failed. Expense was saved.',
            emailOk ? 'success' : 'warning'
          );
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Error adding expense:', error);
          this.showToast('❌ Failed to add expense.', 'error');
        }
      });
    }
  }

  showToast(message: string, type: 'success' | 'error' | 'warning'): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      backgroundColor:
        type === 'success'
          ? 'green'
          : type === 'error'
          ? 'red'
          : 'orange',
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


