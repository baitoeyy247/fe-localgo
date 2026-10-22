import { AuthService } from '../core/auth.service';

/** Show LINE notification copy only for real LINE sessions (not dev/SIT personas). */
export function shouldShowLineNotificationHint(auth: AuthService): boolean {
  return auth.authMode() === 'line';
}
