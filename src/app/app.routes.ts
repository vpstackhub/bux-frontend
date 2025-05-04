import { Routes } from '@angular/router';
import { AddExpenseComponent } from './components/add-expense/add-expense.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';

export const routes: Routes = [
  // 1) default → send people to login
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // 2) login and signup (both lazy)
  {
    path: 'login',
    loadComponent: () =>
      import('./components/user-login/user-login.component')
        .then(m => m.UserLoginComponent),
        
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./components/user-signup/user-signup.component')
        .then(m => m.UserSignupComponent)
  },

  // 3) protected app routes
  { path: 'dashboard', component: DashboardComponent },
  { path: 'add-expense', component: AddExpenseComponent },

  // 4) anything else → back to login
  { path: '**', redirectTo: '/login' }
];


