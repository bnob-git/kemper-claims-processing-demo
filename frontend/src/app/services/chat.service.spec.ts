import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ChatService } from './chat.service';
import { ChatResponse } from '../models/chat.model';

describe('ChatService', () => {
  let service: ChatService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ChatService]
    });
    service = TestBed.inject(ChatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send POST request to /api/chat', () => {
    const mockResponse: ChatResponse = {
      reply: 'Hello!',
      suggestions: ['Show my claims']
    };

    service.sendMessage('hello').subscribe((response) => {
      expect(response.reply).toBe('Hello!');
      expect(response.suggestions).toEqual(['Show my claims']);
    });

    const req = httpMock.expectOne('http://localhost:8080/api/chat');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ message: 'hello' });
    req.flush(mockResponse);
  });
});
