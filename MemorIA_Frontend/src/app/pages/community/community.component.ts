import { Component, OnInit, OnDestroy, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunityService } from '../../services/community.service';
import { StatsService } from '../../services/stats.service';
import { MessageService } from '../../services/message.service';
import { ConversationService } from '../../services/conversation.service';
import { UserService } from '../../services/user.service';
import { PresenceService } from '../../services/presence.service';
import { UserProfileModalComponent } from '../../components/user-profile-modal/user-profile-modal.component';
import { GroupInfoModalComponent } from '../../components/group-info-modal/group-info-modal.component';
import { ImageLightboxModalComponent } from '../../components/image-lightbox-modal/image-lightbox-modal.component';
import { AuthService } from '../../auth/auth.service';
import { interval, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-community',
    standalone: true,
    imports: [CommonModule, FormsModule, UserProfileModalComponent, GroupInfoModalComponent, ImageLightboxModalComponent],
    templateUrl: './community.component.html',
    styleUrls: ['./community.component.css'],
    schemas: [NO_ERRORS_SCHEMA]
})
export class CommunityComponent implements OnInit, OnDestroy {

    communityFilesUrl = `${environment.communityApiUrl}/messages/files?path=`;
    // Stats
    stats: any = { totalGroups: 0, totalUsers: 0, activeGroups: 0, totalMessages: 0 };

    // Groups
    groups: any[] = [];
    selectedGroup: any = null;
    isLoading = true;
    searchTerm = '';

    // Messaging
    messages: any[] = [];
    newMessage = '';
    currentUser: any;

    // Modals
    showCreateModal = false;
    showMemberModal = false;
    showBlockedModal = false;

    newGroup = { name: '', description: '', tags: '' };

    // Messaging Advanced
    isEditing = false;
    editingMessageId: number | null = null;
    unreadConversations: any[] = [];

    // Member Management
    searchMemberTerm = '';
    userSearchResults: any[] = [];
    blockedConversations: any[] = [];
    isEditingGroup = false;
    editingGroupData: any = null;
    selectedMembersForNewGroup: any[] = [];
    editingMemberTerm = '';
    editingMemberResults: any[] = [];
    editGroupName = '';


    // Unified State
    activeView: 'groups' | 'caregivers' | 'archived' | 'blocked' = 'groups';
    caregivers: any[] = [];
    allUsers: any[] = [];
    archivedConversations: any[] = [];

    // Filtering
    filterBy: 'all' | 'recent' | 'active' = 'all';

    // Forwarding
    showForwardModal = false;
    forwardMessageId: number | null = null;
    forwardSearchTerm = '';

    // Replying
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

    // Image Lightbox
    lightboxImageUrl: string | null = null;

    private pollSub?: Subscription;

    constructor(
        private communityService: CommunityService,
        private statsService: StatsService,
        private messageService: MessageService,
        private conversationService: ConversationService,
        private userService: UserService,
        private presenceService: PresenceService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.currentUser = this.authService.getCurrentUser();
        if (!this.currentUser) return;
        this.loadInitialData();

        // Connect presence WebSocket
        if (this.currentUser?.id) {
            this.presenceService.connect(this.currentUser.id);
        }

        // Track online users
        this.presenceService.getOnlineUsers().subscribe(users => {
            this.onlineUserIds = users;
        });

        this.pollSub = interval(5000).subscribe(() => {
            if (this.activeView === 'groups') {
                this.refreshStats();
                if (this.selectedGroup) {
                    this.loadMessages(this.selectedGroup.id);
                }
            }
        });
    }

    ngOnDestroy(): void {
        this.pollSub?.unsubscribe();
        this.presenceService.disconnect();
    }

    loadInitialData() {
        this.isLoading = true;
        if (!this.currentUser || !this.currentUser.id) return;
        this.conversationService.findForUser(this.currentUser.id).subscribe(res => {
            console.log('Community API Returned Conversations:', res);
            if (Array.isArray(res)) {
                this.groups = res.filter(c => c != null);
                this.unreadConversations = [...this.groups]; // Copy to avoid mutation on splice
            } else {
                this.groups = [];
            }
            this.isLoading = false;
        }, err => {
            console.error("Erreur loadInitialData:", err);
            this.isLoading = false;
        });
        this.loadCaregivers();
        this.loadAllUsers();
        this.refreshStats(); // Moved here as it was removed from the original loadInitialData
    }

    loadAllUsers() {
        this.communityService.getAllUsers().subscribe(res => {
            this.allUsers = res.filter(u => u.id !== this.currentUser.id);
        });
    }

    loadUnreadConversations() {
        // Mocking unread logic: in a real app, backend would return unreadCount per conversation
        // This method is no longer called in loadInitialData, but kept for potential future use or other calls.
        this.conversationService.findForUser(this.currentUser.id).subscribe(res => {
            this.unreadConversations = res.filter(c => c.unreadCount > 0);
        });
    }

    refreshStats() {
        this.communityService.getStats().subscribe(res => {
            this.stats = { ...this.stats, ...res };
        });
    }

    loadCaregivers() {
        this.communityService.getCaregivers().subscribe(res => this.caregivers = res);
    }

    switchView(view: 'groups' | 'caregivers' | 'archived' | 'blocked') {
        this.activeView = view;
        if (view === 'blocked') this.loadBlockedData();
        if (view === 'archived') this.loadArchivedData();
    }

    selectGroup(group: any) {
        this.selectedGroup = group;
        const convId = group.id;
        if (convId) {
            this.loadMessages(convId);
            // Mark as read if it was unread
            const unreadIdx = this.unreadConversations.findIndex(c => c.id === convId);
            if (unreadIdx !== -1) {
                this.unreadConversations.splice(unreadIdx, 1);
            }
        }
    }

    loadMessages(convId: number) {
        this.messageService.getByConversation(convId).subscribe(res => {
            // Only update if arrays are different length or last message is different to prevent UI flicker
            if (this.messages.length !== res.length ||
               (this.messages.length > 0 && res.length > 0 && this.messages[this.messages.length - 1].id !== res[res.length - 1].id)) {
                this.messages = res;
            } else {
                // To allow message edits to reflect without full re-render
                this.messages = res;
            }
        });
    }

    trackByMessageId(index: number, msg: any): number {
        return msg.id;
    }

    pendingFile: any = null;

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        this.messageService.uploadFile(file).subscribe(res => {
            this.pendingFile = res;
        });
    }

    sendMessage() {
        if (!this.newMessage.trim() && !this.pendingFile) return;

        if (this.isEditing && this.editingMessageId && !this.pendingFile) {
            this.messageService.update(this.editingMessageId, this.currentUser.id, this.newMessage).subscribe(() => {
                this.cancelEdit();
                if (this.selectedGroup) {
                    this.loadMessages(this.selectedGroup.id);
                }
            });
            return;
        }

        const convId = this.selectedGroup.id;
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

        this.messageService.send(this.currentUser.id, convId, payload).subscribe(() => {
            this.newMessage = '';
            this.pendingFile = null;
            this.replyToMessage = null;
            this.loadMessages(convId);
        });
    }

    speakMessage(text: string) {
        if (!text) return;
        window.speechSynthesis.cancel(); // Stop current speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR'; // Default to French
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }

    replyMessage(msg: any) {
        this.replyToMessage = msg;
        // Focus the input
        const input = document.getElementById('message-input');
        if (input) input.focus();
    }

    cancelReply() {
        this.replyToMessage = null;
    }

    downloadFile(path: string) {
        window.open(`${environment.communityApiUrl}/messages/files?path=${path}`, '_blank');
    }

    onFileUpload(event: any) {
        const file = event.target.files[0];
        if (!file || !this.selectedGroup) return;
        this.messageService.uploadFile(file).subscribe(res => {
            const payload = {
                content: `Fichier : ${res.fileName}`,
                fileUrl: res.fileUrl,
                fileType: res.fileType,
                tags: 'attachment'
            };
            this.messageService.send(this.currentUser.id, this.selectedGroup.id, payload).subscribe(() => {
                this.loadMessages(this.selectedGroup.id);
            });
        });
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
        if (confirm("Voulez-vous vraiment supprimer ce message ?")) {
            this.messageService.delete(msgId, this.currentUser.id).subscribe(() => {
                this.messages = this.messages.filter(m => m.id !== msgId);
            });
        }
    }

    requestTranscription(msgId: number) {
        this.messageService.transcribe(msgId).subscribe(updatedMsg => {
            const index = this.messages.findIndex(m => m.id === msgId);
            if (index !== -1) {
                this.messages[index] = updatedMsg;
            }
        }, err => {
            console.error("Transcription failed", err);
            alert("Erreur lors de la transcription.");
        });
    }

    openForward(msgId: number) {
        this.forwardMessageId = msgId;
        this.forwardSearchTerm = '';
        this.showForwardModal = true;
    }

    forwardToUser(targetUser: any) {
        if (!this.forwardMessageId) return;

        // Try to find if we already have a direct conversation with this user
        const existingConv = this.groups.find(c =>
            c.type === 'DIRECT' &&
            c.participants &&
            c.participants.some((p: any) => p.id === targetUser.id)
        );

        if (existingConv) {
            this.executeForward(existingConv.id);
        } else {
            // Create new direct conversation then forward
            this.conversationService.createDirect(this.currentUser.id, targetUser.id).subscribe(res => {
                this.executeForward(res.id);
            });
        }
    }

    private executeForward(convId: number) {
        this.messageService.forward(this.currentUser.id, this.forwardMessageId!, convId).subscribe(() => {
            this.showForwardModal = false;
            alert("Message transféré avec succès.");
            this.loadInitialData();
        });
    }

    private extractTags(text: string): string {
        const tags = text.match(/#\w+/g);
        return tags ? tags.join(',') : '';
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
        this.conversationService.createDirect(this.currentUser.id, user.id).subscribe(res => {
            this.showNewChatModal = false;
            this.activeView = 'groups';
            this.selectGroup(res);
            this.loadInitialData(); // Refresh list
        });
    }

    get filteredUsersForForward() {
        if (!this.forwardSearchTerm.trim()) return this.allUsers;
        const low = this.forwardSearchTerm.toLowerCase();
        return this.allUsers.filter(u =>
            (u.firstName + ' ' + u.lastName).toLowerCase().includes(low) ||
            u.role.toLowerCase().includes(low)
        );
    }

    createGroup() {
        if (this.newGroup.name.length < 3) {
            alert("Le nom du groupe doit avoir au moins 3 caractères.");
            return;
        }
        if (this.selectedMembersForNewGroup.length < 1) {
            alert("Veuillez sélectionner au moins un soignant (total 2 personnes avec vous).");
            return;
        }

        const payload = {
            ...this.newGroup,
            members: this.selectedMembersForNewGroup
        };

        this.communityService.create(payload, this.currentUser.id).subscribe(res => {
            const groupId = res.id;
            // Add selected members
            this.selectedMembersForNewGroup.forEach(m => {
                this.communityService.addMember(groupId, m.id, this.currentUser.id).subscribe();
            });

            this.showCreateModal = false;
            this.newGroup = { name: '', description: '', tags: '' };
            this.selectedMembersForNewGroup = [];
            this.loadInitialData();
            alert("Groupe créé avec succès.");
        });
    }

    toggleMemberSelection(user: any) {
        const idx = this.selectedMembersForNewGroup.findIndex(m => m.id === user.id);
        if (idx === -1) {
            this.selectedMembersForNewGroup.push(user);
        } else {
            this.selectedMembersForNewGroup.splice(idx, 1);
        }
    }

    isMemberSelected(user: any): boolean {
        return this.selectedMembersForNewGroup.some(m => m.id === user.id);
    }

    openEditGroup() {
        if (!this.selectedGroup) return;
        // If selectedGroup is a conversation, we look for its community
        const community = this.selectedGroup.type === 'GROUP' ? this.selectedGroup.community : null;
        if (!community) return;

        this.editingGroupData = {
            id: community.id,
            name: community.name,
            description: community.description,
            tags: community.tags
        };
        this.isEditingGroup = true;
    }

    updateGroup() {
        if (!this.selectedGroup || !this.selectedGroup.community) return;
        this.communityService.update(this.selectedGroup.community.id, this.editingGroupData, this.currentUser.id).subscribe(() => {
            this.isEditingGroup = false;
            this.loadInitialData();
            alert("Groupe mis à jour.");
        });
    }

    archiveGroup(id: number) {
        this.communityService.archive(id, this.currentUser.id).subscribe(() => {
            alert("Groupe archivé.");
            this.loadInitialData();
            if (this.activeView === 'archived') this.loadArchivedData();
        });
    }

    unarchiveGroup(id: number) {
        this.communityService.unarchive(id, this.currentUser.id).subscribe(() => {
            alert("Groupe désarchivé.");
            this.loadInitialData();
            if (this.activeView === 'archived') this.loadArchivedData();
        });
    }

    deleteGroup(id: number) {
        if (!confirm("Supprimer définitivement ce groupe ?")) return;
        this.communityService.delete(id, this.currentUser.id).subscribe(() => {
            this.selectedGroup = null;
            this.isEditingGroup = false;
            this.showCreateModal = false;
            this.loadInitialData();
            alert("Groupe supprimé.");
        });
    }

    deleteConversation(c: any) {
        if (c.type === 'GROUP') {
            if (this.currentUser.role === 'DOCTOR') {
                this.deleteGroup(c.community.id);
            } else {
                alert("Seuls les docteurs peuvent supprimer un groupe.");
            }
        } else {
            if (!confirm("Supprimer cette discussion de votre liste ?")) return;
            this.conversationService.delete(c.id, this.currentUser.id).subscribe(() => {
                if (this.selectedGroup?.id === c.id) this.selectedGroup = null;
                this.loadInitialData();
            });
        }
    }

    deleteConversationById(convId: number) {
        if (!confirm("Supprimer cette discussion de votre liste ?")) return;
        this.conversationService.delete(convId, this.currentUser.id).subscribe(() => {
            if (this.selectedGroup?.id === convId) this.selectedGroup = null;
            this.loadInitialData();
            if (this.activeView === 'archived') this.loadArchivedData();
            if (this.activeView === 'blocked') this.loadBlockedData();
        });
    }

    // Member Management
    openMemberModal() {
        this.showMemberModal = true;
        this.searchMemberTerm = '';
        this.userSearchResults = [];
        // pre-fill the edit name
        this.editGroupName = this.selectedGroup?.community?.name || this.selectedGroup?.name || '';
    }


    searchUsers() {
        const term = this.searchMemberTerm;
        if (term.length < 2) { this.userSearchResults = []; return; }
        this.userService.search(term).subscribe(res => {
            const currentMemberIds = (this.selectedGroup?.community?.members || []).map((m: any) => m.id);
            this.userSearchResults = res.filter((u: any) => u.id !== this.currentUser.id && !currentMemberIds.includes(u.id));
        });
    }

    saveGroupName() {
        if (!this.selectedGroup?.community || !this.editGroupName.trim()) return;
        const updated = { ...this.selectedGroup.community, name: this.editGroupName.trim() };
        this.communityService.update(this.selectedGroup.community.id, updated, this.currentUser.id).subscribe(() => {
            this.selectedGroup.community.name = this.editGroupName.trim();
            this.loadInitialData();
        });
    }

    blockMemberFromGroup(user: any) {
        this.blockMemberInsideGroup(user);
    }


    addMember(user: any) {
        if (!this.selectedGroup || !this.selectedGroup.community) return;
        this.communityService.addMember(this.selectedGroup.community.id, user.id, this.currentUser.id).subscribe(() => {
            alert(`${user.firstName} ajouté.`);
            this.loadInitialData();
        });
    }

    removeMember(userId: number) {
        if (!this.selectedGroup || !this.selectedGroup.community) return;
        if (this.selectedGroup.community.members.length <= 2) {
            alert("Un groupe doit avoir au moins 2 membres. Vous ne pouvez pas en retirer plus.");
            return;
        }
        this.communityService.removeMember(this.selectedGroup.community.id, userId, this.currentUser.id).subscribe(() => {
            alert(`Membre retiré.`);
            this.loadInitialData();
        }, err => alert(err.error?.message || "Erreur"));
    }

    // Archiving & Blocking
    archiveConversation() {
        if (!this.selectedGroup) return;
        this.archiveConversationById(this.selectedGroup.id);
    }

    archiveConversationById(convId: number) {
        this.conversationService.archive(convId, this.currentUser.id).subscribe(() => {
            alert("Discussion archivée.");
            if (this.selectedGroup?.id === convId) this.selectedGroup = null;
            this.loadInitialData();
        });
    }

    unarchiveConversation(convId: number) {
        this.conversationService.unarchive(convId, this.currentUser.id).subscribe(() => {
            alert("Discussion désarchivée.");
            this.loadArchivedData();
            this.loadInitialData();
        });
    }

    blockConversation() {
        if (!this.selectedGroup) return;
        this.conversationService.block(this.selectedGroup.id, this.currentUser.id).subscribe(() => {
            alert("Discussion bloquée.");
            this.selectedGroup = null;
            this.loadInitialData();
            if (this.activeView === 'blocked') this.loadBlockedData();
        });
    }

    unblockConversation(convId: number) {
        this.conversationService.unblock(convId, this.currentUser.id).subscribe(() => {
            alert("Discussion débloquée.");
            this.loadBlockedData();
        });
    }

    loadBlockedData() {
        this.conversationService.findBlocked(this.currentUser.id).subscribe(res => {
            this.blockedConversations = res;
        });
    }

    loadArchivedData() {
        this.conversationService.findArchived(this.currentUser.id).subscribe(res => {
            this.archivedConversations = res;
        });
    }

    blockMemberInsideGroup(user: any) {
        if (!this.selectedGroup?.community) return;
        if (confirm(`Voulez-vous bloquer ${user.firstName} ${user.lastName} ? Il sera également retiré du groupe.`)) {
            // Logic: Block user and remove from current group
            // For now we'll simulate the block by starting a private convo and blocking it,
            // but the user likely wants a general block.
            // For this implementation, we block the direct conversation and remove from group.
            this.conversationService.startPrivate(this.currentUser.id, user.id).subscribe(conv => {
                this.conversationService.block(conv.id, this.currentUser.id).subscribe(() => {
                    this.removeMember(user.id);
                    alert(`${user.firstName} a été bloqué et retiré.`);
                });
            });
        }
    }

    getConversationName(conv: any): string {
        if (conv.type === 'GROUP' && conv.community) return conv.community.name;
        const other = conv.participants?.find((p: any) => p.id !== this.currentUser.id);
        return other ? `${other.firstName} ${other.lastName}` : 'Discussion Privée';
    }

    getOtherParticipantName(conv: any): string {
        if (!conv) return 'Inconnu';
        if (conv.type === 'GROUP') {
            return conv.community?.name || 'Groupe sans nom';
        }
        const other = conv.participants?.find((p: any) => p.id != this.currentUser.id);
        return other ? `${other.firstName || ''} ${other.lastName || ''}`.trim() || 'Utilisateur' : 'Utilisateur';
    }

    openCaregiverChat(caregiver: any) {
        // Try to find existing direct conversation
        this.conversationService.findForUser(this.currentUser.id).subscribe(res => {
            const existing = res.find(c =>
                c.type === 'DIRECT' &&
                c.participants.some((p: any) => p.id === caregiver.id)
            );
            if (existing) {
                this.activeView = 'groups'; // Switch view to show the chat
                this.selectedGroup = {
                    name: `${caregiver.firstName} ${caregiver.lastName}`,
                    id: existing.id,
                    type: 'DIRECT'
                };
                this.loadMessages(existing.id);
            } else {
                // Create new direct conversation
                this.conversationService.createDirect(this.currentUser.id, caregiver.id).subscribe((newConv: any) => {
                    this.activeView = 'groups';
                    this.selectedGroup = {
                        name: `${caregiver.firstName} ${caregiver.lastName}`,
                        id: newConv.id,
                        type: 'DIRECT'
                    };
                    this.loadMessages(newConv.id);
                    this.loadInitialData(); // Refresh list to include new conv
                });
            }
        });
    }

    get addableCaregivers() {
        if (!this.selectedGroup || !this.selectedGroup.community) return [];
        const currentMemberIds = this.selectedGroup.community.members.map((m: any) => m.id);
        return this.caregivers.filter(c => !currentMemberIds.includes(c.id));
    }

    get filteredGroups() {
        // Show active groups (NOT blocked, NOT archived)
        let list = this.groups.filter(c => !c.isArchived && !c.isBlocked && c.isBlockedBy?.id !== this.currentUser.id);

        if (this.searchTerm) {
            list = list.filter(c => {
                const name = this.getConversationName(c);
                return name.toLowerCase().includes(this.searchTerm.toLowerCase());
            });
        }

        if (this.filterBy === 'recent') {
            list = [...list].sort((a, b) => b.id - a.id);
        }
        return list;
    }

    get filteredCaregivers() {
        if (!this.searchTerm) return this.caregivers;
        return this.caregivers.filter(c =>
            c.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            c.lastName.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
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
            // Some WebM files have Infinity duration until fully buffered
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
                    
                    this.messageService.uploadFile(file).subscribe(res => {
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

    openImageFullscreen(url: any) {
        if (typeof url === 'string') {
            this.lightboxImageUrl = url;
        }
    }

    closeLightbox() {
        this.lightboxImageUrl = null;
    }
}
