export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Citation {
  cited_text: string;
  cited_text_heading: string | null;
  document_title: string;
  document_index: number;
  document_author: string | null;
  document_reference: string | null;
}

export interface SafetySetting {
  threshold: 'BLOCK_ALL' | 'OFF';
  response: boolean;
}

export interface MagisteriumRequest {
  model: string;
  messages: Message[];
  safety_settings?: {
    CATEGORY_NON_CATHOLIC: SafetySetting;
  };
  stream?: boolean;
}

export interface ChatChoice {
  index: number;
  message: Message;
  finish_reason: 'stop' | 'length' | 'content_filter' | null;
}

export interface MagisteriumResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatChoice[];
  citations?: Citation[];
  related_questions?: string[];
}

export interface MessageUI extends Message {
  id: string;
  citations?: Citation[];
  related_questions?: string[];
}

export interface MagisteriumChat {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: MessageUI[];
}

