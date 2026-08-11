import { useEffect, useState } from 'react'
import { CharacterCreation } from '../../character/CharacterCreation'
import { CityScreen } from '../../city/CityScreen'
import { MultiplayerRift } from '../../rift/MultiplayerRift'
import { useMultiplayer } from '../../network/useMultiplayer'
import type { Character, GameMode } from '../../types/game'
import { telegramWebApp } from '../../auth/authClient'

interface Props {
  character: Character | null
  sessionToken: string
  onCharacterChange: (character: Character | null) => void
}

export function AppRouter({ character, sessionToken, onCharacterChange }: Props) {
  const [mode, setMode] = useState<GameMode>('city')
  const multiplayer = useMultiplayer(character, sessionToken)
  useEffect(() => {
    const back = telegramWebApp()?.BackButton
    if (!back) return
    const goBack = () => setMode('city')
    if (mode === 'rift') { back.show(); back.onClick(goBack) } else back.hide()
    return () => back.offClick(goBack)
  }, [mode])

  if (!character) return <CharacterCreation onCreate={onCharacterChange} />
  if (mode === 'rift') {
    return (
      <MultiplayerRift
        character={character}
        client={multiplayer}
        onCharacterChange={onCharacterChange}
        onExit={() => setMode('city')}
      />
    )
  }

  return (
    <CityScreen
      character={character}
      client={multiplayer}
      onEnterRift={() => setMode('rift')}
      onReset={() => onCharacterChange(null)}
    />
  )
}
