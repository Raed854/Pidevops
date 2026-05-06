import { Component, OnInit, OnDestroy, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConversationService } from '../../services/conversation.service';
import { MessageService } from '../../services/message.service';
import { Subscription, interval } from 'rxjs';
import { UserService } from '../../services/user.service';
import { PresenceService } from '../../services/presence.service';
import { AuthService } from '../../auth/auth.service';
import { UserProfileModalComponent } from '../../components/user-profile-modal/user-profile-modal.component';
import { GroupInfoModalComponent } from '../../components/group-info-modal/group-info-modal.component';
import { ImageLightboxModalComponent } from '../../components/image-lightbox-modal/image-lightbox-modal.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-messenger',
  standalone: true,
  imports: [CommonModule, FormsModule, UserProfileModalComponent, GroupInfoModalComponent, ImageLightboxModalComponent],
  templateUrl: './messenger.component.html',
  styleUrls: ['./messenger.component.css'],
  schemas: [NO_ERRORS_SCHEMA]
})
export class MessengerComponent implements OnInit, OnDestroy {

  communityFilesUrl = `${environment.communityApiUrl}/messages/files?path=`;
  conversations: any[] = [];
  selectedConversation: any = null;
  messages: any[] = [];
  newMessage = '';
  searchTerm = '';
  isLoading = true;
  currentUser: any;

  // Advanced features
  activeTab: 'all' | 'archived' | 'blocked' | 'caregivers' = 'all';
  archivedConversations: any[] = [];
  blockedConversations: any[] = [];
  caregivers: any[] = [];
  filteredCaregivers: any[] = [];
  isEditing = false;
  editingMessageId: number | null = null;
  showForwardModal = false;
  forwardMessageId: number | null = null;

  // Replying
  // Files
  pendingFile: any = null;
  replyToMessage: any = null;

  // Search and Filtering
  chatSearchTerm = '';
  showNewChatModal = false;
  newChatSearchTerm = '';
  newChatSearchResults: any[] = [];

  // Voice Recording
  isRecording = false;
  recordingTime = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimer: any;

  // Profile Modal
  showProfileModal = false;
  profileUser: any = null;

  // Presence tracking
  onlineUserIds: Set<number> = new Set();

  // Group Info Modal
  showGroupInfo = false;
  groupInfoConversation: any = null;

  private pollSubscription?: Subscription;

  constructor(
    private convService: ConversationService,
    private msgService: MessageService,
    private userService: UserService,
    private presenceService: PresenceService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) return;
    
    this.loadConversations();
    this.loadCaregivers();

    // Connect presence WebSocket
    if (this.currentUser?.id) {
      this.presenceService.connect(this.currentUser.id);
    }

    // Track online users
    this.presenceService.getOnlineUsers().subscribe(users => {
      this.onlineUserIds = users;
    });

    this.pollSubscription = interval(4000).subscribe(() => {
      if (this.activeTab === 'all') this.loadConversations();
      if (this.activeTab === 'archived') this.loadArchived();
      if (this.activeTab === 'blocked') this.loadBlocked();
      if (this.selectedConversation) {
        this.loadMessages(this.selectedConversation.id);
      }
    });
  }

  switchTab(tab: 'all' | 'archived' | 'blocked' | 'caregivers') {
    this.activeTab = tab;
    if (tab === 'archived') this.loadArchived();
    if (tab === 'blocked') this.loadBlocked();
    if (tab === 'caregivers') this.loadCaregivers();
  }

  loadArchived() {
    this.convService.findArchived(this.currentUser.id).subscribe(res => {
      this.archivedConversations = res;
    });
  }

  loadBlocked() {
    this.convService.findBlocked(this.currentUser.id).subscribe(res => {
      this.blockedConversations = res;
    });
  }

  unarchiveConversation(convId: number) {
    this.convService.unarchive(convId, this.currentUser.id).subscribe(() => {
      this.loadArchived();
      this.loadConversations();
    });
  }

  unblockConversation(convId: number) {
    this.convService.unblock(convId, this.currentUser.id).subscribe(() => {
      this.loadBlocked();
      this.loadConversations();
    });
  }

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
  }

  loadConversations() {
    this.convService.findForUser(this.currentUser.id).subscribe(res => {
      console.log('API Returned Conversations:', res);
      // Ensure it is an array
      if (Array.isArray(res)) {
          this.conversations = res.filter(c => c != null);
      } else {
          console.error("Format de réponse inattendu:", res);
          this.conversations = [];
      }
      this.isLoading = false;
    }, err => {
      console.error("Erreur loadConversations:", err);
      this.isLoading = false;
    });
  }

  loadCaregivers() {
    this.convService.findAllCaregivers().subscribe(res => {
      this.caregivers = res.filter((u: any) => u.id !== this.currentUser.id);
      this.filteredCaregivers = this.caregivers;
    });
  }

  selectConversation(conv: any) {
    this.selectedConversation = conv;
    this.loadMessages(conv.id);
  }

  loadMessages(convId: number) {
    this.msgService.getByConversation(convId).subscribe(res => {
      if (this.messages.length !== res.length || 
         (this.messages.length > 0 && res.length > 0 && this.messages[this.messages.length - 1].id !== res[res.length - 1].id)) {
          this.messages = res;
      } else {
          this.messages = res;
      }
    });
  }

  trackByMessageId(index: number, msg: any): number {
      return msg.id;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.msgService.uploadFile(file).subscribe(res => {
      this.pendingFile = res;
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() && !this.pendingFile) return;

    if (this.isEditing && this.editingMessageId && !this.pendingFile) {
      this.msgService.update(this.editingMessageId, this.currentUser.id, this.newMessage).subscribe(() => {
        this.cancelEdit();
        if (this.selectedConversation) {
          this.loadMessages(this.selectedConversation.id);
        }
      });
      return;
    }

    const convId = this.selectedConversation.id;
    const payload: any = {
      content: this.newMessage,
      tags: this.extractTags(this.newMessage),
      replyToMessageId: this.replyToMessage?.id
    };

    if (this.pendingFile) {
      payload.fileUrl = this.pendingFile.fileUrl;
      payload.fileType = this.pendingFile.fileType;
      if (!payload.content) payload.content = this.pendingFile.fileName;
    }

    this.msgService.send(this.currentUser.id, convId, payload).subscribe(() => {
      this.newMessage = '';
      this.pendingFile = null;
      this.replyToMessage = null;
      this.loadMessages(convId);
    });
  }

  replyMessage(msg: any) {
    this.replyToMessage = msg;
    const input = document.getElementById('message-input');
    if (input) input.focus();
  }

  cancelReply() {
    this.replyToMessage = null;
  }

  blockUser(conv: any) {
    const other = conv.participants.find((p: any) => p.id !== this.currentUser.id);
    if (other && other.role === 'DOCTOR') {
      alert("Vous ne pouvez pas bloquer le médecin.");
      return;
    }
    if (confirm(`Bloquer ${this.getOtherParticipantName(conv)} ?`)) {
      this.convService.block(conv.id, this.currentUser.id).subscribe(() => {
        alert("Utilisateur bloqué.");
        this.loadConversations();
        this.selectedConversation = null;
      });
    }
  }

  unblockUser(conv: any) {
    this.convService.unblock(conv.id, this.currentUser.id).subscribe(() => {
      alert("Utilisateur débloqué.");
      this.loadConversations();
    });
  }

  private extractTags(text: string): string {
    const tags = text.match(/#\w+/g);
    return tags ? tags.join(',') : '';
  }

  editMessage(msg: any) {
    this.isEditing = true;
    this.editingMessageId = msg.id;
    this.newMessage = msg.content;
  }

  cancelEdit() {
    this.isEditing = false;
    this.editingMessageId = null;
    this.newMessage = '';
  }

  deleteMessage(msgId: number) {
    if (confirm("Voulez-vous supprimer ce message ?")) {
      this.msgService.delete(msgId, this.currentUser.id).subscribe(() => {
        this.messages = this.messages.filter(m => m.id !== msgId);
      });
    }
  }

  requestTranscription(msgId: number) {
      this.msgService.transcribe(msgId).subscribe(updatedMsg => {
          const index = this.messages.findIndex(m => m.id === msgId);
          if (index !== -1) {
              this.messages[index] = updatedMsg;
          }
      }, err => {
          console.error("Transcription failed", err);
          if (err.status === 500 || err.status === 0) {
              alert("Service de transcription temporairement indisponible. Veuillez réessayer plus tard.");
          } else if (err.status === 401 || err.status === 403) {
              alert("Erreur d'authentification du service de transcription.");
          } else {
              alert("Erreur lors de la transcription. Veuillez réessayer.");
          }
      });
  }

  openForward(msgId: number) {
    this.forwardMessageId = msgId;
    this.showForwardModal = true;
  }

  forwardTo(convId: number) {
    if (this.forwardMessageId) {
      this.msgService.forward(this.currentUser.id, this.forwardMessageId, convId).subscribe(() => {
        this.showForwardModal = false;
        this.forwardMessageId = null;
        alert("Message transféré avec succès !");
      });
    }
  }

  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.msgService.uploadFile(file).subscribe(res => {
      const payload = {
        content: `Fichier : ${res.fileName}`,
        fileUrl: res.fileUrl,
        fileType: res.fileType,
        tags: 'attachment'
      };
      this.msgService.send(this.currentUser.id, this.selectedConversation.id, payload).subscribe(() => {
        this.loadMessages(this.selectedConversation.id);
      });
    });
  }

  speakMessage(text: string) {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  logout() {
    this.authService.logout();
  }

  archiveConversation(conv: any) {
    this.convService.archive(conv.id, this.currentUser.id).subscribe(() => {
      this.loadConversations();
      this.selectedConversation = null;
    });
  }

  downloadFile(path: string) {
    window.open(`${environment.communityApiUrl}/messages/files?path=${path}`, '_blank');
  }

  deleteConversationById(convId: number) {
    if (confirm("Supprimer cette discussion ?")) {
      this.convService.delete(convId, this.currentUser.id).subscribe(() => {
        this.loadConversations();
        this.selectedConversation = null;
      });
    }
  }

  leaveGroup(conv: any) {
    if (confirm("Quitter ce groupe ?")) {
      this.convService.leave(conv.community.id, this.currentUser.id).subscribe(() => {
        this.loadConversations();
        this.selectedConversation = null;
      });
    }
  }

  startPrivateChat(caregiver: any) {
    this.convService.startPrivate(this.currentUser.id, caregiver.id).subscribe(res => {
      this.loadConversations();
      this.selectConversation(res);
    });
  }

  getOtherParticipantName(conv: any): string {
    if (!conv) return 'Inconnu';
    if (conv.type === 'GROUP') {
        return conv.community?.name || 'Groupe sans nom';
    }
    const other = conv.participants?.find((p: any) => p.id != this.currentUser.id);
    return other ? `${other.firstName || ''} ${other.lastName || ''}`.trim() || 'Utilisateur' : 'Utilisateur';
  }

  getOtherParticipantRole(conv: any) {
    if (conv.type === 'GROUP') return 'GROUP';
    const other = conv.participants.find((p: any) => p.id !== this.currentUser.id);
    return other ? other.role : 'UNKNOWN';
  }

  get filteredConversations() {
    if (!this.searchTerm) return this.conversations;
    return this.conversations.filter(c =>
      this.getOtherParticipantName(c).toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  get filteredMessages() {
    if (!this.chatSearchTerm.trim()) return this.messages;
    const low = this.chatSearchTerm.toLowerCase();
    return this.messages.filter(m =>
      m.content.toLowerCase().includes(low) ||
      (m.sender.firstName + ' ' + m.sender.lastName).toLowerCase().includes(low)
    );
  }

  searchNewChatUsers() {
    if (this.newChatSearchTerm.length < 2) {
      this.newChatSearchResults = [];
      return;
    }
    this.userService.search(this.newChatSearchTerm).subscribe(res => {
      this.newChatSearchResults = res.filter(u => u.id !== this.currentUser.id);
    });
  }

  startNewChat(user: any) {
    this.convService.startPrivate(this.currentUser.id, user.id).subscribe(res => {
      this.showNewChatModal = false;
      this.loadConversations();
      this.selectConversation(res);
    });
  }

  // Custom Audio Player State
  playingAudioId: number | null = null;
  audioProgressMap: { [key: number]: number } = {};
  audioTimeMap: { [key: number]: string } = {};
  
  // Fake waveform from 10% to 100% heights
  fakeWaveformHeights = [30, 50, 40, 70, 90, 60, 40, 80, 100, 70, 50, 40, 60, 80, 50, 30, 40, 60, 40, 20];

  togglePlay(audioElement: HTMLAudioElement, msgId: number) {
      if (this.playingAudioId && this.playingAudioId !== msgId) {
          const prevAudio = document.getElementById('audio-' + this.playingAudioId) as HTMLAudioElement;
          if (prevAudio) { prevAudio.pause(); prevAudio.currentTime = 0; }
      }
      
      if (audioElement.paused) {
          this.playingAudioId = msgId;
          audioElement.play();
      } else {
          audioElement.pause();
          this.playingAudioId = null;
      }
  }

  updateTime(event: any, msgId: number) {
      const audio = event.target;
      if (audio.duration) {
          const progress = (audio.currentTime / audio.duration) * 100;
          this.audioProgressMap[msgId] = progress;
          this.audioTimeMap[msgId] = this.formatAudioTime(audio.currentTime) + ' / ' + this.formatAudioTime(audio.duration);
      }
  }

  onAudioLoaded(event: any, msgId: number) {
      const audio = event.target;
      if (audio.duration && !this.audioTimeMap[msgId]) {
          this.audioTimeMap[msgId] = '0:00 / ' + this.formatAudioTime(audio.duration);
      }
  }

  audioEnded(msgId: number) {
      this.playingAudioId = null;
      this.audioProgressMap[msgId] = 0;
      const audio = document.getElementById('audio-' + msgId) as HTMLAudioElement;
      if (audio && audio.duration) {
           this.audioTimeMap[msgId] = '0:00 / ' + this.formatAudioTime(audio.duration);
      } else {
           this.audioTimeMap[msgId] = '0:00';
      }
  }

  seekAudio(event: MouseEvent, audioElement: HTMLAudioElement) {
      const progressBar = event.currentTarget as HTMLElement;
      const rect = progressBar.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const width = rect.width;
      const percentage = clickX / width;
      
      if (audioElement.duration && isFinite(audioElement.duration)) {
          audioElement.currentTime = percentage * audioElement.duration;
      }
  }

  formatAudioTime(seconds: number): string {
      if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
      const min = Math.floor(seconds / 60);
      const sec = Math.floor(seconds % 60);
      return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  }

  // Voice Recording Methods
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.isRecording = true;
        this.recordingTime = 0;
        this.recordingTimer = setInterval(() => {
          this.recordingTime++;
        }, 1000);
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        clearInterval(this.recordingTimer);
        stream.getTracks().forEach(track => track.stop());

        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          const file = new File([audioBlob], `voicemessage_${Date.now()}.webm`, { type: 'audio/webm' });
          
          this.msgService.uploadFile(file).subscribe(res => {
            this.pendingFile = res;
            this.sendMessage();
          });
        }
      };

      this.mediaRecorder.start();
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      alert("Veuillez autoriser l'accès au microphone pour envoyer un message vocal.");
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
  }

  cancelRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.audioChunks = []; // Clear chunks so onstop doesn't save it
      this.mediaRecorder.stop();
      this.isRecording = false;
      clearInterval(this.recordingTimer);
    }
  }

  openUserProfile(user: any) {
    this.profileUser = user;
    this.showProfileModal = true;
  }

  closeUserProfile() {
    this.showProfileModal = false;
    this.profileUser = null;
  }

  openHeaderProfile(conv: any) {
    if (!conv) return;
    if (conv.type === 'GROUP') {
      this.groupInfoConversation = conv;
      this.showGroupInfo = true;
      return;
    }
    const other = conv.participants?.find((p: any) => p.id !== this.currentUser.id);
    if (other) {
      this.openUserProfile(other);
    }
  }

  closeGroupInfo() {
    this.showGroupInfo = false;
    this.groupInfoConversation = null;
  }

  onGroupMemberClick(member: any) {
    this.closeGroupInfo();
    this.openUserProfile(member);
  }

  isOtherUserOnline(conv: any): boolean {
    if (!conv || conv.type === 'GROUP') return false;
    const other = conv.participants?.find((p: any) => p.id !== this.currentUser.id);
    return other ? this.onlineUserIds.has(other.id) : false;
  }

  lightboxImageUrl: string | null = null;

  openImageFullscreen(url: any) {
    if (typeof url === 'string') {
      this.lightboxImageUrl = url;
    }
  }

  closeLightbox() {
    this.lightboxImageUrl = null;
  }
}
