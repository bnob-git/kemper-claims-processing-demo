import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { ChatWidgetComponent } from './chat-widget.component';
import { ChatService } from '../../services/chat.service';
import { of, throwError } from 'rxjs';

describe('ChatWidgetComponent', () => {
  let component: ChatWidgetComponent;
  let fixture: ComponentFixture<ChatWidgetComponent>;
  let chatService: ChatService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ChatWidgetComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
        RouterTestingModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatWidgetComponent);
    component = fixture.componentInstance;
    chatService = TestBed.inject(ChatService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should start with panel closed', () => {
    expect(component.isPanelOpen).toBeFalse();
  });

  it('should toggle panel and show welcome message', () => {
    component.togglePanel();
    expect(component.isPanelOpen).toBeTrue();
    expect(component.messages.length).toBe(1);
    expect(component.messages[0].sender).toBe('bot');
    expect(component.messages[0].text).toContain('Claims Assistant');
  });

  it('should close panel when toggled again', () => {
    component.togglePanel();
    component.togglePanel();
    expect(component.isPanelOpen).toBeFalse();
  });

  it('should add user message and bot response on send', () => {
    spyOn(chatService, 'sendMessage').and.returnValue(of({
      reply: 'Test reply',
      suggestions: ['Suggestion 1'],
    }));

    component.togglePanel();
    component.inputText = 'Hello';
    component.sendMessage();

    expect(component.messages.length).toBe(3);
    expect(component.messages[1].sender).toBe('user');
    expect(component.messages[1].text).toBe('Hello');
    expect(component.messages[2].sender).toBe('bot');
    expect(component.messages[2].text).toBe('Test reply');
  });

  it('should not send empty messages', () => {
    spyOn(chatService, 'sendMessage');
    component.inputText = '   ';
    component.sendMessage();
    expect(chatService.sendMessage).not.toHaveBeenCalled();
  });

  it('should handle error response', () => {
    spyOn(chatService, 'sendMessage').and.returnValue(
      throwError(() => new Error('Network error'))
    );

    component.togglePanel();
    component.inputText = 'Hello';
    component.sendMessage();

    expect(component.messages.length).toBe(3);
    expect(component.messages[2].sender).toBe('bot');
    expect(component.messages[2].text).toContain('something went wrong');
  });

  it('should send suggestion as a message', () => {
    spyOn(chatService, 'sendMessage').and.returnValue(of({
      reply: 'Suggestion reply',
      suggestions: [],
    }));

    component.togglePanel();
    component.sendSuggestion('Show my claims');

    expect(chatService.sendMessage).toHaveBeenCalledWith('Show my claims');
  });
});
