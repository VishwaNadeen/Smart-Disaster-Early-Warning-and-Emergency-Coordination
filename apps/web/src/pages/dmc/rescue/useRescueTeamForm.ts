import { useState, type FormEvent } from 'react'
import type { RescueTeamItem, RescueTeamType, RescueTeamStatus } from './types'
import { createTeam, updateTeam, type TeamPayload } from './api'
import { validateField, validateForm } from './validation'
// [SE3070 - MODIFIED] Registration and edit state
export function useRescueTeamForm(token:string,selectedDistrict:string,registeredDistrict?:string){
 const [showAddModal,setShowAddModal]=useState(false)
 const [teamToEdit,setTeamToEdit]=useState<RescueTeamItem|null>(null)
 const [isSubmitting,setIsSubmitting]=useState(false)
 const [formError,setFormError]=useState('')
 const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({})
 const [formTeamId,setFormTeamId]=useState('')
 const [formTeamName,setFormTeamName]=useState('')
 const [formTeamType,setFormTeamType]=useState<RescueTeamType>('ARMY')
 const [formMemberCount,setFormMemberCount]=useState(10)
 const [formDistrict,setFormDistrict]=useState('')
 const [formBaseStation,setFormBaseStation]=useState('')
 const [formContactPerson,setFormContactPerson]=useState('')
 const [formContactPhone,setFormContactPhone]=useState('')
 const [formStatus,setFormStatus]=useState<RescueTeamStatus>('AVAILABLE')
 const [formSpecialization,setFormSpecialization]=useState('')
 const [formNotes,setFormNotes]=useState('')
 const handleOpenAddModal=()=>{setTeamToEdit(null);setFormTeamId('');setFormTeamName('');setFormTeamType('ARMY');setFormMemberCount(10);setFormDistrict(selectedDistrict!=='ALL'?selectedDistrict:registeredDistrict||'');setFormBaseStation('');setFormContactPerson('');setFormContactPhone('');setFormStatus('AVAILABLE');setFormSpecialization('');setFormNotes('');setFormError('');setFieldErrors({});setShowAddModal(true)}
 const handleOpenEditModal=(team:RescueTeamItem)=>{setShowAddModal(false);setTeamToEdit(team);setFormTeamId(team.teamId);setFormTeamName(team.teamName);setFormTeamType(team.teamType);setFormMemberCount(team.memberCount);setFormDistrict(team.district||'');setFormBaseStation(team.baseStation||'');setFormContactPerson(team.contactPerson||'');setFormContactPhone(team.contactPhone||'');setFormStatus(team.status);setFormSpecialization((team.specialization||[]).join(', '));setFormNotes(team.notes||'');setFormError('');setFieldErrors({})}
 const handleFieldChange=(field:string,value:string)=>{
  setFieldErrors(prev=>({...prev,[field]:''}))
  switch(field){case 'teamId':setFormTeamId(value);break;case 'teamName':setFormTeamName(value);break;case 'teamType':setFormTeamType(value as RescueTeamType);break;case 'memberCount':setFormMemberCount(Number(value));break;case 'district':setFormDistrict(value);break;case 'baseStation':setFormBaseStation(value);break;case 'contactPerson':setFormContactPerson(value);break;case 'contactPhone':setFormContactPhone(value);break;case 'status':setFormStatus(value as RescueTeamStatus);break;case 'specialization':setFormSpecialization(value);break;case 'notes':setFormNotes(value);break}
 }
 const buildPayload=():TeamPayload=>({teamId:formTeamId.trim()||undefined,teamName:formTeamName.trim(),teamType:formTeamType,memberCount:Number(formMemberCount),district:formDistrict.trim()||undefined,baseStation:formBaseStation.trim()||undefined,contactPerson:formContactPerson.trim()||undefined,contactPhone:formContactPhone.trim()||undefined,status:formStatus,specialization:formSpecialization.split(',').map(s=>s.trim()).filter(Boolean),notes:formNotes.trim()||undefined})
 const submit=async(e:FormEvent,onSuccess:()=>void,edit:boolean)=>{e.preventDefault();if(isSubmitting)return;const errors=validateForm(formTeamName,formMemberCount,formContactPhone,formContactPerson,formBaseStation);if(Object.keys(errors).length){setFieldErrors(errors);setFormError('Please fix the validation errors below.');return}setIsSubmitting(true);setFormError('');try{if(edit){if(!teamToEdit)return;await updateTeam(token,teamToEdit._id,buildPayload());setTeamToEdit(null)}else{await createTeam(token,buildPayload());setShowAddModal(false)}onSuccess()}catch(err){setFormError(err instanceof Error?err.message:'Could not save team.')}finally{setIsSubmitting(false)}}
 const handleSubmitAdd=(e:FormEvent,onSuccess:()=>void)=>submit(e,onSuccess,false)
 const handleSubmitEdit=(e:FormEvent,onSuccess:()=>void)=>submit(e,onSuccess,true)
 return {showAddModal,setShowAddModal,teamToEdit,setTeamToEdit,isSubmitting,formError,setFormError,fieldErrors,setFieldErrors,formTeamId,setFormTeamId,formTeamName,setFormTeamName,formTeamType,setFormTeamType,formMemberCount,setFormMemberCount,formDistrict,setFormDistrict,formBaseStation,setFormBaseStation,formContactPerson,setFormContactPerson,formContactPhone,setFormContactPhone,formStatus,setFormStatus,formSpecialization,setFormSpecialization,formNotes,setFormNotes,handleFieldChange,handleOpenAddModal,handleOpenEditModal,handleSubmitAdd,handleSubmitEdit,validateField}
}
