import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatResponse } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private baseUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat`, { message });
  }
}
