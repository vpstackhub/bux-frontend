import { Component } from '@angular/core';
import { Router     } from '@angular/router';
import { AuthService} from '../../services/auth.service';
import { FormsModule} from '@angular/forms';
import { CommonModule} from '@angular/common';
import { User       } from '../../models/user.model';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule ],
  templateUrl: './user-login.component.html',
  styleUrls: ['./user-login.component.css']
})
export class UserLoginComponent {
  user: User = { email: '', password: '' };
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login(): void {
  console.log('Login payload:', this.user);

  this.authService.login(this.user).subscribe({
    next: userData => {
      // 🔐 Save email and password to localStorage for later use
      localStorage.setItem('authEmail', this.user.email);
      localStorage.setItem('authPassword', this.user.password);
      console.log('🧪 Stored authEmail:', localStorage.getItem('authEmail'));
      console.log('🧪 Stored authPassword:', localStorage.getItem('authPassword'));


      this.authService.setCurrentUser(userData);
      this.router.navigate(['/dashboard']);
    },
    error: () => {
      this.errorMessage = 'Invalid credentials. Please try again.';
    }
  });
}
}
