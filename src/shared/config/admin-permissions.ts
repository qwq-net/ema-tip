import { ROLES } from '@/entities/user/constants';

const TIPSTER_ALLOWED_PREFIXES = ['/admin/forecasts', '/admin/guide'] as const;

export function canAccessAdminRoute(pathname: string, role: string | null | undefined): boolean {
  if (role === ROLES.ADMIN) {
    return true;
  }

  if (role === ROLES.TIPSTER) {
    return TIPSTER_ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
  }

  return false;
}

export const TIPSTER_DEFAULT_ROUTE = '/admin/forecasts';
