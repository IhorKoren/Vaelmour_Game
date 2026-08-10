import { useState } from 'react'
import { CharacterCreation } from '../../character/CharacterCreation'
import { CityScreen } from '../../city/CityScreen'
import { MultiplayerRift } from '../../rift/MultiplayerRift'
import { useMultiplayer } from '../../network/useMultiplayer'
import type { Character, GameMode } from '../../types/game'

interface Props {
  character: Character | null
  onCharacterChange: (character: Character | null) => void
}

export function AppRouter({ character, onCharacterChange }: Props) {
  const [mode, setMode] = useState<GameMode>('city')
  const multiplayer = useMultiplayer(character)

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
