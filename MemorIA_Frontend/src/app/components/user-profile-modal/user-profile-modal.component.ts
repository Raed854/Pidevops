import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile-modal.component.html',
  styleUrls: ['./user-profile-modal.component.css']
})
export class UserProfileModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() user: any = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() openLightbox = new EventEmitter<string>();

  // User info properties
  userName = '';
  userId = '';
  userRole = '';
  userEmail = '';
  isOnline = false;
  lastSeen = '';

  // Conversation stats
  isLoading = false;
  conversationId: string | null = null;
  totalMessagesInConv = 0;
  sharedMediaCount = 0;
  firstMessageDate = '';
  lastMessageDate = '';

  // Media & Tabs
  activeTab: 'info' | 'media' = 'info';
  mediaMessages: any[] = [];
  imageMedia: any[] = [];
  fileMedia: any[] = [];

  ngOnInit(): void {
    // Initialize if needed
  }

  close(): void {
    this.closeModal.emit();
  }

  onClose(): void {
    this.close();
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  onImageClick(imageUrl: string): void {
    this.openLightbox.emit(imageUrl);
  }

  getRoleLabel(): string {
    switch (this.userRole) {
      case 'SOIGNANT':
        return 'Soignant';
      case 'ACCOMPAGNANT':
        return 'Accompagnant';
      case 'PATIENT':
        return 'Patient';
      default:
        return this.userRole;
    }
  }

  openImage(imageUrl: string): void {
    this.openLightbox.emit(imageUrl);
  }

  getFileUrl(fileUrl: string): string {
    return fileUrl || '';
  }

  getFileName(msg: any): string {
    if (msg?.fileUrl) {
      return msg.fileUrl.split('/').pop() || 'Fichier';
    }
    return 'Fichier';
  }
}
