import type { ConnectionState } from '../../shared/protocol'

const LABELS: Record<ConnectionState, string> = {
  connected: 'Connected',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
}

export function ConnectionIndicator({ state }: { state: ConnectionState }) {
  return <span className={`connection-indicator ${state}`}><i /> Server: {LABELS[state]}</span>
}
