import { Component, OnInit, signal, computed, DestroyRef, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActiveMissionService } from '../../core/services/active-mission.service';
import { FreelancerService } from '../../core/services/freelancer.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { Freelancer } from '../../core/models';
import { ActiveMission, Task, Deliverable } from '../../core/models/active-mission.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-active-mission',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, DragDropModule],
  templateUrl: './active-mission.component.html',
  styleUrl: './active-mission.component.css',
})
export class ActiveMissionComponent implements OnInit {
  freelancer = signal<Freelancer | null>(null);
  mission = signal<ActiveMission | null>(null);
  tasks = signal<Task[]>([]);
  deliverables = signal<Deliverable[]>([]);
  loading = signal(true);
  sidebarCollapsed = signal(false);
  unreadNotifCount = computed(() => this.notificationService.unreadCount());

  // Kanban columns
  todoTasks = computed(() => this.tasks().filter(t => t.status === 'TODO'));
  inProgressTasks = computed(() => this.tasks().filter(t => t.status === 'IN_PROGRESS'));
  doneTasks = computed(() => this.tasks().filter(t => t.status === 'DONE'));

  // New task forms per column
  showAddTaskForm = signal<string | null>(null); // 'TODO' | 'IN_PROGRESS' | 'DONE' | null
  newTaskTitle = '';
  newTaskDescription = '';
  addingTask = signal(false);

  // Edit task inline
  editingTaskId = signal<string | null>(null);
  editTaskTitle = '';
  editTaskDescription = '';
  savingTask = signal(false);

  // Git section
  showGitUrlForm = signal(false);
  newGitUrl = '';
  refreshingGit = signal(false);
  gitError = signal('');
  lastGitRefresh = signal<Date | null>(null);
  testingGitUrl = signal(false);
  gitUrlValidation = signal<{ valid: boolean; message: string } | null>(null);

  get gitUrlFormatError(): string {
    const url = this.newGitUrl.trim();
    if (!url) return '';
    const pattern = /^https?:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(\.git)?\/?$/;
    if (!pattern.test(url)) {
      return 'Format invalide — attendu : https://github.com/username/repository';
    }
    return '';
  }

  private readonly destroyRef = inject(DestroyRef);
  private readonly GIT_POLL_INTERVAL_MS = 60_000; // 60 secondes

  // Deliverables
  selectedFile = signal<File | null>(null);
  deliverableDescription = '';
  uploadingDeliverable = signal(false);

  // Submission
  showSubmitForm = signal(false);
  submissionNote = '';
  submitting = signal(false);
  submitSuccess = signal(false);

  // User role check
  isFreelancer = signal(false);

  initials = computed(() => {
    const f = this.freelancer();
    if (!f) return '?';
    return ((f.firstName?.charAt(0) || '') + (f.lastName?.charAt(0) || '')).toUpperCase();
  });
  displayName = computed(() => {
    const f = this.freelancer();
    if (!f) return '';
    return `${f.firstName || ''} ${f.lastName || ''}`.trim();
  });
  currentPosition = computed(() => this.freelancer()?.currentPosition || 'Freelancer');

  private missionId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private activeMissionService: ActiveMissionService,
    private freelancerService: FreelancerService,
    private notificationService: NotificationService,
    public authService: AuthService,
    public themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('id') || '';

    // Determine if current user is freelancer
    this.freelancerService.getMyProfile().subscribe({
      next: (profile) => {
        this.freelancer.set(profile);
        this.isFreelancer.set(true);
      },
      error: () => this.isFreelancer.set(false),
    });

    this.loadMission();
    this.notificationService.getUnreadCount().subscribe();
    this.startGitAutoRefresh();
  }

  private startGitAutoRefresh(): void {
    interval(this.GIT_POLL_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.mission()?.gitRepositoryUrl) {
          this.refreshGit(true);
        }
      });
  }

  loadMission(): void {
    this.activeMissionService.getMission(this.missionId).subscribe({
      next: (m) => {
        this.mission.set(m);
        this.newGitUrl = m.gitRepositoryUrl || '';
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.activeMissionService.getTasks(this.missionId).subscribe({
      next: (tasks) => this.tasks.set(tasks),
    });

    this.activeMissionService.getDeliverables(this.missionId).subscribe({
      next: (deliverables) => this.deliverables.set(deliverables),
    });
  }

  // ── Kanban drag-and-drop ──────────────────────────────────────────────────

  drop(event: CdkDragDrop<Task[]>, targetStatus: 'TODO' | 'IN_PROGRESS' | 'DONE'): void {
    const task: Task = event.item.data;
    if (task.status !== targetStatus) {
      this.activeMissionService.updateTask(this.missionId, task.id, { status: targetStatus }).subscribe({
        next: () => {
          this.activeMissionService.getTasks(this.missionId).subscribe({
            next: (tasks) => this.tasks.set(tasks),
          });
          this.activeMissionService.getMission(this.missionId).subscribe({
            next: (m) => this.mission.set(m),
          });
        },
      });
    }
  }

  // ── Add Task ──────────────────────────────────────────────────────────────

  openAddTaskForm(column: string): void {
    this.showAddTaskForm.set(column);
    this.newTaskTitle = '';
    this.newTaskDescription = '';
  }

  cancelAddTask(): void {
    this.showAddTaskForm.set(null);
  }

  submitAddTask(): void {
    const title = this.newTaskTitle.trim();
    if (!title) return;
    this.addingTask.set(true);
    this.activeMissionService.createTask(this.missionId, title, this.newTaskDescription || undefined).subscribe({
      next: () => {
        this.activeMissionService.getTasks(this.missionId).subscribe({
          next: (tasks) => this.tasks.set(tasks),
        });
        this.activeMissionService.getMission(this.missionId).subscribe({
          next: (m) => this.mission.set(m),
        });
        this.showAddTaskForm.set(null);
        this.newTaskTitle = '';
        this.newTaskDescription = '';
        this.addingTask.set(false);
      },
      error: () => this.addingTask.set(false),
    });
  }

  openEditTask(task: Task, event: Event): void {
    event.stopPropagation();
    this.editingTaskId.set(task.id);
    this.editTaskTitle = task.title;
    this.editTaskDescription = task.description || '';
  }

  cancelEditTask(event?: Event): void {
    event?.stopPropagation();
    this.editingTaskId.set(null);
  }

  submitEditTask(taskId: string, event?: Event): void {
    event?.stopPropagation();
    const title = this.editTaskTitle.trim();
    if (!title) return;
    this.savingTask.set(true);
    this.activeMissionService.updateTask(this.missionId, taskId, {
      title,
      description: this.editTaskDescription.trim() || undefined,
    }).subscribe({
      next: () => {
        this.activeMissionService.getTasks(this.missionId).subscribe({
          next: (tasks) => this.tasks.set(tasks),
        });
        this.editingTaskId.set(null);
        this.savingTask.set(false);
      },
      error: () => this.savingTask.set(false),
    });
  }

  deleteTask(taskId: string, event: Event): void {
    event.stopPropagation();
    this.activeMissionService.deleteTask(this.missionId, taskId).subscribe({
      next: () => {
        this.activeMissionService.getTasks(this.missionId).subscribe({
          next: (tasks) => this.tasks.set(tasks),
        });
        this.activeMissionService.getMission(this.missionId).subscribe({
          next: (m) => this.mission.set(m),
        });
      },
    });
  }

  // ── Git Activity ──────────────────────────────────────────────────────────

  onGitUrlChange(): void {
    this.gitUrlValidation.set(null);
  }

  testGitUrl(): void {
    const url = this.newGitUrl.trim();
    if (!url || this.gitUrlFormatError) return;
    this.testingGitUrl.set(true);
    this.gitUrlValidation.set(null);
    this.activeMissionService.validateGitUrl(this.missionId, url).subscribe({
      next: (result) => {
        this.gitUrlValidation.set(result);
        this.testingGitUrl.set(false);
      },
      error: () => {
        this.gitUrlValidation.set({ valid: false, message: 'Impossible de vérifier le dépôt.' });
        this.testingGitUrl.set(false);
      },
    });
  }

  saveGitUrl(): void {
    const url = this.newGitUrl.trim();
    if (!url) return;
    this.gitError.set('');
    this.activeMissionService.setGitRepoUrl(this.missionId, url).subscribe({
      next: (m) => {
        this.mission.set(m);
        this.showGitUrlForm.set(false);
        this.gitUrlValidation.set(null);
      },
      error: () => this.gitError.set('Failed to save repository URL.'),
    });
  }

  refreshGit(silent = false): void {
    if (!silent) this.refreshingGit.set(true);
    this.gitError.set('');
    this.activeMissionService.refreshGitActivity(this.missionId).subscribe({
      next: () => {
        this.activeMissionService.getMission(this.missionId).subscribe({
          next: (m) => {
            this.mission.set(m);
            this.lastGitRefresh.set(new Date());
            this.refreshingGit.set(false);
          },
        });
      },
      error: (err) => {
        if (!silent) this.gitError.set(err?.error?.message || 'Failed to fetch GitHub data.');
        this.refreshingGit.set(false);
      },
    });
  }

  // ── Deliverables ──────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }

  uploadDeliverable(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.uploadingDeliverable.set(true);
    this.activeMissionService.uploadDeliverable(this.missionId, file, this.deliverableDescription || undefined).subscribe({
      next: (newDeliverable) => {
        this.deliverables.update(list => [...list, newDeliverable]);
        this.selectedFile.set(null);
        this.deliverableDescription = '';
        this.uploadingDeliverable.set(false);
      },
      error: () => this.uploadingDeliverable.set(false),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  getFileUrl(relativePath: string | null | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  get profilePicture(): string | undefined {
    return this.freelancer()?.profilePicture;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'SUBMITTED': return 'status-submitted';
      case 'COMPLETED': return 'status-completed';
      case 'PAUSED': return 'status-paused';
      case 'DISPUTE': return 'status-dispute';
      default: return '';
    }
  }

  isDeadlinePassed(): boolean {
    const end = this.mission()?.endDate;
    if (!end) return false;
    return new Date(end) <= new Date();
  }

  // ── Submission ────────────────────────────────────────────────────────────

  canSubmit(): boolean {
    const status = this.mission()?.status;
    return status === 'ACTIVE' || status === 'PAUSED';
  }

  submitMission(): void {
    this.submitting.set(true);
    this.activeMissionService.submitMission(this.missionId, this.submissionNote || undefined).subscribe({
      next: (m) => {
        this.mission.set(m);
        this.showSubmitForm.set(false);
        this.submissionNote = '';
        this.submitting.set(false);
        this.submitSuccess.set(true);
        setTimeout(() => this.submitSuccess.set(false), 4000);
      },
      error: () => this.submitting.set(false),
    });
  }
}
