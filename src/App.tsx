import { useEffect, useState } from 'react'
import { AppRouter } from './app/routing/AppRouter'
import type { Character } from './types/game'
import { bootstrapAuthentication, clearSessionToken, createAuthenticatedCharacter, getSessionToken, initializeTelegramEnvironment } from './auth/authClient'
import { clearDevToken } from './character/devIdentity'
import './App.css'

export default function App() {
  const [character, setCharacterState] = useState<Character | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(getSessionToken)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => initializeTelegramEnvironment(), [])
  useEffect(() => { void bootstrapAuthentication().then((result) => {
    setSessionToken(getSessionToken()); setCharacterState(result.character); setLoading(false)
  }).catch((error) => { setAuthError(error instanceof Error ? error.message : 'Authentication failed.'); setLoading(false) }) }, [])

  const setCharacter = (next: Character | null) => {
    if (!next) {
      clearSessionToken(); clearDevToken(); setSessionToken(null); setCharacterState(null); window.location.reload(); return
    }
    void createAuthenticatedCharacter(next.name, next.classId).then(setCharacterState).catch((error) => setAuthError(error instanceof Error ? error.message : 'Character creation failed.'))
  }

  if (loading) return <main className="app-status"><p>Підключення до сервера…</p></main>
  if (authError || !sessionToken) return <main className="app-status"><h1>Не вдалося увійти</h1><p>{authError ?? 'Сесію не створено.'}</p><button onClick={() => window.location.reload()}>Спробувати ще раз</button></main>
  return <AppRouter character={character} sessionToken={sessionToken} onCharacterChange={setCharacter} />
}
