import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, catchError } from 'rxjs';
import { ApplicationService } from './application.service';
import { FreelancerService } from './freelancer.service';
import { Application } from '../models/application.model';
import { Freelancer } from '../models';

export interface DashboardStats {
  totalApplications: number;
  inProgressMissions: number;
  acceptedMissions: number;
  rejectedMissions: number;
  revenue: number;
  currentMissionsAmount: number;
  completedProjects: number;
  tjm: number;
  applicationsTrend: number; // percentage vs last month
  missionsTrend: number;    // percentage vs last month
  monthlyRevenue: number[];  // last 6 months
  monthLabels: string[];
  visibility: {
    appearances: number;
    views: number;
    favorites: number;
  };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {

  constructor(
    private applicationService: ApplicationService,
    private freelancerService: FreelancerService,
  ) {}

  getDashboardStats(): Observable<DashboardStats> {
    return forkJoin({
      applications: this.applicationService.getMyApplications().pipe(catchError(() => of([] as Application[]))),
      profile: this.freelancerService.getMyProfile().pipe(catchError(() => of(null as Freelancer | null))),
    }).pipe(
      map(({ applications, profile }) => this.computeStats(applications, profile))
    );
  }

  private computeStats(applications: Application[], profile: Freelancer | null): DashboardStats {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const pending = applications.filter(a => a.status === 'PENDING');
    const accepted = applications.filter(a => a.status === 'ACCEPTED');
    const rejected = applications.filter(a => a.status === 'REJECTED');
    const inProgress = pending.length + accepted.length;

    // Applications this month vs last month for trend
    const thisMonthApps = applications.filter(a => {
      const d = new Date(a.submittedAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
    const lastMonthApps = applications.filter(a => {
      const d = new Date(a.submittedAt);
      return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
    });

    const applicationsTrend = lastMonthApps.length > 0
      ? Math.round(((thisMonthApps.length - lastMonthApps.length) / lastMonthApps.length) * 100)
      : thisMonthApps.length > 0 ? 100 : 0;

    // Missions trend (in progress this month vs last)
    const thisMonthMissions = applications.filter(a => {
      const d = new Date(a.submittedAt);
      return (a.status === 'PENDING' || a.status === 'ACCEPTED')
        && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    const lastMonthMissions = applications.filter(a => {
      const d = new Date(a.submittedAt);
      return (a.status === 'PENDING' || a.status === 'ACCEPTED')
        && d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
    });
    const missionsTrend = lastMonthMissions.length > 0
      ? Math.round(((thisMonthMissions.length - lastMonthMissions.length) / lastMonthMissions.length) * 100)
      : thisMonthMissions.length > 0 ? 100 : 0;

    const tjm = profile?.tjm || 0;
    const completedProjects = profile?.completedProjects || 0;
    const revenue = tjm * completedProjects;
    const currentMissionsAmount = tjm * accepted.length;

    // Monthly revenue for last 6 months (based on accepted applications per month * TJM)
    const monthlyRevenue: number[] = [];
    const monthLabels: string[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      monthLabels.push(monthNames[month]);

      const monthAccepted = applications.filter(a => {
        const ad = new Date(a.submittedAt);
        return a.status === 'ACCEPTED' && ad.getMonth() === month && ad.getFullYear() === year;
      });
      monthlyRevenue.push(monthAccepted.length * tjm);
    }

    return {
      totalApplications: applications.length,
      inProgressMissions: inProgress,
      acceptedMissions: accepted.length,
      rejectedMissions: rejected.length,
      revenue,
      currentMissionsAmount,
      completedProjects,
      tjm,
      applicationsTrend,
      missionsTrend,
      monthlyRevenue,
      monthLabels,
      visibility: {
        appearances: profile?.searchAppearances || 0,
        views: profile?.profileViews || 0,
        favorites: 0,
      },
    };
  }
}
