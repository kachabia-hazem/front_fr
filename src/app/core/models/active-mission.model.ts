export interface ActiveMission {
  id: string;
  contractId: string;
  freelancerId: string;
  companyId: string;
  title: string;
  description: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'DISPUTE';
  progress: number;
  startDate: string;
  endDate: string;
  gitRepositoryUrl?: string;
  gitCurrentBranch?: string;
  gitCommitCount?: number;
  gitLastPushDate?: string;
  gitLastCommitMessage?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  missionId: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  orderIndex: number;
  createdAt: string;
}

export interface Deliverable {
  id: string;
  missionId: string;
  freelancerId: string;
  fileUrl: string;
  fileName: string;
  description?: string;
  uploadedAt: string;
}

export interface GitActivityResponse {
  lastCommitMessage?: string;
  lastPushDate?: string;
  branch?: string;
  commitCount?: number;
}
