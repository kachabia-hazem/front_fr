import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = authService.userRole();
  if (role === Role.ADMIN) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};
