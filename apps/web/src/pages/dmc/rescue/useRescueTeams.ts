import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RescueTeamItem, RescueTeamStatus } from './types'
import { listTeams, listDistricts, updateTeamStatus, deleteTeam } from './api'
// [SE3070 - MODIFIED] Data loading and team operations
export function useRescueTeams(token:string,registeredDistrict?:string,assignedDistricts?:string[]){
 const [districtsList,setDistrictsList]=useState<string[]>([])
 const [isLoadingDistricts,setIsLoadingDistricts]=useState(false)
 const [selectedDistrict,setSelectedDistrict]=useState(registeredDistrict||'ALL')
 const [teams,setTeams]=useState<RescueTeamItem[]>([])
 const [isLoading,setIsLoading]=useState(false)
 const [error,setError]=useState('')
 const allDistricts=useMemo(()=>Array.from(new Set([registeredDistrict,...(assignedDistricts||[]),...districtsList].filter((x):x is string=>Boolean(x)))).sort(),[registeredDistrict,assignedDistricts,districtsList])
 const fetchDistricts=useCallback(async()=>{setIsLoadingDistricts(true);try{setDistrictsList(await listDistricts())}catch{/* use fallback districts */}finally{setIsLoadingDistricts(false)}},[])
 useEffect(()=>{void fetchDistricts()},[fetchDistricts])
 const fetchTeams=useCallback(async(district:string)=>{setIsLoading(true);setError('');try{setTeams(await listTeams(token,district))}catch(err){setError(err instanceof Error?err.message:'Could not fetch teams.')}finally{setIsLoading(false)}},[token])
 useEffect(()=>{void fetchTeams(selectedDistrict)},[fetchTeams,selectedDistrict])
 const handleQuickStatusChange=async(team:RescueTeamItem,status:RescueTeamStatus)=>{try{await updateTeamStatus(token,team._id,status);await fetchTeams(selectedDistrict)}catch(err){alert(err instanceof Error?err.message:'Status update failed')}}
 const handleDeleteTeam=async(team:RescueTeamItem,onAfterDelete:()=>void)=>{try{await deleteTeam(token,team._id);onAfterDelete();await fetchTeams(selectedDistrict)}catch(err){alert(err instanceof Error?err.message:'Delete failed')}}
 return {teams,isLoading,error,selectedDistrict,setSelectedDistrict,allDistricts,isLoadingDistricts,fetchTeams,fetchDistricts,handleQuickStatusChange,handleDeleteTeam}
}
