import { CampusAdminRole, StandardUserRole, SystemAdminRole, UniversityAdminRole } from '../services/account-service';

export interface NavLink {
    label: string;
    path: string;
}

const RoleNavLinks: Record<string, NavLink[]> = {
    [SystemAdminRole]: [
        { label: 'Universities', path: '/system-admin/universities' },
        { label: 'Applications', path: '/system-admin/applications' }
    ],
    [UniversityAdminRole]: [],
    [CampusAdminRole]: [],
    [StandardUserRole]: []
};

export function roleNavLinks(role: string): NavLink[] {
    return RoleNavLinks[role] ?? [];
}