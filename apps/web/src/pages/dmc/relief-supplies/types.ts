export type Category =
  | 'FOOD'
  | 'WATER'
  | 'MEDICAL'
  | 'CLOTHING'
  | 'HYGIENE'
  | 'SHELTER_EQUIPMENT'
  | 'OTHER'

export type Unit =
  | 'PIECES'
  | 'PACKETS'
  | 'BOXES'
  | 'KILOGRAMS'
  | 'LITRES'
  | 'BOTTLES'
  | 'SETS'

export type SupplyStatus = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'INACTIVE'

export type RequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_ALLOCATED'
  | 'ALLOCATED'
  | 'CANCELLED'

export type DistributionStatus =
  | 'ALLOCATED'
  | 'DISPATCHED'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'CANCELLED'

export type ReviewDecision = 'APPROVED' | 'REJECTED'

export type ReliefSuppliesTab = 'inventory' | 'distributions' | 'requests'

export interface Supply {
  _id: string
  name: string
  supplyCode: string
  category: Category
  unit: Unit
  totalQuantity: number
  availableQuantity: number
  reservedQuantity: number
  minimumStockLevel: number
  storageLocation?: string
  description?: string
  status: SupplyStatus
}

export interface Shelter {
  _id?: string
  id?: string
  name: string
  district: string
  isActive?: boolean
  operationalStatus?: string
}

export interface SupplyRequest {
  _id: string
  shelterId: Shelter | string
  requestedBy?: { fullName?: string; email?: string } | string
  category: Category
  itemName: string
  unit: Unit
  requestedQuantity: number
  reason: string
  status: RequestStatus
  decisionNotes?: string
  createdAt?: string
}

export interface Distribution {
  _id: string
  supplyId: Supply | string
  shelterId: Shelter | string
  shelterName: string
  allocatedQuantity: number
  dispatchedQuantity: number
  deliveredQuantity: number
  status: DistributionStatus
  notes?: string
}
