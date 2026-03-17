export interface ChatMessage {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  data?: any;
  suggestions?: string[];
}

export interface ChatResponse {
  reply: string;
  data?: any;
  suggestions?: string[];
}
