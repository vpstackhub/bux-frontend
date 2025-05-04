import { Component } from '@angular/core';
import { Expense } from '../../models/expense.model';
import { ExpenseService } from '../../services/expense.service';
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
export class AddExpenseComponent {
  expense: Expense = {
    amount: 0,
    category: Category.Other,
    description: '',
    date: new Date().toISOString().slice(0, 10),
    isRefund: false,
    isRecurring: false
  };

  public categories: Category[] = [
    Category.Food,
    Category.Transport,
    Category.Utilities,
    Category.Entertainment,
    Category.Other
  ];

  constructor(
    private expenseService: ExpenseService,
    private authService: AuthService,        
    private router: Router
  ) {}

  addExpense(): void {
    const currentUser = this.authService.getCurrentUser(); // ✅ Fetch logged-in user

    if (!currentUser) {
      this.showToast('❌ Please log in before adding expenses.', 'error');
      this.router.navigate(['/login']);
      return;
    }

    // ✅ Attach userId to the expense
    this.expense.userId = currentUser.id;

    if (this.expense.amount && this.expense.category && this.expense.date) {
      this.expenseService.addExpense(this.expense).subscribe({
        next: (response: any) => {
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


