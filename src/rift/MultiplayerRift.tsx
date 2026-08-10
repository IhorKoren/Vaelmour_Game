import type { Character } from '../types/game'
import type { MultiplayerClient } from '../network/useMultiplayer'
import { MultiplayerCombat } from './MultiplayerCombat'
import { RiftLobby } from './RiftLobby'

interface Props {
  character: Character
  client: MultiplayerClient
  onCharacterChange: (character: Character) => void
  onExit: () => void
}

export function MultiplayerRift(props: Props) {
  if (props.client.combat && props.client.combat.phase !== 'LOBBY') {
    return <MultiplayerCombat {...props} snapshot={props.client.combat} />
  }
  return <RiftLobby character={props.character} client={props.client} onBack={props.onExit} />
}
