import { UserRole, roleHierarchy } from "./userRole.enum";


export function hasPermission(userRoles: string[], requiredRoles: string[]): boolean {
    return requiredRoles.some(requiredRole => 
        userRoles.some(userRole => 
            roleHierarchy[userRole as UserRole]?.includes(requiredRole as UserRole)
    ));
}
    
export function getAllowedRoles(userRole: string): string[] {
    return roleHierarchy[userRole as UserRole] || [];
}
    
export function isValidRole(role: string): boolean {
    return Object.values(UserRole).includes(role as UserRole);
}