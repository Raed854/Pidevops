import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar-diagnostic',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar_diagnostic.component.html',
  styleUrl: './sidebar_diagnostic.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarDiagnosticComponent implements OnInit, OnDestroy {

  userRole: string | null = null;
  userName = '';
  private subscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.loadUserInfo();
  }

  ngOnInit(): void {
    this.loadUserInfo();
    
    // Écouter les changements de navigation pour mettre à jour le rôle
    this.subscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.loadUserInfo();
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private loadUserInfo(): void {
    const user = this.authService.getCurrentUser();

    if (user && user.role) {
      // Normalize role to uppercase and handle variations
      let role = user.role.toUpperCase();
      
      // Map role variations to standard roles
      if (role === 'DOCTOR' || role === 'SOIGNANT') {
        this.userRole = 'SOIGNANT';
      } else if (role === 'CAREGIVER' || role === 'ACCOMPAGNANT') {
        this.userRole = 'ACCOMPAGNANT';
      } else if (role === 'PATIENT') {
        this.userRole = 'PATIENT';
      } else {
        this.userRole = role;
      }
      
      this.userName = `${user.prenom || ''} ${user.nom || ''}`.trim();
      console.log('[SidebarDiagnostic] User loaded - Role:', this.userRole, 'Name:', this.userName);
    } else {
      this.userRole = null;
      this.userName = '';
      console.log('[SidebarDiagnostic] No user data available');
    }
    
    // Trigger change detection
    this.cdr.markForCheck();
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/home']).then(() => window.location.reload());
  }

  onMedicalRecordClick(): void {
    this.router.navigate(['/medical-record']);
  }

  onMedicalRecordFormClick(): void {
    this.router.navigate(['/medical-record-form']);
  }
}
