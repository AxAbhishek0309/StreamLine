'use client'

import { CreditCard, Check } from 'lucide-react'

const plans = [
  { name: 'Free', price: '$0', features: ['Up to 10 documents/month', 'Basic OCR', 'Email support'], current: false },
  { name: 'Pro', price: '$29', features: ['Unlimited documents', 'Advanced analysis', 'Priority support', 'API access'], current: true },
  { name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'Dedicated support', 'Custom integrations', 'SLA'], current: false },
]

export function BillingSettings() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
        <CreditCard className="h-5 w-5" />
        Billing & Plan
      </h2>
      
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-lg p-4 border transition-all ${
              plan.current
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-accent/50'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">{plan.name}</h3>
                <p className="text-2xl font-bold text-foreground mt-1">{plan.price}</p>
              </div>
              {plan.current && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-accent text-accent-foreground">
                  Current
                </span>
              )}
            </div>
            <ul className="space-y-2 mb-4">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              disabled={plan.current}
              className={`w-full py-2 rounded-lg font-medium text-sm transition-colors ${
                plan.current
                  ? 'bg-card-foreground/10 text-muted-foreground cursor-not-allowed'
                  : 'bg-accent text-accent-foreground hover:opacity-90'
              }`}
            >
              {plan.current ? 'Current Plan' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>
      
      <div className="border-t border-border pt-4">
        <p className="text-sm text-muted-foreground mb-4">
          Your next billing date is <span className="font-medium text-foreground">May 15, 2024</span>
        </p>
        <button className="text-sm text-accent hover:text-accent/80 font-medium">
          View Invoice History
        </button>
      </div>
    </div>
  )
}
