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
    this.authService.login(this.user).subscribe({
      next: userData => {
        this.authService.setCurrentUser(userData);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.errorMessage = 'Invalid credentials. Please try again.';
      }
    });
  }
}
