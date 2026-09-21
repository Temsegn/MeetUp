import {
  BarChart3,
  Building2,
  Users,
  CreditCard,
  FileText,
  Layers,
  ClipboardList,
  SlidersHorizontal,
  Target,
} from 'lucide-react';

export const ADMIN_NAV = [
  { label: 'SaaS Dashboard', to: '/admin', icon: BarChart3, end: true },
  { label: 'Workspaces', to: '/admin/workspaces', icon: Building2 },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Subscriptions', to: '/admin/subscriptions', icon: Target },
  { label: 'Billing', to: '/admin/billing', icon: CreditCard },
  { label: 'Invoices', to: '/admin/invoices', icon: FileText },
  { label: 'Plans', to: '/admin/plans', icon: Layers },
  { label: 'Audit Logs', to: '/admin/audit-logs', icon: ClipboardList },
  { label: 'System Settings', to: '/admin/system', icon: SlidersHorizontal },
] as const;
