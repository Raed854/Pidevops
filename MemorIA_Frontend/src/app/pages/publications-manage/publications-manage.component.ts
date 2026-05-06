import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PublicationService } from '../../services/publication.service';
import { AuthService } from '../../auth/auth.service';
import { Publication, PublicationType } from '../../models/publication.model';
import { SidebarDiagnosticComponent } from '../../components/sidebar_diagnostic/sidebar_diagnostic.component';
import { SafeMapPipe } from '../../pipes/safe-map.pipe';
import { ModerationService } from '../../services/moderation.service';
import { Comment } from '../../models/comment.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-publications-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarDiagnosticComponent, SafeMapPipe],
  templateUrl: './publications-manage.component.html',
  styleUrls: ['./publications-manage.component.css']
})
export class PublicationsManageComponent implements OnInit {
  publications: Publication[] = [];
  currentPublication: Publication = {
    title: '',
    content: '',
    type: PublicationType.INFORMATION,
    mediaUrl: '',
    eventLink: '',
    eventAddress: ''
  };
  isEditing = false;
  publicationTypes = Object.values(PublicationType);
  doctorId: number | undefined;
  doctorName = '';

  useUrl = false;
  selectedFile: File | null = null;
  selectedFileType: 'image' | 'video' | 'file' | 'url' | null = null;
  isUploading = false;
  searchTerm = '';
  filterType = '';
  sortBy = 'newest';
  pendingComments: Comment[] = [];
  selectedFilePreview: string | null = null;

  activeModFilter: 'all' | 'critical' | 'warning' = 'all';
  currentWorkspace: 'registry' | 'composer' | 'moderation' = 'registry';

  constructor(
    private publicationService: PublicationService,
    private authService: AuthService,
    private moderationService: ModerationService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.doctorId = user?.id;
    this.doctorName = user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : 'Dr. Soignant';
    this.loadPublications();
    this.loadPendingComments();
  }

  loadPublications(): void {
    if (this.doctorId) {
      this.publicationService.getDoctorPublications(this.doctorId).subscribe(data => {
        this.publications = data;
      });
    }
  }

  get filteredPublications(): Publication[] {
    let filtered = [...this.publications];

    // 1. Keyword search
    if (this.searchTerm.trim()) {
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.content?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // 2. Type filter
    if (this.filterType) {
      filtered = filtered.filter(p => p.type === this.filterType);
    }

    // 3. Sorting
    filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return this.sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }

  isImage(url: string | undefined): boolean {
    if (!url) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  }

  getMediaUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // Using the same endpoint as the feed for consistency and reliability
    return `${environment.communityApiUrl}/messages/files?path=${url}`;
  }

  isVideo(url: string | undefined): boolean {
    if (!url) return false;
    return /\.(mp4|webm|ogg)$/i.test(url);
  }

  isDocument(url: string | undefined): boolean {
    if (!url) return false;
    return /\.(pdf|doc|docx)$/i.test(url);
  }

  onFileSelected(event: any, type: 'image' | 'video' | 'file') {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      this.selectedFile = file;
      this.selectedFileType = type;

      if (type === 'image') {
        const reader = new FileReader();
        reader.onload = () => {
          this.selectedFilePreview = reader.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        this.selectedFilePreview = null;
      }
    }
  }

  savePublication(): void {
    if (!this.currentPublication.title || !this.currentPublication.content) return;

    if (this.selectedFile) {
      this.isUploading = true;
      this.publicationService.uploadMedia(this.selectedFile).subscribe({
        next: (res) => {
          this.currentPublication.mediaUrl = res.mediaUrl;
          this.currentPublication.mediaType = res.mediaType;
          this.currentPublication.fileName = res.fileName;
          this.submitPublication();
        },
        error: (err) => {
          this.isUploading = false;
          console.error("Erreur d'upload", err);
          alert("Échec du téléchargement du fichier.");
        }
      });
    } else {
      this.submitPublication();
    }
  }

  submitPublication(): void {
    if (this.isEditing && this.currentPublication.id) {
      this.publicationService.updatePublication(this.currentPublication.id, this.currentPublication).subscribe({
        next: () => {
          this.loadPublications();
          this.resetForm();
        },
        error: (err) => {
          this.isUploading = false;
          console.error('Update error', err);
          alert("Erreur lors de la mise à jour de la publication.");
        }
      });
    } else {
      this.currentPublication.doctorId = this.doctorId;
      this.currentPublication.doctorName = this.doctorName;
      this.publicationService.createPublication(this.currentPublication).subscribe({
        next: () => {
          this.loadPublications();
          this.resetForm();
        },
        error: (err) => {
          this.isUploading = false;
          console.error('Create error', err);
          alert("Erreur lors de la création de la publication.");
        }
      });
    }
  }

  editPublication(publication: Publication): void {
    this.currentPublication = { ...publication };
    this.isEditing = true;
    this.selectedFilePreview = publication.mediaUrl ? this.getMediaUrl(publication.mediaUrl) : null;
    if (this.selectedFilePreview && !this.isImage(publication.mediaUrl)) {
      this.selectedFilePreview = null;
    }
  }

  deletePublication(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette publication ?')) {
      this.publicationService.deletePublication(id).subscribe(() => {
        this.loadPublications();
      });
    }
  }

  resetForm(): void {
    this.currentPublication = {
      title: '',
      content: '',
      type: PublicationType.INFORMATION,
      mediaUrl: '',
      mediaType: '',
      fileName: '',
      eventLink: '',
      eventAddress: ''
    };
    this.isEditing = false;
    this.selectedFile = null;
    this.selectedFileType = null;
    this.selectedFilePreview = null;
    this.isUploading = false;
    this.useUrl = false;
  }

  // --- MODERATION LOGIC ---

  loadPendingComments(): void {
    this.moderationService.getPendingComments().subscribe({
      next: (data) => this.pendingComments = data,
      error: (err) => console.error('Error loading pending comments:', err)
    });
  }

  approveComment(id: number): void {
    this.moderationService.approveComment(id).subscribe({
      next: () => {
        this.pendingComments = this.pendingComments.filter(c => c.id !== id);
      },
      error: (err) => alert('Erreur lors de l\'approbation')
    });
  }

  rejectComment(id: number): void {
    if(confirm('Êtes-vous sûr de vouloir supprimer définitivement ce commentaire ?')) {
      this.moderationService.rejectComment(id).subscribe({
        next: () => {
          this.pendingComments = this.pendingComments.filter(c => c.id !== id);
        },
        error: (err) => alert('Erreur lors du rejet')
      });
    }
  }

  get filteredModerationFeed(): Comment[] {
    let feed = [...this.pendingComments];
    
    // Sort by severity (highest first) then by ID (implied newest)
    feed.sort((a, b) => {
      if ((b.violationSeverity || 0) !== (a.violationSeverity || 0)) {
        return (b.violationSeverity || 0) - (a.violationSeverity || 0);
      }
      return (b.id || 0) - (a.id || 0);
    });

    if (this.activeModFilter === 'critical') {
      return feed.filter(c => c.violationSeverity === 2);
    }
    if (this.activeModFilter === 'warning') {
      return feed.filter(c => c.violationSeverity === 1);
    }
    return feed;
  }

  getModStats() {
    return {
      total: this.pendingComments.length,
      critical: this.pendingComments.filter(c => c.violationSeverity === 2).length,
      warning: this.pendingComments.filter(c => c.violationSeverity === 1).length
    };
  }

  onImportBadWords(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.moderationService.importBadWordsExcel(file).subscribe({
        next: () => {
          alert('Fichier Excel importé avec succès. Les mots interdits ont été mis à jour.');
          input.value = ''; // reset
        },
        error: (err) => {
          console.error(err);
          alert('Erreur: Vérifiez le format de votre fichier Excel.');
          input.value = '';
        }
      });
    }
  }
}
