import React from 'react'

interface StatsCardProps {
  label: string
  value: string | number
  type?: 'primary' | 'error' | 'secondary'
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, type = 'primary' }) => {
  return (
    <div className={`stats-card ${type}`}>
      <span className="stats-label">{label}</span>
      <span className={`stats-value text-${type}`}>{value}</span>
    </div>
  )
}

export default StatsCard
