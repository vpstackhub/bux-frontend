import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';


@Component({
  selector: 'app-user-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-signup.component.html',
  styleUrls: ['./user-signup.component.css']
})
export class UserSignupComponent {
    user: User = {
    displayName: '',
    username: '',
    email: '',
    password: ''
  };

  constructor(private authService: AuthService, private router: Router) {}

  register(): void {
    const displayName = this.user.displayName?.trim();
    if (!displayName) {
      return;
    }

    this.user.displayName = displayName;
    this.authService.register(this.user).subscribe({
      next: () => {
        alert('✅ Registration successful!');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Registration error:', err);
        alert('❌ Registration failed.');
      }
    });
  }
}
