import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation.component.html',
  styleUrl: './confirmation.component.css'
})
export class ConfirmationComponent implements OnInit {
  score: number | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Get score from navigation state
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state && nav.extras.state['score'] != null) {
      this.score = nav.extras.state['score'];
    } else {
      // Fallback: check history state
      const state = history.state;
      if (state && state['score'] != null) {
        this.score = state['score'];
      }
    }
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  goToDiagnostic(): void {
    this.router.navigate(['/diagnostic']);
  }
}
