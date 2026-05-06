import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-image-lightbox-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-lightbox-modal.component.html',
  styleUrls: ['./image-lightbox-modal.component.css']
})
export class ImageLightboxModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() imageUrl: string = '';
  @Input() images: string[] = [];
  @Output() closeModal = new EventEmitter<void>();

  currentImageIndex = 0;

  ngOnInit(): void {
    if (this.imageUrl && !this.images.includes(this.imageUrl)) {
      this.images = [this.imageUrl, ...this.images];
    }
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

  downloadImage(): void {
    if (this.images[this.currentImageIndex]) {
      const link = document.createElement('a');
      link.href = this.images[this.currentImageIndex];
      link.download = `image-${this.currentImageIndex + 1}.jpg`;
      link.click();
    }
  }

  previousImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    }
  }

  nextImage(): void {
    if (this.currentImageIndex < this.images.length - 1) {
      this.currentImageIndex++;
    }
  }
}
