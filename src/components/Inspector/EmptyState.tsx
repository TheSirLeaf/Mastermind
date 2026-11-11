// components/Inspector/EmptyState.tsx
interface EmptyStateProps {
  message: string;
  icon?: 'package' | 'layout' | 'image' | 'code';
}

export function EmptyState({ message, icon = 'layout' }: EmptyStateProps) {
  const icons: Record<string, React.ReactNode> = {
    package: (
      <svg
        className="w-8 h-8 mx-auto mb-2"
        style={{ color: '#6d565b' }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
    layout: (
      <svg
        className="w-8 h-8 mx-auto mb-2"
        style={{ color: '#6d565b' }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    image: (
      <svg
        className="w-8 h-8 mx-auto mb-2"
        style={{ color: '#6d565b' }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
    code: (
      <svg
        className="w-8 h-8 mx-auto mb-2"
        style={{ color: '#6d565b' }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  };

  return (
    <div className="p-3">
      <div style={{ padding: '34px 22px', textAlign: 'center' }}>
        {icons[icon]}
        <b style={{ display: 'block', color: '#F3E6E2', marginBottom: '4px' }}>{message}</b>
      </div>
    </div>
  );
}
