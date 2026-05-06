import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-group-info-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-info-modal.component.html',
  styleUrls: ['./group-info-modal.component.css']
})
export class GroupInfoModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() group: any = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() openLightbox = new EventEmitter<string>();

  // Group info properties
  groupName = '';
  groupDescription = '';
  groupTags = '';
  createdBy = '';
  createdAt = '';

  // Members & Tabs
  activeTab: 'members' | 'media' = 'members';
  members: any[] = [];

  // Media properties
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

  onMemberClick(member: any): void {
    // Handle member click if needed
  }

  getMemberName(member: any): string {
    return member?.name || member?.firstName + ' ' + member?.lastName || 'Utilisateur';
  }

  isMemberOnline(memberId: string): boolean {
    // Check if member is online - implement based on your logic
    return false;
  }

  getRoleLabel(role?: string): string {
    const roleType = role || '';
    switch (roleType) {
      case 'SOIGNANT':
        return 'Soignant';
      case 'ACCOMPAGNANT':
        return 'Accompagnant';
      case 'PATIENT':
        return 'Patient';
      default:
        return roleType;
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
