import { useState } from 'react'
import { AppRouter } from './app/routing/AppRouter'
import type { Character } from './types/game'
import { clearDevToken, getDevToken } from './character/devIdentity'
import './App.css'

function readCharacter(): Character | null {
  const token = getDevToken()
  if (!token) return null
  return { id: token, name: '', classId: 'warrior', level: 1, currentXP: 0, attack: 0, maxHP: 1, currentHP: 1, alive: true, ready: false }
}

export default function App() {
  const [character, setCharacterState] = useState<Character | null>(readCharacter)

  const setCharacter = (next: Character | null) => {
    setCharacterState(next)
    if (!next) clearDevToken()
  }

  return <AppRouter character={character} onCharacterChange={setCharacter} />
}
