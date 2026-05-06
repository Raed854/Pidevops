import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbare.component.html',
  styleUrls: ['./navbare.component.css']
})
export class NavbarComponent implements OnInit {
  notificationCount = 3;
  messageCount = 2;
  userName = 'Utilisateur';
  userRole = 'Rôle';
  isDoctor = false;
  showDropdown = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Récupérer les données de l'utilisateur actuel
    const user = this.authService.getUser();
    if (user) {
      this.userName = user.prenom && user.nom ? `${user.prenom} ${user.nom}` : user.email;
      this.userRole = this.getRoleLabel(user.role);
      this.isDoctor = user.role === 'DOCTOR';
    }
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'DOCTOR': '👨‍⚕️ Doctor',
      'CAREGIVER': '👨‍🏫 Caregiver',
      'PATIENT': '👤 Patient'
    };
    return labels[role] || role;
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  logout(): void {
    this.authService.logout();
    window.location.href = '/login';
  }
}
