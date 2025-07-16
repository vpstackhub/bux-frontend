import { Component, OnInit, ViewChild } from '@angular/core';
import { Expense } from '../../models/expense.model';
import { ExpenseService } from '../../services/expense.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartOptions, ChartType } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(...registerables);
Chart.register(ChartDataLabels);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  loggedInUserId: number | null = null;
  expenses: Expense[] = [];
  totalSpent = 0;
  spendingPercentage = 0;
  userEnteredBudget: number | null = null;
  selectedFunnyAlert = 'piggy';
  refundingExpenseId: number | null = null;
  showToast = false;
  startDate = '';
  categoryBudgets: Record<string, number> = {
    Food: 300,
    Transport: 150,
    Utilities: 200,
    Entertainment: 100,
    Other: 100
  };

  private readonly chartCategories = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Other'];

  public pieChartLabels: string[] = [];
  public pieChartData: number[] = [];
  public pieChartType: ChartType = 'pie';
  public pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.label}: $${ctx.parsed.toFixed(2)}`
        }
      },
      datalabels: {
        display: ctx => (ctx.chart.data.datasets?.[0].data[ctx.dataIndex] as number) > 0,
        anchor: 'center',
        align: 'center',
        offset: 0,
        color: ctx => ctx.chart.data.labels?.[ctx.dataIndex] === 'Remaining' ? '#000' : '#fff',
        textStrokeColor: '#000',
        textStrokeWidth: ctx => ctx.chart.data.labels?.[ctx.dataIndex] === 'Remaining' ? 0.5 : 1.5,
        font: ctx => ({ weight: ctx.chart.data.labels?.[ctx.dataIndex] === 'Remaining' ? 'normal' : 'bold', size: 11 }),
        formatter: (value, ctx) => {
          const data = ctx.chart.data.datasets?.[0].data as number[];
          const sum = data.reduce((a, b) => a + b, 0);
          return sum > 0 ? Math.round((value as number / sum) * 100) + '%' : '';
        }
      }
    }
  };

  public pieChartColors = [{
    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#E9ECEF']
  }];

  constructor(
    private expenseService: ExpenseService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.loggedInUserId = currentUser.id ?? null;

    const sb = localStorage.getItem('userBudget');
    if (sb !== null) {
      this.userEnteredBudget = +sb;
    }

    const savedBudgets = localStorage.getItem('categoryBudgets');
    if (savedBudgets) {
      this.categoryBudgets = JSON.parse(savedBudgets);
    }

    const sd = localStorage.getItem('startDate');
    if (sd) {
      this.startDate = sd;
    } else {
      this.startDate = this.getToday();
      localStorage.setItem('startDate', this.startDate);
    }
    this.loadExpenses();
  }

  getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  goToAddExpense(): void {
    this.router.navigate(['/add-expense']);
  }

  get recurringForecast(): number {
    return this.expenses
      .filter(e => e.isRecurring && !e.isRefund)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  loadExpenses(): void {
    this.expenseService.getAllExpenses().subscribe({
      next: (allExpenses: Expense[]) => {
        this.expenses = allExpenses;
        this.calculateTotalSpent();
        this.calculateCategoryData();
      },
      error: (err: any) => console.error('Error loading expenses:', err)
    });
  }

  calculateTotalSpent(): void {
    const budget = this.userEnteredBudget ?? 500;
    this.totalSpent = this.expenses.reduce((sum, e) => sum + (e.isRefund ? -e.amount : e.amount), 0);
    this.spendingPercentage = Math.min((this.totalSpent / budget) * 100, 999);
  }

  updateBudget(): void {
    if (this.userEnteredBudget && this.userEnteredBudget > 0) {
      localStorage.setItem('userBudget', this.userEnteredBudget.toString());
      this.calculateTotalSpent();
      this.calculateCategoryData();
    }
  }

  markAsRefund(id: number): void {
    this.expenseService.markExpenseAsRefund(id).subscribe({
      next: () => {
        this.loadExpenses();
        this.triggerToast();
      },
      error: err => console.error('Error marking refund:', err)
    });
  }

  safeMarkAsRefund(e: Expense): void {
    if (e.id != null) {
      this.refundingExpenseId = e.id;
      setTimeout(() => this.markAsRefund(e.id!), 500);
    }
  }

  triggerToast(): void {
    this.showToast = true;
    setTimeout(() => this.showToast = false, 3000);
  }

  private calculateCategoryData(): void {
    const byCat = new Map<string, number>();

    for (let cat of this.chartCategories) {
      byCat.set(cat, 0);
    }

    for (let e of this.expenses) {
      const bucket = this.chartCategories.includes(e.category) ? e.category : 'Other';
      byCat.set(bucket, (byCat.get(bucket) ?? 0) + (e.isRefund ? -e.amount : e.amount));
    }

    const budget = this.userEnteredBudget ?? 500;
    const spent = Array.from(byCat.values()).reduce((a, b) => a + b, 0);
    const remaining = Math.max(budget - spent, 0);

    this.pieChartLabels = [...this.chartCategories, 'Remaining'];
    this.pieChartData = [...Array.from(byCat.values()), remaining];

    setTimeout(() => this.chart?.update(), 0);
  }

  resetExpenses(): void {
    if (confirm('Delete all expenses?')) {
      this.expenseService.deleteAllExpenses().subscribe({
        next: () => { this.loadExpenses(); },
        error: err => console.error('Error resetting:', err)
      });
    }
  }

  resetStartDate(): void {
    if (confirm('Reset start date?')) {
      this.startDate = this.getToday();
      localStorage.setItem('startDate', this.startDate);
      alert('✅ Start date reset to today.');
    }
  }

  getCategoryKeys(): string[] {
    return Object.keys(this.categoryBudgets);
  }

  get remainingBudget(): number {
    const budget = this.userEnteredBudget ?? 500;
    return Math.max(budget - this.totalSpent, 0);
  }

  get weeklyBudget(): number {
    const budget = this.userEnteredBudget ?? 500;
    return budget / 4;
  }

  get weeklySpent(): number {
    return this.totalSpent / 4;
  }

  get remainingWeeklyBudget(): number {
    return this.remainingBudget / 4;
  }

  get smartInsight(): { icon: string, message: string, color: string } {
    const budget = this.userEnteredBudget ?? 500;
    const today = new Date().getDate();
    const percent = this.spendingPercentage;
    const entertainment = this.expenses.filter(e => e.category === 'Entertainment' && !e.isRefund).reduce((sum, e) => sum + e.amount, 0);

    if (percent >= 150) return { icon: '💥', message: 'You exploded your budget!', color: 'danger' };
    if (percent >= 100) return { icon: '🚫', message: 'You’ve gone over budget.', color: 'danger' };
    if (percent >= 90) return { icon: '🔥', message: 'You’re maxing out fast.', color: 'warning' };
    if (percent >= 70 && today <= 15) return { icon: '⚠️', message: 'High spending early in the month.', color: 'warning' };
    if (entertainment > budget * 0.3) return { icon: '🎮', message: 'Entertainment is dominating your budget.', color: 'secondary' };
    if (percent < 30) return { icon: '✅', message: 'Nice! Low spending so far.', color: 'success' };
    return { icon: '📊', message: 'Spending data loaded.', color: 'info' };
  }

  get forecastInsight(): string {
    const budget = this.userEnteredBudget ?? 500;
    const today = new Date();
    const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysPassed = today.getDate();
    const actualExpenses = this.expenses.filter(e => !e.isRefund);
    const totalSpent = actualExpenses.reduce((sum, e) => sum + e.amount, 0);

    if (daysPassed <= 3 || totalSpent === 0) return '📈 Not enough data yet to forecast.';

    const projected = (totalSpent / daysPassed) * totalDays;
    const diff = projected - budget;

    const roundedProjected = projected.toFixed(2);
    const roundedDiff = Math.abs(diff).toFixed(2);
    const roundedBudget = budget.toFixed(2);

    if (projected > budget) return `📈 At your current pace, you’ll spend $${roundedProjected} by the ${totalDays}th — that’s $${roundedDiff} over your $${roundedBudget} budget.`;
    if (projected < budget) return `📈 At your current pace, you’ll spend $${roundedProjected} by the ${totalDays}th — $${roundedDiff} under your $${roundedBudget} budget.`;
    return `📈 At your current pace, you're set to match your $${roundedBudget} budget exactly.`;
  }

  get categorySpending(): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const cat of this.getCategoryKeys()) totals[cat] = 0;
    for (const e of this.expenses) {
      const cat = this.categoryBudgets[e.category] !== undefined ? e.category : 'Other';
      totals[cat] = (totals[cat] ?? 0) + (e.isRefund ? -e.amount : e.amount);
    }
    return totals;
  }

  updateCategoryBudget(category: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    if (!isNaN(value) && value >= 0) {
      this.categoryBudgets[category] = value;
      localStorage.setItem('categoryBudgets', JSON.stringify(this.categoryBudgets));
    }
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

