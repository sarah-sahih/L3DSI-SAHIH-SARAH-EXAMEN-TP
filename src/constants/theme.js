// Theme and styling constants for MyTasks app

export const COLORS = {
  // Primary brand
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryDark: '#1D4ED8',

  // Status & Priority colors
  priority: {
    Faible: {
      color: '#16A34A',
      background: '#DCFCE7',
      border: '#86EFAC',
      label: 'Faible',
    },
    Moyenne: {
      color: '#D97706',
      background: '#FEF3C7',
      border: '#FCD34D',
      label: 'Moyenne',
    },
    Élevée: {
      color: '#DC2626',
      background: '#FEE2E2',
      border: '#FCA5A5',
      label: 'Élevée',
    },
  },

  status: {
    'À faire': {
      color: '#0284C7',
      background: '#E0F2FE',
      border: '#7DD3FC',
      label: 'À faire',
    },
    Terminée: {
      color: '#16A34A',
      background: '#DCFCE7',
      border: '#86EFAC',
      label: 'Terminée',
    },
  },

  // Stats cards colors
  stats: {
    total: {
      background: '#EFF6FF',
      text: '#1D4ED8',
      label: '#3B82F6',
    },
    completed: {
      background: '#ECFDF5',
      text: '#047857',
      label: '#10B981',
    },
    pending: {
      background: '#FFF7ED',
      text: '#C2410C',
      label: '#F97316',
    },
  },

  // UI colors
  background: '#F8FAFC',
  cardBackground: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderFocus: '#2563EB',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  success: '#10B981',
  white: '#FFFFFF',
};
