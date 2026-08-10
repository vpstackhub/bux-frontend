import { Component, OnInit, ViewChild } from '@angular/core';
import { Expense } from '../../models/expense.model';
import { ExpenseService } from '../../services/expense.service';
import { AuthService } from '../../services/auth.service';
import { Account } from '../../models/account.model';
import { AccountService } from '../../services/account.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartOptions, ChartType } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(...registerables);
Chart.register(ChartDataLabels);

interface ExpenseMonthGroup {
  key: string;
  label: string;
  expenses: Expense[];
  total: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  loggedInUserId: number | null = null;
  expenses: Expense[] = [];
  expenseMonthGroups: ExpenseMonthGroup[] = [];
  readonly expandedMonthKeys = new Set<string>();
  accounts: Account[] = [];
  private accountNamesById = new Map<number, string>();
  accountMonthlyTotals: Array<{ accountId: number | null; name: string; total: number }> = [];
  totalThisMonth = 0;
  readonly currentMonthKey: string;
  readonly currentMonthLabel: string;
  private accountsLoaded = false;
  private expensesLoaded = false;
  totalSpent = 0;
  todayTotal = 0;
  spendingPercentage = 0;
  userEnteredBudget: number | null = null;
  selectedFunnyAlert = 'piggy';
  refundingExpenseId: number | null = null;
  showToast = false;
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
    private accountService: AccountService,
    private router: Router,
    private authService: AuthService
  ) {
    const now = new Date();
    this.currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.currentMonthLabel = now.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    this.expandedMonthKeys.add(this.currentMonthKey);
  }

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

    this.loadAccounts();
    this.loadExpenses();
  }

  private get currentMonthExpenses(): Expense[] {
    return this.expenses.filter(
      expense => expense.date?.slice(0, 7) === this.currentMonthKey
    );
  }

  private signedAmount(expense: Expense): number {
    return expense.isRefund ? -expense.amount : expense.amount;
  }

  private getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  goToAddExpense(): void {
    this.router.navigate(['/add-expense']);
  }

  goToAccounts(): void {
    this.router.navigate(['/accounts']);
  }

  get recurringForecast(): number {
    return this.currentMonthExpenses
      .filter(e => e.isRecurring)
      .reduce((sum, e) => sum + this.signedAmount(e), 0);
  }

  loadAccounts(): void {
    this.accountService.getAccounts().subscribe({
      next: accounts => {
        this.accounts = accounts;
        this.accountNamesById = new Map(
          accounts.map(account => [account.id, account.name])
        );
        this.accountsLoaded = true;
        this.calculateCurrentMonthAccountTotals();
      },
      error: err => console.error('Error loading accounts:', err)
    });
  }

  getAccountName(accountId: number | null): string {
    return accountId == null
      ? 'Unassigned'
      : this.accountNamesById.get(accountId) ?? 'Unassigned';
  }

  loadExpenses(): void {
    this.expenseService.getAllExpenses().subscribe({
      next: (allExpenses: Expense[]) => {
        this.expenses = allExpenses;
        this.buildExpenseMonthGroups();
        this.expensesLoaded = true;
        this.calculateTotalSpent();
        this.calculateCategoryData();
        this.calculateCurrentMonthAccountTotals();
      },
      error: (err: any) => console.error('Error loading expenses:', err)
    });
  }

  isMonthExpanded(monthKey: string): boolean {
    return this.expandedMonthKeys.has(monthKey);
  }

  toggleMonth(monthKey: string): void {
    if (this.expandedMonthKeys.has(monthKey)) {
      this.expandedMonthKeys.delete(monthKey);
    } else {
      this.expandedMonthKeys.add(monthKey);
    }
  }

  private buildExpenseMonthGroups(): void {
    const expensesByMonth = new Map<string, Expense[]>();

    for (const expense of this.expenses) {
      const monthKey = this.getExpenseMonthKey(expense);
      const monthExpenses = expensesByMonth.get(monthKey) ?? [];
      monthExpenses.push(expense);
      expensesByMonth.set(monthKey, monthExpenses);
    }

    this.expenseMonthGroups = Array.from(expensesByMonth.entries())
      .map(([key, expenses]) => {
        const sortedExpenses = [...expenses].sort((a, b) => {
          const dateComparison = (b.date ?? '').localeCompare(a.date ?? '');
          if (dateComparison !== 0) {
            return dateComparison;
          }
          return (b.id ?? 0) - (a.id ?? 0);
        });

        return {
          key,
          label: this.getMonthLabel(key),
          expenses: sortedExpenses,
          total: sortedExpenses.reduce(
            (sum, expense) => sum + this.signedAmount(expense),
            0
          )
        };
      })
      .sort((a, b) => {
        if (a.key === 'unknown') return 1;
        if (b.key === 'unknown') return -1;
        return b.key.localeCompare(a.key);
      });
  }

  private getExpenseMonthKey(expense: Expense): string {
    return typeof expense.date === 'string' && /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(expense.date)
      ? expense.date.slice(0, 7)
      : 'unknown';
  }

  private getMonthLabel(monthKey: string): string {
    if (monthKey === 'unknown') {
      return 'Unknown date';
    }

    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleString(undefined, {
      month: 'long',
      year: 'numeric'
    });
  }

  private calculateCurrentMonthAccountTotals(): void {
    if (!this.accountsLoaded || !this.expensesLoaded) {
      return;
    }

    const totalsByAccountId = new Map<number, number>();
    for (const account of this.accounts) {
      totalsByAccountId.set(account.id, 0);
    }

    let unassignedTotal = 0;
    let hasUnassignedExpenses = false;
    this.totalThisMonth = 0;

    for (const expense of this.currentMonthExpenses) {
      const signedAmount = this.signedAmount(expense);
      this.totalThisMonth += signedAmount;

      if (expense.accountId == null || !totalsByAccountId.has(expense.accountId)) {
        unassignedTotal += signedAmount;
        hasUnassignedExpenses = true;
      } else {
        totalsByAccountId.set(
          expense.accountId,
          (totalsByAccountId.get(expense.accountId) ?? 0) + signedAmount
        );
      }
    }

    this.accountMonthlyTotals = this.accounts.map(account => ({
      accountId: account.id,
      name: account.name,
      total: totalsByAccountId.get(account.id) ?? 0
    }));

    if (hasUnassignedExpenses) {
      this.accountMonthlyTotals.push({
        accountId: null,
        name: 'Unassigned',
        total: unassignedTotal
      });
    }
  }

  calculateTotalSpent(): void {
    const budget = this.userEnteredBudget ?? 500;
    this.totalSpent = this.currentMonthExpenses.reduce(
      (sum, expense) => sum + this.signedAmount(expense),
      0
    );
    const todayKey = this.getLocalDateKey(new Date());
    this.todayTotal = this.currentMonthExpenses
      .filter(expense => expense.date === todayKey)
      .reduce((sum, expense) => sum + this.signedAmount(expense), 0);
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

    for (let e of this.currentMonthExpenses) {
      const bucket = this.chartCategories.includes(e.category) ? e.category : 'Other';
      byCat.set(bucket, (byCat.get(bucket) ?? 0) + this.signedAmount(e));
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
    const entertainment = this.currentMonthExpenses
      .filter(e => e.category === 'Entertainment')
      .reduce((sum, e) => sum + this.signedAmount(e), 0);

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
    const totalSpent = this.currentMonthExpenses.reduce(
      (sum, expense) => sum + this.signedAmount(expense),
      0
    );

    if (daysPassed <= 3 || totalSpent <= 0) return '📈 Not enough data yet to forecast.';

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
    for (const e of this.currentMonthExpenses) {
      const cat = this.categoryBudgets[e.category] !== undefined ? e.category : 'Other';
      totals[cat] = (totals[cat] ?? 0) + this.signedAmount(e);
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

