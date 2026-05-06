import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PublicationService } from '../../services/publication.service';
import { CommentService } from '../../services/comment.service';
import { AuthService } from '../../auth/auth.service';
import { ReactionService } from '../../services/reaction.service';
import { Publication, PublicationType } from '../../models/publication.model';
import { Comment } from '../../models/comment.model';
import { AuthUser } from '../../auth/auth.model';
import { RatingService } from '../../services/rating.service';
import { environment } from '../../../environments/environment';

export enum AppReactionType {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  HAHA = 'HAHA',
  WOW = 'WOW',
  SAD = 'SAD',
  ANGRY = 'ANGRY'
}

import { SafeMapPipe } from '../../pipes/safe-map.pipe';

@Component({
  selector: 'app-publications-feed',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SafeMapPipe],
  templateUrl: './publications-feed.component.html',
  styleUrls: ['./publications-feed.component.css']
})
export class PublicationsFeedComponent implements OnInit {
  communityFilesUrl = `${environment.communityApiUrl}/messages/files?path=`;
  publications: Publication[] = [];
  currentUser: AuthUser | null = null;
  
  pubComments: { [pubId: number]: Comment[] } = {};
  newCommentContent: { [pubId: number]: string } = {};
  showAllComments: { [pubId: number]: boolean } = {};
  isLoading: { [pubId: number]: boolean } = {};
  savedPublications: Publication[] = [];
  searchTerm = '';
  filterType = '';
  sortBy = 'newest';
  publicationTypes = Object.values(PublicationType);

  protected readonly ReactionType = AppReactionType;
  private pickerTimers = new Map<any, any>();

  constructor(
    private publicationService: PublicationService,
    private commentService: CommentService,
    private authService: AuthService,
    private reactionService: ReactionService,
    private ratingService: RatingService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  // Pipe is used for map urls in template now

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadAllPublications();
    this.loadSavedFromStorage();
  }

  loadAllPublications(): void {
    this.publicationService.getAllPublications().subscribe({
      next: (data) => {
        this.publications = data;
        this.publications.forEach(p => {
          if (p.id) {
            this.loadComments(p.id);
            this.loadPubStats(p);
            this.loadRatingStats(p);
            this.newCommentContent[p.id] = '';
            this.showAllComments[p.id] = false;
          }
        });
      },
      error: (err) => console.error("API error:", err)
    });
  }

  get filteredPublications(): Publication[] {
    let filtered = [...this.publications];

    // 1. Keyword search
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.title?.toLowerCase().includes(term) ||
        p.content?.toLowerCase().includes(term) ||
        p.doctorName?.toLowerCase().includes(term)
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

  // --- RATING ACTIONS ---
  
  loadRatingStats(pub: Publication): void {
     if (!pub.id) return;
     const userId = this.currentUser ? this.currentUser.id : undefined;
     this.ratingService.getPubRatingStats(pub.id, userId).subscribe({
       next: (stats) => {
         pub.averageRating = stats.average;
         pub.ratingCount = stats.count;
         pub.myRating = stats.myRating;
       },
       error: (err) => console.error("Error loading ratings", err)
     });
  }

  onRatePub(pub: Publication, value: number): void {
     if (!this.currentUser || !pub.id) {
       this.router.navigate(['/login'], { state: { returnUrl: '/publications-feed' } });
       return;
     }

     pub.myRating = value; // Optimistic logic

     this.ratingService.ratePublication(pub.id, this.currentUser.id, value).subscribe({
       next: () => {
          this.loadRatingStats(pub); // Reload true average from server
       },
       error: (err) => {
          alert("Erreur lors de l'envoi de votre note.");
       }
     });
  }

  // --- REACTION ACTIONS (With Optimistic Updates) ---

  onReactPub(pub: Publication, type: string): void {
    if (!this.currentUser || !pub.id) {
      this.router.navigate(['/login'], { state: { returnUrl: '/publications-feed' } });
      return;
    }
    
    // OPTIMISTIC UPDATE: Instant feedback for user
    const oldReaction = pub.myReaction;
    const oldCount = pub.reactionCount || 0;

    if (oldReaction === type) {
       pub.myReaction = undefined;
       pub.reactionCount = Math.max(0, oldCount - 1);
    } else {
       pub.myReaction = type;
       pub.reactionCount = oldReaction ? oldCount : oldCount + 1;
    }

    this.reactionService.reactToPublication(pub.id, this.currentUser.id, type).subscribe({
      next: () => {
         this.loadPubStats(pub); // Sync with actual server data
         pub.showReactionPicker = false;
      },
      error: (err) => {
         console.error("DEBUG REACTION PUB ERROR:", err);
         const msg = err.error?.error || err.message || "Erreur inconnue";
         alert(`Désolé, la réaction n'a pas pu être enregistrée.\nErreur: ${msg}`);
         // Rollback on error
         pub.myReaction = oldReaction;
         pub.reactionCount = oldCount;
      }
    });
  }

  onReactComment(pubId: number, comment: Comment, type: string): void {
    if (!this.currentUser || !comment.id) {
      this.router.navigate(['/login'], { state: { returnUrl: '/publications-feed' } });
      return;
    }

    const oldReact = comment.myReaction;
    const oldCount = comment.reactionCount || 0;

    if (oldReact === type) {
       comment.myReaction = undefined;
       comment.reactionCount = Math.max(0, oldCount - 1);
    } else {
       comment.myReaction = type;
       comment.reactionCount = oldReact ? oldCount : oldCount + 1;
    }

    this.reactionService.reactToComment(comment.id, this.currentUser.id, type).subscribe({
      next: () => {
         this.loadCommentStats(comment);
         comment.showReactionPicker = false;
      },
      error: (err) => {
         console.error("DEBUG REACTION COMMENT ERROR:", err);
         const msg = err.error?.error || err.message || "Erreur inconnue";
         alert(`Erreur commentaire: ${msg}`);
         comment.myReaction = oldReact;
         comment.reactionCount = oldCount;
      }
    });
  }

  // --- STATS LOGIC ---

  loadPubStats(pub: Publication): void {
    if (!pub.id) return;
    this.reactionService.getPubCount(pub.id).subscribe(res => pub.reactionCount = res.count);
    if (this.currentUser) {
       this.reactionService.getUserPubReaction(pub.id, this.currentUser.id).subscribe(res => {
          pub.myReaction = res.reaction === "" ? undefined : res.reaction;
       });
    }
  }

  loadCommentStats(comment: Comment): void {
    if (!comment.id) return;
    this.reactionService.getCommentCount(comment.id).subscribe(res => comment.reactionCount = res.count);
    if (this.currentUser) {
       this.reactionService.getUserCommentReaction(comment.id, this.currentUser.id).subscribe(res => {
          comment.myReaction = res.reaction === "" ? undefined : res.reaction;
       });
    }
  }

  // --- UI HOVER LOGIC ---

  showPicker(item: any): void {
     if (this.pickerTimers.has(item)) clearTimeout(this.pickerTimers.get(item));
     item.showReactionPicker = true;
  }

  hidePicker(item: any): void {
     const timer = setTimeout(() => {
        item.showReactionPicker = false;
     }, 400);
     this.pickerTimers.set(item, timer);
  }

  getReactionLabel(type: string | undefined): string {
    if (!type) return 'J\'aime';
    switch (type) {
      case 'LIKE': return 'J\'aime';
      case 'LOVE': return 'Adore';
      case 'HAHA': return 'Haha';
      case 'WOW': return 'Wouah';
      case 'SAD': return 'Triste';
      case 'ANGRY': return 'Grrr';
      default: return 'J\'aime';
    }
  }

  getReactionClass(type: string | undefined): string {
    if (!type) return '';
    return type.toLowerCase();
  }

  // --- COMMENTS SYNC ---

  loadComments(pubId: number): void {
    this.isLoading[pubId] = true;
    this.commentService.getComments(pubId).subscribe({
      next: (data) => {
        const oldState = this.pubComments[pubId] || [];
        this.syncRecursive(data, oldState);
        this.pubComments[pubId] = data;
        this.isLoading[pubId] = false;
      },
      error: () => this.isLoading[pubId] = false
    });
  }

  private syncRecursive(comments: Comment[], oldState: Comment[]): void {
    comments.forEach(nc => {
      const old = oldState.find(o => o.id === nc.id);
      if (old) {
        nc.showReplies = old.showReplies;
        nc.showReplyInput = old.showReplyInput;
        nc.isEditing = old.isEditing;
      }
      this.loadCommentStats(nc);
      if (nc.replies) this.syncRecursive(nc.replies, old ? old.replies || [] : []);
    });
  }

  // --- CRUD WRAPPERS ---

  addComment(pubId: number): void {
    const text = this.newCommentContent[pubId];
    if (!text || !this.currentUser) return;
    const author = (this.currentUser.prenom && this.currentUser.nom) 
                 ? `${this.currentUser.prenom} ${this.currentUser.nom}`
                 : this.currentUser.email.split('@')[0];
    this.commentService.createComment(pubId, { content: text, authorName: author, authorId: this.currentUser.id }).subscribe({
      next: () => {
        this.newCommentContent[pubId] = '';
        this.showAllComments[pubId] = true;
        this.loadComments(pubId);
      },
      error: (err) => {
        if (err.error?.error?.includes('BLOCKED_BAD_WORD') || err.message?.includes('BLOCKED_BAD_WORD')) {
          alert('🚨 ALERTE : Votre commentaire contient des termes extrêmement choquants et a été bloqué par notre système de modération.');
        } else {
          console.error(err);
          alert('Une erreur est survenue lors de l\'envoi de votre commentaire.');
        }
      }
    });
  }

  addReply(pubId: number, p: Comment): void {
    const text = p.newReplyContent;
    if (!text || !this.currentUser || !p.id) return;
    const author = (this.currentUser.prenom && this.currentUser.nom) 
                 ? `${this.currentUser.prenom} ${this.currentUser.nom}`
                 : this.currentUser.email.split('@')[0];
    this.commentService.createComment(pubId, { content: text, authorName: author, authorId: this.currentUser.id }, p.id).subscribe({
      next: () => {
        p.newReplyContent = '';
        p.showReplyInput = false;
        p.showReplies = true;
        this.loadComments(pubId);
      },
      error: (err) => {
        if (err.error?.error?.includes('BLOCKED_BAD_WORD') || err.message?.includes('BLOCKED_BAD_WORD')) {
          alert('🚨 ALERTE : Votre réponse contient des termes extrêmement choquants et a été bloquée.');
        } else {
          console.error(err);
          alert('Une erreur est survenue lors de l\'envoi de votre réponse.');
        }
      }
    });
  }

  onUpdateComment(pubId: number, c: Comment): void {
    if (!c.id || !c.content) return;
    this.commentService.updateComment(c.id, { content: c.content }).subscribe(() => {
      c.isEditing = false;
      this.loadComments(pubId);
    });
  }

  deleteComment(pubId: number, cid: number): void {
    if (confirm("Supprimer ?")) this.commentService.deleteComment(cid).subscribe(() => this.loadComments(pubId));
  }

  getVisibleComments(pubId: number): Comment[] {
    const c = this.pubComments[pubId] || [];
    return this.showAllComments[pubId] ? c : c.slice(0, 2);
  }

  toggleComments(pubId: number): void { this.showAllComments[pubId] = !this.showAllComments[pubId]; }
  editComment(c: Comment): void { c.isEditing = true; }
  trackById(i: number, item: any): number { return item.id; }
  onCommentClick(pid: number): void {
    if (!this.currentUser) this.router.navigate(['/login'], { state: { returnUrl: '/publications-feed' } });
    else this.showAllComments[pid] = true;
  }

  // --- SAVED PUBLICATIONS LOGIC ---
  private getSavedKey(): string {
    if (this.currentUser) return `saved_publications_${this.currentUser.id}`;
    return 'saved_publications_guest';
  }

  savePublication(pub: Publication): void {
    if (!this.savedPublications.find(p => p.id === pub.id)) {
      this.savedPublications.push(pub);
      this.saveToStorage();
    }
  }

  removeSavedPublication(pubId: number): void {
    this.savedPublications = this.savedPublications.filter(p => p.id !== pubId);
    this.saveToStorage();
  }

  private saveToStorage(): void {
    localStorage.setItem(this.getSavedKey(), JSON.stringify(this.savedPublications));
  }

  private loadSavedFromStorage(): void {
    const saved = localStorage.getItem(this.getSavedKey());
    if (saved) {
      try {
        this.savedPublications = JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved publications", e);
        this.savedPublications = [];
      }
    } else {
      this.savedPublications = [];
    }
  }
}
