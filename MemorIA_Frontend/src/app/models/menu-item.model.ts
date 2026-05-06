export interface MenuItem {
    label: string;
    icon: string;
    route: string;
    badge?: number;
    badgeColor?: string;
    role?: 'CAREGIVER' | 'DOCTOR' | 'ALL';
}
