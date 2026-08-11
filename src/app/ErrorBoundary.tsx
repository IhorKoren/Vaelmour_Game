import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('client_render_error', { error, componentStack: info.componentStack }) }
  render() {
    if (this.state.failed) return <main className="app-status"><h1>Сталася помилка</h1><p>Спробуйте перезавантажити гру. Стан бою відновиться із серверного snapshot.</p><button onClick={() => window.location.reload()}>Спробувати перезавантажити</button></main>
    return this.props.children
  }
}
