import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChatService } from '../../services/chat.service';
import { ChatMessage } from '../../models/chat.model';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <!-- FAB Button -->
    <button mat-fab class="chat-fab" (click)="togglePanel()"
            [style.display]="isPanelOpen ? 'none' : 'flex'"
            aria-label="Open chat assistant">
      <mat-icon>chat</mat-icon>
    </button>

    <!-- Chat Panel -->
    <mat-card class="chat-panel" *ngIf="isPanelOpen">
      <div class="chat-header">
        <mat-icon>smart_toy</mat-icon>
        <span class="chat-title">Claims Assistant</span>
        <button mat-icon-button (click)="togglePanel()" aria-label="Close chat">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="chat-messages" #messageContainer>
        <div *ngFor="let msg of messages"
             class="message-row"
             [class.user-row]="msg.sender === 'user'"
             [class.bot-row]="msg.sender === 'bot'">
          <div class="message-bubble" [class.user]="msg.sender === 'user'"
               [class.bot]="msg.sender === 'bot'">
            <span class="message-text" [innerHTML]="formatMessage(msg.text)"></span>
            <span class="message-time">
              {{ msg.timestamp | date:'shortTime' }}
            </span>
          </div>
          <!-- Claim data card -->
          <div *ngIf="msg.data && msg.data.claimNumber" class="claim-card">
            <div class="claim-card-header">
              {{ msg.data.claimNumber }}
            </div>
            <div class="claim-card-body">
              <div>Status: <strong>{{ msg.data.status }}</strong></div>
              <div>Loss Type: {{ msg.data.lossType }}</div>
              <div *ngIf="msg.data.reserveAmount != null">
                Reserve: \${{ msg.data.reserveAmount }}
              </div>
            </div>
            <a [routerLink]="['/claims', msg.data.id]" class="claim-link">
              View Details →
            </a>
          </div>
          <!-- Suggestions -->
          <div *ngIf="msg.suggestions && msg.suggestions.length"
               class="suggestions">
            <button *ngFor="let s of msg.suggestions"
                    mat-stroked-button class="suggestion-chip"
                    (click)="sendSuggestion(s)">
              {{ s }}
            </button>
          </div>
        </div>

        <!-- Typing indicator -->
        <div *ngIf="isLoading" class="message-row bot-row">
          <div class="message-bubble bot typing-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <mat-form-field class="input-field" appearance="outline">
          <input matInput placeholder="Type a message..."
                 [(ngModel)]="inputText"
                 (keyup.enter)="sendMessage()"
                 [disabled]="isLoading" />
        </mat-form-field>
        <button mat-icon-button color="primary"
                (click)="sendMessage()"
                [disabled]="!inputText.trim() || isLoading"
                aria-label="Send message">
          <mat-icon>send</mat-icon>
        </button>
      </div>
    </mat-card>
  `,
  styles: [`
    .chat-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
    }

    .chat-panel {
      position: fixed;
      bottom: 90px;
      right: 24px;
      width: 400px;
      height: 500px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      border-radius: 12px;
      overflow: hidden;
      padding: 0;
    }

    .chat-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: #1976d2;
      color: white;
    }

    .chat-header mat-icon {
      margin-right: 8px;
    }

    .chat-title {
      flex: 1;
      font-weight: 500;
      font-size: 16px;
    }

    .chat-header button {
      color: white;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #fafafa;
    }

    .message-row {
      display: flex;
      flex-direction: column;
      margin-bottom: 12px;
    }

    .user-row { align-items: flex-end; }
    .bot-row { align-items: flex-start; }

    .message-bubble {
      padding: 8px 12px;
      max-width: 80%;
      word-wrap: break-word;
      white-space: pre-line;
    }

    .message-bubble.user {
      background: #1976d2;
      color: white;
      border-radius: 12px 12px 0 12px;
    }

    .message-bubble.bot {
      background: #f5f5f5;
      color: #333;
      border-radius: 12px 12px 12px 0;
    }

    .message-text { display: block; }

    .message-time {
      display: block;
      font-size: 11px;
      opacity: 0.7;
      margin-top: 4px;
    }

    .claim-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-top: 6px;
      max-width: 80%;
      font-size: 13px;
    }

    .claim-card-header {
      font-weight: 600;
      margin-bottom: 4px;
      color: #1976d2;
    }

    .claim-card-body div { margin-bottom: 2px; }

    .claim-link {
      display: inline-block;
      margin-top: 6px;
      color: #1976d2;
      text-decoration: none;
      font-weight: 500;
      font-size: 13px;
    }

    .claim-link:hover { text-decoration: underline; }

    .suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }

    .suggestion-chip {
      font-size: 12px;
      height: 30px;
      line-height: 30px;
      padding: 0 12px;
    }

    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #999;
      animation: bounce 1.4s infinite both;
    }

    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    .chat-input {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-top: 1px solid #e0e0e0;
      background: white;
    }

    .input-field {
      flex: 1;
      margin-right: 4px;
    }

    .input-field ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }
  `]
})
export class ChatWidgetComponent implements AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  isPanelOpen = false;
  isLoading = false;
  inputText = '';
  messages: ChatMessage[] = [];

  private shouldScroll = false;

  constructor(private chatService: ChatService) {}

  togglePanel(): void {
    this.isPanelOpen = !this.isPanelOpen;
    if (this.isPanelOpen && this.messages.length === 0) {
      this.addWelcomeMessage();
    }
  }

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text) return;

    this.messages.push({
      text,
      sender: 'user',
      timestamp: new Date(),
    });
    this.inputText = '';
    this.isLoading = true;
    this.shouldScroll = true;

    this.chatService.sendMessage(text).subscribe({
      next: (response) => {
        this.messages.push({
          text: response.reply,
          sender: 'bot',
          timestamp: new Date(),
          data: response.data,
          suggestions: response.suggestions,
        });
        this.isLoading = false;
        this.shouldScroll = true;
      },
      error: () => {
        this.messages.push({
          text: 'Sorry, something went wrong. Please try again.',
          sender: 'bot',
          timestamp: new Date(),
        });
        this.isLoading = false;
        this.shouldScroll = true;
      },
    });
  }

  sendSuggestion(suggestion: string): void {
    this.inputText = suggestion;
    this.sendMessage();
  }

  formatMessage(text: string): string {
    return text.replace(/\n/g, '<br>');
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    const el = this.messageContainer?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  private addWelcomeMessage(): void {
    this.messages.push({
      text: "Hi! I'm the Claims Assistant. I can help you look up claims, "
        + "check policy info, or guide you through workflows. "
        + "Try asking me about a claim number!",
      sender: 'bot',
      timestamp: new Date(),
      suggestions: ['Show my claims', 'How to file a claim', 'Go to dashboard'],
    });
    this.shouldScroll = true;
  }
}
