import { API_URL } from './constants'
import type { RescueTeamItem, RescueTeamStatus, RescueTeamType } from './types'
// [SE3070 - ADDED] Centralized API calls
export interface TeamPayload {teamId?:string;teamName:string;teamType:RescueTeamType;memberCount:number;district?:string;baseStation?:string;contactPerson?:string;contactPhone?:string;status:RescueTeamStatus;specialization:string[];notes?:string}
async function request<T>(path:string,token:string,options:RequestInit={}):Promise<T>{
 const res=await fetch(`${API_URL}${path}`,{...options,headers:{Authorization:`Bearer ${token}`,Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}})
 const body=await res.json().catch(()=>null)
 if(!res.ok){const msg=body?.message;throw new Error(Array.isArray(msg)?msg.join(', '):typeof msg==='string'?msg:`Request failed (${res.status})`)}
 return body as T
}
export async function listTeams(token:string,district:string):Promise<RescueTeamItem[]>{
 const query=district&&district!=='ALL'?`?district=${encodeURIComponent(district)}`:''
 const result=await request<{data?:RescueTeamItem[]}|RescueTeamItem[]>(`/rescue-teams${query}`,token)
 return Array.isArray(result)?result:Array.isArray(result?.data)?result.data:[]
}
export async function listDistricts():Promise<string[]>{
 const res=await fetch(`${API_URL}/reports/districts`,{headers:{Accept:'application/json'}})
 if(!res.ok)throw new Error('Districts unavailable')
 const body=await res.json();return Array.isArray(body?.data)?body.data.filter((d:unknown):d is string=>typeof d==='string'):[]
}
export const createTeam=(token:string,payload:TeamPayload)=>request('/rescue-teams',token,{method:'POST',body:JSON.stringify(payload)})
export const updateTeam=(token:string,id:string,payload:TeamPayload)=>request(`/rescue-teams/${encodeURIComponent(id)}`,token,{method:'PATCH',body:JSON.stringify(payload)})
export const updateTeamStatus=(token:string,id:string,status:RescueTeamStatus)=>request(`/rescue-teams/${encodeURIComponent(id)}/status`,token,{method:'PATCH',body:JSON.stringify({status})})
export const deleteTeam=(token:string,id:string)=>request(`/rescue-teams/${encodeURIComponent(id)}`,token,{method:'DELETE'})
