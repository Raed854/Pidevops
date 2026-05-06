import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarDiagnosticComponent } from './components/sidebar_diagnostic/sidebar_diagnostic.component';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarDiagnosticComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'MemorIA_Frontend';
  showSidebar = false;

  private readonly noSidebarRoutes = ['/', '/home', '/login', '/signup', '/publications-feed'];

  constructor(private readonly router: Router, private readonly authService: AuthService) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const url = (event as NavigationEnd).urlAfterRedirects || (event as NavigationEnd).url;
      this.showSidebar = this.authService.getCurrentUser() !== null &&
                         !this.noSidebarRoutes.includes(url);
    });
  }
}
