export interface FreelancerSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture: string;
  currentPosition: string;
}

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ChatConversation, ChatMessage, PresenceEvent, TypingEvent, ReadReceiptEvent } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly apiUrl = `${environment.apiUrl}/messages`;

  /** Convert http(s):// base URL to ws(s):// for native WebSocket */
  private get wsBrokerUrl(): string {
    return environment.apiUrl
      .replace('/api', '')
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://') + '/ws';
  }

  private stompClient: Client | null = null;
  private activeConversationId: string | null = null;
  private presenceSub: StompSubscription | null = null;
  private typingSub: StompSubscription | null = null;
  private readSub: StompSubscription | null = null;

  // Signal holding loaded conversations (used for unread badge in navbar)
  conversations = signal<ChatConversation[]>([]);

  totalUnread = computed(() => {
    const userId = this.authService.currentUser()?.id ?? '';
    return this.conversations().reduce((sum, c) => sum + (c.unreadCount[userId] ?? 0), 0);
  });

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  // ── REST ──────────────────────────────────────────────────────────────────

  getConversations(): Observable<ChatConversation[]> {
    return this.http
      .get<ChatConversation[]>(`${this.apiUrl}/conversations`)
      .pipe(tap((convs) => this.conversations.set(convs)));
  }

  /** Company only — create or retrieve a conversation with a given freelancer */
  getOrCreateConversation(freelancerId: string): Observable<ChatConversation> {
    return this.http.post<ChatConversation>(`${this.apiUrl}/conversations`, { freelancerId });
  }

  /** Company only — search freelancers by name */
  searchFreelancers(query: string): Observable<FreelancerSearchResult[]> {
    return this.http.get<FreelancerSearchResult[]>(
      `${this.apiUrl}/search-freelancers?q=${encodeURIComponent(query)}`,
    );
  }

  getMessages(conversationId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(
      `${this.apiUrl}/conversations/${conversationId}/messages`,
    );
  }

  /** REST send — MessageService also broadcasts via WebSocket so both parties receive it */
  sendMessage(conversationId: string, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(
      `${this.apiUrl}/conversations/${conversationId}/send`,
      { content, conversationId },
    );
  }

  // ── REST — Presence ───────────────────────────────────────────────────────

  /** Call when receiving a message from the contact while already viewing the conversation */
  markRead(conversationId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/conversations/${conversationId}/read`, {});
  }

  getPresence(userId: string): Observable<{ userId: string; online: boolean; lastSeen?: string }> {
    return this.http.get<{ userId: string; online: boolean; lastSeen?: string }>(
      `${this.apiUrl}/presence/${userId}`,
    );
  }

  // ── WebSocket ─────────────────────────────────────────────────────────────

  /**
   * Connect to the STOMP broker and subscribe to:
   *  - /topic/conversation/{id}          (new messages)
   *  - /topic/conversation/{id}/typing   (typing events)
   *  - /topic/conversation/{id}/read     (read receipts)
   *  - /topic/presence                   (online/offline events)
   */
  connect(
    conversationId: string,
    onMessage: (msg: ChatMessage) => void,
    onTyping: (evt: TypingEvent) => void,
    onRead: (evt: ReadReceiptEvent) => void,
    onPresence: (evt: PresenceEvent) => void,
  ): void {
    if (this.stompClient?.active && this.activeConversationId === conversationId) return;

    this.disconnect();
    this.activeConversationId = conversationId;

    const token = this.authService.getToken();

    this.stompClient = new Client({
      brokerURL: this.wsBrokerUrl,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        this.stompClient?.subscribe(
          `/topic/conversation/${conversationId}`,
          (frame: IMessage) => onMessage(JSON.parse(frame.body)),
        );
        this.typingSub = this.stompClient?.subscribe(
          `/topic/conversation/${conversationId}/typing`,
          (frame: IMessage) => onTyping(JSON.parse(frame.body)),
        ) ?? null;
        this.readSub = this.stompClient?.subscribe(
          `/topic/conversation/${conversationId}/read`,
          (frame: IMessage) => onRead(JSON.parse(frame.body)),
        ) ?? null;
        this.presenceSub = this.stompClient?.subscribe(
          `/topic/presence`,
          (frame: IMessage) => onPresence(JSON.parse(frame.body)),
        ) ?? null;
      },
      onDisconnect: () => {
        this.activeConversationId = null;
      },
    });

    this.stompClient.activate();
  }

  /** Send typing event via STOMP */
  sendTyping(conversationId: string, typing: boolean): void {
    if (!this.stompClient?.active) return;
    this.stompClient.publish({
      destination: `/app/chat/${conversationId}/typing`,
      body: JSON.stringify({ typing }),
    });
  }

  disconnect(): void {
    this.presenceSub?.unsubscribe();
    this.typingSub?.unsubscribe();
    this.readSub?.unsubscribe();
    this.presenceSub = null;
    this.typingSub = null;
    this.readSub = null;
    if (this.stompClient?.active) {
      this.stompClient.deactivate();
    }
    this.stompClient = null;
    this.activeConversationId = null;
  }

  /** Refresh the unread count in the conversations signal (call when marking as read) */
  markConversationRead(conversationId: string, userId: string): void {
    this.conversations.update((convs) =>
      convs.map((c) =>
        c.id === conversationId
          ? { ...c, unreadCount: { ...c.unreadCount, [userId]: 0 } }
          : c,
      ),
    );
  }

  /** Add or update a conversation in the local signal */
  upsertConversation(updated: ChatConversation): void {
    this.conversations.update((convs) => {
      const idx = convs.findIndex((c) => c.id === updated.id);
      if (idx >= 0) {
        const next = [...convs];
        next[idx] = updated;
        return next;
      }
      return [updated, ...convs];
    });
  }
}
