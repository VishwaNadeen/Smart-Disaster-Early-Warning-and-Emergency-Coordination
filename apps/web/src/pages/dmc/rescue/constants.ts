import type { RescueTeamStatus, RescueTeamType } from './types'
// [SE3070 - MODIFIED] Shared configuration
export const API_URL = 'http://localhost:3000/api'
export const TYPE_CONFIG: Record<RescueTeamType, {label:string; badge:string}> = {
 ARMY:{label:'Sri Lanka Army',badge:'text-emerald-800 bg-emerald-50 border-emerald-200'},
 NAVY:{label:'Sri Lanka Navy',badge:'text-blue-800 bg-blue-50 border-blue-200'},
 AIR_FORCE:{label:'Sri Lanka Air Force',badge:'text-sky-800 bg-sky-50 border-sky-200'},
 POLICE:{label:'Police & STF',badge:'text-indigo-800 bg-indigo-50 border-indigo-200'},
 FIRE_RESCUE:{label:'Fire & Rescue',badge:'text-red-800 bg-red-50 border-red-200'},
 COAST_GUARD:{label:'Coast Guard',badge:'text-cyan-800 bg-cyan-50 border-cyan-200'},
 MEDICAL_EMT:{label:'Medical & EMT',badge:'text-rose-800 bg-rose-50 border-rose-200'},
 DISASTER_RELIEF:{label:'Disaster Relief / Civil',badge:'text-amber-800 bg-amber-50 border-amber-200'},
 OTHER:{label:'Special Unit',badge:'text-slate-800 bg-slate-100 border-slate-200'},
}
export const STATUS_CONFIG: Record<RescueTeamStatus, {label:string; color:string}> = {
 AVAILABLE:{label:'Ready / Available',color:'text-emerald-700 bg-emerald-50 border-emerald-200'},
 DEPLOYED:{label:'Deployed in Field',color:'text-blue-700 bg-blue-50 border-blue-200'},
 STANDBY:{label:'On Standby Alert',color:'text-amber-700 bg-amber-50 border-amber-200'},
 OFF_DUTY:{label:'Off Duty',color:'text-slate-600 bg-slate-100 border-slate-200'},
}
