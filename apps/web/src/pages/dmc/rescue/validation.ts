// [SE3070 - ADDED] Frontend validation consistent with backend phone format.
export function validateField(field: string, value: string | number): Record<string,string> {
 const text=String(value).trim()
 let message=''
 if(field==='teamName' && !text) message='Team name is required.'
 if(field==='memberCount' && (!Number.isInteger(Number(value)) || Number(value)<1)) message='Enter at least one member.'
 if(field==='contactPhone' && text && !/^(?:0[0-9]{9}|\+94[0-9]{9})$/.test(text)) message='Use 0771234567 or +94771234567.'
 return {[field]:message}
}
export function validateForm(name:string, count:number, phone:string, _contactPerson?:string, _baseStation?:string) {
 const errors:Record<string,string>={}
 for(const [field,value] of [['teamName',name],['memberCount',count],['contactPhone',phone]] as const){
  const result=validateField(field,value);if(result[field]) errors[field]=result[field]
 }
 return errors
}
