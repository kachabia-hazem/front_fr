import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ChatService, FreelancerSearchResult } from '../../core/services/chat.service';
import { ChatConversation, ChatMessage, PresenceEvent, TypingEvent, ReadReceiptEvent } from '../../core/models/chat.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-messaging',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './messaging.component.html',
  styleUrl: './messaging.component.css',
})
export class MessagingComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  // ── State ──────────────────────────────────────────────────────────────────
  conversations = signal<ChatConversation[]>([]);
  messages = signal<ChatMessage[]>([]);
  selectedConversation = signal<ChatConversation | null>(null);

  messageText = '';
  searchQuery = '';
  loadingConvs = signal<boolean>(true);
  loadingMsgs = false;
  sending = false;
  shouldScrollToBottom = false;

  // Presence — active conversation contact
  contactOnline = signal<boolean>(false);
  contactLastSeen = signal<string | null>(null);
  // Presence — all sidebar contacts
  presenceMap = signal<Record<string, boolean>>({});

  // Typing indicator
  contactIsTyping = signal<boolean>(false);
  private typingHideTimeout: ReturnType<typeof setTimeout> | null = null;

  // Read receipts (logic lives in msg.read field)

  // Nav sidebar
  sidebarCollapsed = signal<boolean>(false);

  // Conversations sidebar
  convSidebarCollapsed = signal<boolean>(false);

  toggleConvSidebar(): void {
    this.convSidebarCollapsed.update(v => !v);
  }

  // New conversation search (company only)
  showNewChat = false;
  searchNameQuery = '';
  searchResults: FreelancerSearchResult[] = [];
  searchLoading = false;
  newChatLoading = false;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private typingDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public authService: AuthService,
    public chatService: ChatService,
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService,
  ) {}

  // ── Getters ────────────────────────────────────────────────────────────────

  get currentUserId(): string {
    return this.authService.currentUser()?.id ?? '';
  }

  get isCompany(): boolean {
    return this.authService.currentUser()?.role === 'COMPANY';
  }

  get isFreelancer(): boolean {
    return this.authService.currentUser()?.role === 'FREELANCER';
  }

  get companyHasStarted(): boolean {
    return this.messages().some(m => m.senderRole === 'COMPANY');
  }

  get filteredConversations(): ChatConversation[] {
    const q = this.searchQuery.toLowerCase().trim();
    return this.conversations().filter((c) => {
      const name = this.isCompany ? c.freelancerName : c.companyName;
      return !q || name.toLowerCase().includes(q);
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadConversations().then(() => {
      // Check if a freelancerId query param was passed (company → start chat)
      this.route.queryParams.subscribe((params) => {
        const freelancerId = params['freelancerId'];
        if (freelancerId && this.isCompany) {
          this.openOrCreateConversation(freelancerId);
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  // ── Conversations ──────────────────────────────────────────────────────────

  async loadConversations(): Promise<void> {
    return new Promise((resolve) => {
      this.loadingConvs.set(true);
      this.chatService.getConversations().subscribe({
        next: (convs) => {
          this.conversations.set(convs);
          this.loadingConvs.set(false);
          resolve();
          // Fetch initial presence for all contacts
          convs.forEach((c) => {
            const contactId = this.isCompany ? c.freelancerId : c.companyId;
            this.chatService.getPresence(contactId).subscribe({
              next: (p) => {
                this.presenceMap.update((m) => ({ ...m, [contactId]: p.online }));
              },
              error: () => {},
            });
          });
        },
        error: () => {
          this.loadingConvs.set(false);
          resolve();
        },
      });
    });
  }

  selectConversation(conv: ChatConversation): void {
    if (this.selectedConversation()?.id === conv.id) return;
    this.selectedConversation.set(conv);
    this.messages.set([]);
    this.contactIsTyping.set(false);
    this.loadMessages(conv.id);

    // Fetch initial presence state for the contact
    const contactId = this.isCompany ? conv.freelancerId : conv.companyId;
    this.chatService.getPresence(contactId).subscribe({
      next: (p) => {
        this.contactOnline.set(p.online);
        this.contactLastSeen.set(p.lastSeen ?? null);
      },
      error: () => {},
    });

    // Connect WebSocket for real-time messages, typing, read receipts, presence
    this.chatService.connect(
      conv.id,
      // onMessage
      (msg: ChatMessage) => {
        this.messages.update((msgs) => [...msgs, msg]);
        this.shouldScrollToBottom = true;
        if (msg.senderId !== this.currentUserId) {
          // Message from the contact — I'm actively viewing it, so mark as read immediately
          this.chatService.markRead(conv.id).subscribe({ error: () => {} });
        }
        this.conversations.update((convs) =>
          convs.map((c) =>
            c.id === conv.id
              ? { ...c, lastMessage: msg.content, lastMessageTime: msg.timestamp }
              : c,
          ),
        );
      },
      // onTyping
      (evt: TypingEvent) => {
        if (evt.userId === contactId) {
          this.contactIsTyping.set(evt.typing);
          if (evt.typing) {
            if (this.typingHideTimeout) clearTimeout(this.typingHideTimeout);
            this.typingHideTimeout = setTimeout(() => this.contactIsTyping.set(false), 4000);
          }
        }
      },
      // onRead
      (evt: ReadReceiptEvent) => {
        if (evt.readerId === contactId) {
          // Mark all my messages in this conversation as read locally
          this.messages.update((msgs) =>
            msgs.map((m) => (m.senderId === this.currentUserId ? { ...m, read: true } : m))
          );
        }
      },
      // onPresence
      (evt: PresenceEvent) => {
        // Update sidebar map for all contacts
        this.presenceMap.update((m) => ({ ...m, [evt.userId]: evt.online }));
        // Update header state for currently viewed contact
        if (evt.userId === contactId) {
          this.contactOnline.set(evt.online);
          if (!evt.online && evt.lastSeen) {
            this.contactLastSeen.set(evt.lastSeen);
          }
        }
      },
    );
  }

  loadMessages(conversationId: string): void {
    this.loadingMsgs = true;
    this.chatService.getMessages(conversationId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.loadingMsgs = false;
        this.shouldScrollToBottom = true;
        // Mark as read locally
        this.chatService.markConversationRead(conversationId, this.currentUserId);
        this.conversations.update((convs) =>
          convs.map((c) =>
            c.id === conversationId
              ? { ...c, unreadCount: { ...c.unreadCount, [this.currentUserId]: 0 } }
              : c,
          ),
        );
        // Explicitly send read receipt so the other party sees ✓✓ in real-time
        this.chatService.markRead(conversationId).subscribe({ error: () => {} });
      },
      error: () => {
        this.loadingMsgs = false;
      },
    });
  }

  // ── Send Message ──────────────────────────────────────────────────────────

  sendMessage(): void {
    const conv = this.selectedConversation();
    const content = this.messageText.trim();
    if (!conv || !content || this.sending) return;

    this.sending = true;
    this.messageText = '';
    // Stop typing indicator when sending
    this.chatService.sendTyping(conv.id, false);

    this.chatService.sendMessage(conv.id, content).subscribe({
      next: () => {
        this.sending = false;
      },
      error: () => {
        this.sending = false;
        this.messageText = content; // restore on error
      },
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onMessageInput(): void {
    const conv = this.selectedConversation();
    if (!conv) return;
    this.chatService.sendTyping(conv.id, true);
    if (this.typingDebounce) clearTimeout(this.typingDebounce);
    this.typingDebounce = setTimeout(() => {
      this.chatService.sendTyping(conv.id, false);
    }, 3000);
  }

  // ── New Conversation (Company only) ───────────────────────────────────────

  openOrCreateConversation(freelancerId: string): void {
    this.newChatLoading = true;
    this.chatService.getOrCreateConversation(freelancerId).subscribe({
      next: (conv) => {
        this.newChatLoading = false;
        this.showNewChat = false;
        this.searchNameQuery = '';
        this.searchResults = [];
        // Add to list if not already there
        const exists = this.conversations().find((c) => c.id === conv.id);
        if (!exists) {
          this.conversations.update((convs) => [conv, ...convs]);
        }
        this.selectConversation(conv);
        // Clean query param from URL
        this.router.navigate([], { queryParams: {} });
      },
      error: () => {
        this.newChatLoading = false;
      },
    });
  }

  onSearchNameChange(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    const q = this.searchNameQuery.trim();
    if (!q) { this.searchResults = []; return; }
    this.searchTimeout = setTimeout(() => {
      this.searchLoading = true;
      this.chatService.searchFreelancers(q).subscribe({
        next: (results) => { this.searchResults = results; this.searchLoading = false; },
        error: () => { this.searchLoading = false; },
      });
    }, 300);
  }

  selectFreelancerFromSearch(f: FreelancerSearchResult): void {
    this.searchNameQuery = '';
    this.searchResults = [];
    this.openOrCreateConversation(f.id);
  }

  // ── UI Helpers ─────────────────────────────────────────────────────────────

  scrollToBottom(): void {
    try {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    } catch {}
  }

  isMine(msg: ChatMessage): boolean {
    return msg.senderId === this.currentUserId;
  }

  getContactId(conv: ChatConversation): string {
    return this.isCompany ? conv.freelancerId : conv.companyId;
  }

  isContactOnlineInList(conv: ChatConversation): boolean {
    return this.presenceMap()[this.getContactId(conv)] ?? false;
  }

  getContactName(conv: ChatConversation): string {
    return this.isCompany ? conv.freelancerName : conv.companyName;
  }

  getContactAvatar(conv: ChatConversation): string | undefined {
    return this.isCompany ? conv.freelancerPicture : conv.companyLogo;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((w) => w.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getUnreadCount(conv: ChatConversation): number {
    return conv.unreadCount[this.currentUserId] ?? 0;
  }

  formatTime(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return this.translate.instant('messaging.yesterday');
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  formatMsgTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDateSeparator(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return this.translate.instant('messaging.today');
    if (diffDays === 1) return this.translate.instant('messaging.yesterday');
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  }

  /** Group messages and inject date separators */
  get groupedMessages(): Array<{ type: 'separator'; date: string } | { type: 'message'; msg: ChatMessage }> {
    const result: Array<
      { type: 'separator'; date: string } | { type: 'message'; msg: ChatMessage }
    > = [];
    let lastDate = '';
    for (const msg of this.messages()) {
      const d = new Date(msg.timestamp).toDateString();
      if (d !== lastDate) {
        result.push({ type: 'separator', date: this.formatDateSeparator(msg.timestamp) });
        lastDate = d;
      }
      result.push({ type: 'message', msg });
    }
    return result;
  }

  formatLastSeen(dateStr: string | null): string {
    if (!dateStr) return this.translate.instant('messaging.recently');
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return this.translate.instant('messaging.just_now');
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return this.translate.instant('messaging.yesterday');
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  getFileUrl(path: string | undefined): string {
    if (!path) return '';
    return environment.apiUrl.replace('/api', '') + path;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  get sidebarUserName(): string {
    const convs = this.chatService.conversations();
    if (convs.length > 0) {
      return this.isCompany ? convs[0].companyName : convs[0].freelancerName;
    }
    return this.authService.currentUser()?.email?.split('@')[0] ?? '';
  }

  get sidebarUserAvatar(): string | undefined {
    const convs = this.chatService.conversations();
    if (convs.length > 0) {
      const pic = this.isCompany ? convs[0].companyLogo : convs[0].freelancerPicture;
      return pic || undefined;
    }
    return undefined;
  }

  get sidebarUserInitials(): string {
    return this.getInitials(this.sidebarUserName);
  }
}
