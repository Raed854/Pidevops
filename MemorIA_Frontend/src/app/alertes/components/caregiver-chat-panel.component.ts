import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import { ChatMessage } from '../../models/alert.model';

@Component({
  selector: 'app-caregiver-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      class="fixed inset-0 z-50 flex items-end justify-end"
      [class.hidden]="!isOpen"
      (click)="closePanel()">
      
      <!-- Backdrop -->
      <div 
        class="absolute inset-0 bg-black/30 backdrop-blur-sm"
        (click)="closePanel()">
      </div>

      <!-- Panel -->
      <div 
        class="relative w-full sm:w-96 h-full sm:h-[600px] bg-white shadow-2xl flex flex-col rounded-t-2xl sm:rounded-2xl sm:m-4 animate-slide-up"
        (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="bg-gradient-to-r from-[#541A75] to-[#7E7F9A] text-white p-4 rounded-t-2xl sm:rounded-t-2xl flex items-center justify-between">
          <div>
            <h3 class="font-semibold">💬 {{ currentUserRole === 'CAREGIVER' ? 'Chat with Doctor' : 'Chat with Caregiver' }}</h3>
            <p class="text-xs text-[#C0E0DE]/80">{{ selectedPatientName }}</p>
          </div>
          <button
            type="button"
            (click)="closePanel()"
            class="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
            ✕
          </button>
        </div>

        <!-- Messages -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4" #messagesContainer>
          <div *ngIf="messages.length === 0" class="text-center py-8">
            <p class="text-[#7E7F9A] text-sm">No messages yet. Start a conversation!</p>
          </div>

          <div 
            *ngFor="let msg of messages"
            class="flex"
            [ngClass]="isFromCurrentUser(msg) ? 'justify-end' : 'justify-start'">
            <div 
              class="max-w-xs rounded-lg px-4 py-2 text-sm"
              [ngClass]="isFromCurrentUser(msg)
                ? 'bg-[#541A75] text-white rounded-br-none'
                : 'bg-[#00635D]/10 text-[#541A75] rounded-bl-none border border-[#00635D]/20'">
              <p class="font-medium text-xs opacity-75">{{ msg.senderName }}</p>
              <p class="mt-1">{{ msg.content }}</p>
              <p class="text-xs opacity-50 mt-1">{{ getFormattedTime(msg.sentAt) }}</p>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="border-t border-[#C0E0DE]/30 p-4 space-y-2">
          <div class="flex gap-2">
            <textarea
              [(ngModel)]="newMessage"
              (keydown.enter)="onKeyDown($event)"
              placeholder="Type your message... (Ctrl+Enter to send)"
              class="flex-1 rounded-lg border border-[#C0E0DE] bg-white px-3 py-2 text-sm outline-none focus:border-[#541A75] focus:ring-2 focus:ring-[#541A75]/30 max-h-20 resize-none">
            </textarea>
            <button
              type="button"
              (click)="sendMessage()"
              [disabled]="!newMessage.trim()"
              class="bg-[#541A75] text-white px-4 py-2 rounded-lg hover:bg-[#7E7F9A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm">
              Send
            </button>
          </div>
          <div class="text-xs text-[#7E7F9A]">
            💡 Quick templates:
            <button 
              type="button"
              *ngFor="let template of messageTemplates"
              (click)="useTemplate(template)"
              class="inline-block ml-2 px-2 py-1 bg-[#C0E0DE]/10 text-[#541A75] rounded hover:bg-[#C0E0DE]/20 transition-colors">
              {{ template }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Button -->
    <button
      type="button"
      (click)="openPanel()"
      [class.hidden]="isOpen"
      class="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#541A75] text-white shadow-lg hover:bg-[#7E7F9A] flex items-center justify-center transition-all duration-300 hover:scale-110 animate-pulse">
      💬
    </button>
  `,
  styles: [`
    @keyframes slide-up {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .animate-slide-up {
      animation: slide-up 0.3s ease-out;
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 4px 15px rgba(84, 26, 117, 0.4);
      }
      50% {
        box-shadow: 0 4px 25px rgba(84, 26, 117, 0.6);
      }
    }

    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
  `]
})
export class CaregiverChatPanelComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() isOpen = false;
  @Input() selectedPatientId: number | null = null;
  @Input() selectedPatientName = 'Patient';
  @Output() closeRequested = new EventEmitter<void>();
  @Output() messageSent = new EventEmitter<{ patientId: number; content: string }>();
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  messages: ChatMessage[] = [];
  newMessage = '';
  currentUserRole: 'DOCTOR' | 'CAREGIVER' = 'CAREGIVER';
  currentUserName = 'Accompanist';
  messageTemplates = [
    'Patient is doing well',
    'Need urgent attention',
    'Medication given',
    'Patient is resting'
  ];

  private isLoadingMessages = false;
  private readonly destroy$ = new Subject<void>();
  private shouldScroll = true;

  constructor(
    private readonly alertService: AlertService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeUserRole();
    if (this.selectedPatientId) {
      this.loadMessages();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.messagesContainer) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openPanel(): void {
    this.isOpen = true;
    this.shouldScroll = true;
    if (this.selectedPatientId) {
      this.loadMessages();
    }
  }

  closePanel(): void {
    this.isOpen = false;
    this.closeRequested.emit();
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedPatientId) {
      return;
    }

    const content = this.newMessage.trim();
    
    // Create optimistic message for UI
    const optimisticMsg: ChatMessage = {
      patientId: this.selectedPatientId,
      senderUserId: 0,
      senderRole: this.currentUserRole,
      senderName: this.currentUserName,
      content: content,
      sentAt: new Date().toISOString()
    };
    
    this.messages.push(optimisticMsg);
    this.newMessage = '';
    this.shouldScroll = true;

    // Send to backend
    this.alertService.sendChatMessage({
      patientId: this.selectedPatientId,
      content,
      senderRole: this.currentUserRole
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          // Update the optimistic message with server response
          const lastMsg = this.messages[this.messages.length - 1];
          if (lastMsg.content === content) {
            lastMsg.sentAt = message.sentAt;
          }
          console.log('✅ Message sent successfully:', content);
        },
        error: (err) => {
          // Remove optimistic message on error
          this.messages = this.messages.filter(m => m.content !== content);
          this.shouldScroll = true;
          console.error('Failed to send message:', err);
        }
      });
  }

  onKeyDown(event: Event): void {
    if ((event as KeyboardEvent).ctrlKey && (event as KeyboardEvent).key === 'Enter') {
      this.sendMessage();
    }
  }

  useTemplate(template: string): void {
    this.newMessage = template;
  }

  isFromCurrentUser(msg: ChatMessage): boolean {
    return msg.senderRole === this.currentUserRole;
  }

  getFormattedTime(date: string): string {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  private initializeUserRole(): void {
    // Get the current user role from auth service
    const userRole = this.authService.getRole();
    // Map to DOCTOR or CAREGIVER
    this.currentUserRole = (userRole === 'DOCTOR' || userRole === 'CAREGIVER') ? userRole : 'CAREGIVER';
    
    // Get current user name from auth service if available
    const currentUser = this.authService.getUser();
    if (currentUser) {
      this.currentUserName = `${currentUser.prenom || 'Accompanist'} ${currentUser.nom || ''}`.trim();
    }
  }

  private loadMessages(): void {
    if (!this.selectedPatientId || this.isLoadingMessages) {
      return;
    }

    this.isLoadingMessages = true;
    this.alertService.loadChatMessages(this.selectedPatientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          this.messages = messages || [];
          this.isLoadingMessages = false;
          this.shouldScroll = true;
        },
        error: (err) => {
          console.error('Error loading messages:', err);
          this.messages = [];
          this.isLoadingMessages = false;
        }
      });
  }

  private scrollToBottom(): void {
    try {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      // Ignore scroll errors
    }
  }
}
