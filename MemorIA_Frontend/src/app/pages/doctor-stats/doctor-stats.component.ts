import { Component, OnInit, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService } from '../../services/stats.service';
import { UserProfileModalComponent } from '../../components/user-profile-modal/user-profile-modal.component';

@Component({
  selector: 'app-doctor-stats',
  standalone: true,
  imports: [CommonModule, UserProfileModalComponent],
  templateUrl: './doctor-stats.component.html',
  styleUrls: ['./doctor-stats.component.css'],
  schemas: [NO_ERRORS_SCHEMA]
})
export class DoctorStatsComponent implements OnInit {
  stats: any = {};
  activityData: any[] = [];
  isLoading = true;
  maxActivityCount = 1;

  // Profile modal
  showProfileModal = false;
  profileUserId: number | null = null;

  constructor(private statsService: StatsService) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadActivity();
  }

  loadStats() {
    this.statsService.getStats().subscribe({
      next: (data: any) => {
        this.stats = data;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  loadActivity() {
    this.statsService.getActivityChart().subscribe({
      next: (data) => {
        this.activityData = data;
        this.maxActivityCount = Math.max(...data.map((d: any) => d.count), 1);
      }
    });
  }

  getBarHeight(count: number): number {
    return Math.max((count / this.maxActivityCount) * 160, 4);
  }

  getDayLabel(dateStr: string): string {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const d = new Date(dateStr);
    return days[d.getDay()];
  }

  openProfile(userId: number) {
    this.profileUserId = userId;
    this.showProfileModal = true;
  }

  closeProfile() {
    this.showProfileModal = false;
    this.profileUserId = null;
  }
}
