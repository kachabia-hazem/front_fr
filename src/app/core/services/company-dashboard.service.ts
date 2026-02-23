import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, catchError } from 'rxjs';
import { MissionService } from './mission.service';
import { ApplicationService } from './application.service';
import { Mission } from '../models/mission.model';
import { Application } from '../models/application.model';

export interface CompanyDashboardStats {
  totalMissions: number;
  totalApplications: number;
  activeMissions: number;
  missionsPerMonth: number[];
  applicationsPerMission: { title: string; count: number }[];
  missionsByStatus: { [key: string]: number };
  monthlySpending: number[];
  monthLabels: string[];
}

@Injectable({ providedIn: 'root' })
export class CompanyDashboardService {

  constructor(
    private missionService: MissionService,
    private applicationService: ApplicationService,
  ) {}

  getStats(): Observable<CompanyDashboardStats> {
    return forkJoin({
      missions: this.missionService.getMyMissions().pipe(catchError(() => of([] as Mission[]))),
      applications: this.applicationService.getCompanyApplications().pipe(catchError(() => of([] as Application[]))),
    }).pipe(
      map(({ missions, applications }) => this.computeStats(missions, applications))
    );
  }

  private computeStats(missions: Mission[], applications: Application[]): CompanyDashboardStats {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const activeMissions = missions.filter(
      m => m.status === 'OPEN' || m.status === 'IN_PROGRESS'
    ).length;

    // Missions per month (last 6 months)
    const missionsPerMonth: number[] = [];
    const monthLabels: string[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      monthLabels.push(monthNames[month]);

      const count = missions.filter(m => {
        if (!m.createdAt) return false;
        const cd = new Date(m.createdAt);
        return cd.getMonth() === month && cd.getFullYear() === year;
      }).length;
      missionsPerMonth.push(count);
    }

    // Applications per mission (top 6)
    const appCountMap: { [missionId: string]: number } = {};
    const missionTitleMap: { [missionId: string]: string } = {};
    missions.forEach(m => {
      if (m.id) missionTitleMap[m.id] = m.jobTitle;
    });
    applications.forEach(a => {
      appCountMap[a.missionId] = (appCountMap[a.missionId] || 0) + 1;
    });
    const applicationsPerMission = Object.entries(appCountMap)
      .map(([missionId, count]) => ({
        title: missionTitleMap[missionId] || missionId,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Missions by status
    const missionsByStatus: { [key: string]: number } = {
      OPEN: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0, CLOSED: 0,
    };
    missions.forEach(m => {
      const s = m.status || 'OPEN';
      if (missionsByStatus[s] !== undefined) {
        missionsByStatus[s]++;
      }
    });

    // Monthly spending (sum of TJM per month, last 6 months)
    const monthlySpending: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();

      const spending = missions
        .filter(m => {
          if (!m.createdAt) return false;
          const cd = new Date(m.createdAt);
          return cd.getMonth() === month && cd.getFullYear() === year;
        })
        .reduce((sum, m) => sum + (m.tjm || 0), 0);
      monthlySpending.push(spending);
    }

    return {
      totalMissions: missions.length,
      totalApplications: applications.length,
      activeMissions,
      missionsPerMonth,
      applicationsPerMission,
      missionsByStatus,
      monthlySpending,
      monthLabels,
    };
  }
}
