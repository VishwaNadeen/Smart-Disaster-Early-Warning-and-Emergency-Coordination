import { AlertCircle, Boxes, ClipboardList, PackagePlus, Truck } from 'lucide-react'

import type { Distribution, ReliefSuppliesTab, Supply } from './types'

interface Props {
  supplies: Supply[]
  distributions: Distribution[]
  pendingRequestCount: number
  tab: ReliefSuppliesTab
  onTabChange: (tab: ReliefSuppliesTab) => void
}

function Metric({
  title,
  value,
  icon,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-lg bg-teal-50 p-3 text-teal-700">{icon}</div>
      </div>
    </article>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${
        active
          ? 'border-teal-600 text-teal-700'
          : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

export default function SupplyOverview({
  supplies,
  distributions,
  pendingRequestCount,
  tab,
  onTabChange,
}: Props) {
  const availableTotal = supplies.reduce(
    (sum, supply) => sum + (Number(supply.availableQuantity) || 0),
    0,
  )
  const lowStockCount = supplies.filter(
    (supply) => supply.status === 'LOW_STOCK' || supply.status === 'OUT_OF_STOCK',
  ).length
  const pendingDistributionCount = distributions.filter(
    (item) => !['DELIVERED', 'CANCELLED'].includes(item.status),
  ).length

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Supply items" value={supplies.length} icon={<Boxes />} />
        <Metric
          title="Available units"
          value={availableTotal.toLocaleString()}
          icon={<PackagePlus />}
        />
        <Metric title="Low / out of stock" value={lowStockCount} icon={<AlertCircle />} />
        <Metric
          title="Pending distributions"
          value={pendingDistributionCount}
          icon={<Truck />}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        <TabButton
          active={tab === 'inventory'}
          onClick={() => onTabChange('inventory')}
          icon={<Boxes size={17} />}
        >
          Inventory
        </TabButton>
        <TabButton
          active={tab === 'distributions'}
          onClick={() => onTabChange('distributions')}
          icon={<ClipboardList size={17} />}
        >
          Shelter distributions
        </TabButton>
        <TabButton
          active={tab === 'requests'}
          onClick={() => onTabChange('requests')}
          icon={<ClipboardList size={17} />}
        >
          Shelter requests ({pendingRequestCount})
        </TabButton>
      </div>
    </>
  )
}
