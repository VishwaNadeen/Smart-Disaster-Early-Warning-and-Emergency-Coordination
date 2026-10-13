// [SE3070 - MODIFIED] Shared rescue team types
export type RescueTeamType = 'ARMY' | 'NAVY' | 'AIR_FORCE' | 'POLICE' | 'FIRE_RESCUE' | 'COAST_GUARD' | 'MEDICAL_EMT' | 'DISASTER_RELIEF' | 'OTHER'
export type RescueTeamStatus = 'AVAILABLE' | 'DEPLOYED' | 'STANDBY' | 'OFF_DUTY'
export interface RescueTeamItem {
  _id: string; teamId: string; teamName: string; teamType: RescueTeamType;
  memberCount: number; district?: string; baseStation?: string;
  contactPerson?: string; contactPhone?: string; status: RescueTeamStatus;
  specialization?: string[]; notes?: string; createdByName?: string;
  createdAt?: string; updatedAt?: string
}
export interface RescueTeamsSectionProps {
  token: string; registeredDistrict?: string; assignedDistricts?: string[];
  role?: string; openAddRequest?: number
}
