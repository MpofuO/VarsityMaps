import { CampusAdminRole, StandardUserRole, SystemAdminRole, UniversityAdminRole } from '../services/account-service';

export const RoleHomeRoutes: Record<string, string> = {
  [SystemAdminRole]: '/system-admin',
  [UniversityAdminRole]: '/university-admin',
  [CampusAdminRole]: '/admin/campus',
  [StandardUserRole]: '/map'
};

export function roleHomeRoute(role: string): string {
  return RoleHomeRoutes[role] ?? '/';
}
