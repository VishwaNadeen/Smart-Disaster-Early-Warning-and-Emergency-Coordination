import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import type { RescueTeamItem, RescueTeamsSectionProps } from './types'
import { useRescueTeams } from './useRescueTeams'
import { useRescueTeamForm } from './useRescueTeamForm'
import { RescueTeamsHeader } from './components/RescueTeamsHeader'
import { RescueTeamsStats } from './components/RescueTeamsStats'
import { RescueTeamsFilters } from './components/RescueTeamsFilters'
import { RescueTeamsTable } from './components/RescueTeamsTable'
import { RescueTeamsEmptyState } from './components/RescueTeamsEmptyState'
import { RescueTeamFormModal } from './components/RescueTeamFormModal'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'
// [SE3070 - MODIFIED] Main coordinator; presentation and API logic live in separate files.
export default function RescueTeamsSection({token,registeredDistrict,assignedDistricts,openAddRequest=0}:RescueTeamsSectionProps){
 const data=useRescueTeams(token,registeredDistrict,assignedDistricts)
 const form=useRescueTeamForm(token,data.selectedDistrict,registeredDistrict)
 const [teamToDelete,setTeamToDelete]=useState<RescueTeamItem|null>(null)
 const [searchTerm,setSearchTerm]=useState('')
 const [selectedType,setSelectedType]=useState('ALL')
 const [selectedStatus,setSelectedStatus]=useState('ALL')
 const lastAddRequest=useRef(0)
 useEffect(()=>{if(openAddRequest>0&&openAddRequest!==lastAddRequest.current)form.handleOpenAddModal();lastAddRequest.current=openAddRequest},[openAddRequest]) // eslint-disable-line react-hooks/exhaustive-deps
 const filteredTeams=useMemo(()=>data.teams.filter(t=>(selectedType==='ALL'||t.teamType===selectedType)&&(selectedStatus==='ALL'||t.status===selectedStatus)&&(!searchTerm.trim()||[t.teamName,t.teamId,t.contactPerson,t.baseStation,t.district].some(v=>v?.toLowerCase().includes(searchTerm.trim().toLowerCase())))),[data.teams,selectedType,selectedStatus,searchTerm])
 const totalMembers=useMemo(()=>data.teams.reduce((sum,t)=>sum+(t.memberCount||0),0),[data.teams])
 const refresh=()=>{void data.fetchTeams(data.selectedDistrict)}
 const closeForm=()=>{form.setShowAddModal(false);form.setTeamToEdit(null);form.setFormError('');form.setFieldErrors({})}
 const [isDeleting,setIsDeleting]=useState(false)
 const confirmDelete=async()=>{if(!teamToDelete||isDeleting)return;setIsDeleting(true);try{await data.handleDeleteTeam(teamToDelete,()=>setTeamToDelete(null))}finally{setIsDeleting(false)}}
 return <div className="space-y-6"><RescueTeamsHeader selectedDistrict={data.selectedDistrict} registeredDistrict={registeredDistrict} allDistricts={data.allDistricts} isLoadingDistricts={data.isLoadingDistricts} onDistrictChange={data.setSelectedDistrict}/><RescueTeamsStats isLoading={data.isLoading} totalTeams={data.teams.length} deployedCount={data.teams.filter(t=>t.status==='DEPLOYED').length} availableCount={data.teams.filter(t=>t.status==='AVAILABLE').length} totalMembers={totalMembers} selectedDistrict={data.selectedDistrict}/><RescueTeamsFilters searchTerm={searchTerm} onSearchChange={setSearchTerm} selectedType={selectedType} onTypeChange={setSelectedType} selectedStatus={selectedStatus} onStatusChange={setSelectedStatus} isLoading={data.isLoading} onRefresh={refresh}/>{data.error&&<div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"><AlertCircle size={18}/>{data.error}</div>}<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"><div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Rescue Teams Directory ({filteredTeams.length})</h3><span className="text-xs text-slate-500">Only DMC Officers have dispatch and modification authority</span></div></div>{data.isLoading?<div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400"><RefreshCw size={24} className="animate-spin text-teal-600"/><p className="text-xs">Loading emergency rescue teams...</p></div>:filteredTeams.length===0?<RescueTeamsEmptyState selectedDistrict={data.selectedDistrict} onAddTeam={form.handleOpenAddModal}/>:<RescueTeamsTable teams={filteredTeams} onEditTeam={form.handleOpenEditModal} onDeleteTeam={setTeamToDelete} onStatusChange={data.handleQuickStatusChange}/>}</div><RescueTeamFormModal isOpen={form.showAddModal||!!form.teamToEdit} isEdit={!!form.teamToEdit} teamToEdit={form.teamToEdit} isSubmitting={form.isSubmitting} formError={form.formError} fieldErrors={form.fieldErrors} allDistricts={data.allDistricts} formTeamId={form.formTeamId} formTeamName={form.formTeamName} formTeamType={form.formTeamType} formMemberCount={form.formMemberCount} formDistrict={form.formDistrict} formBaseStation={form.formBaseStation} formContactPerson={form.formContactPerson} formContactPhone={form.formContactPhone} formStatus={form.formStatus} formSpecialization={form.formSpecialization} formNotes={form.formNotes} onClose={closeForm} onSubmit={e=>{if(form.teamToEdit)void form.handleSubmitEdit(e,refresh);else void form.handleSubmitAdd(e,refresh)}} onFieldChange={form.handleFieldChange} onValidateField={(field,value)=>form.setFieldErrors(prev=>({...prev,...form.validateField(field,value)}))}/><DeleteConfirmModal teamToDelete={teamToDelete} isSubmitting={isDeleting} onCancel={()=>setTeamToDelete(null)} onConfirm={()=>{void confirmDelete()}}/></div>
}
