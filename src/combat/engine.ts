import { DAMAGE_SPREAD, POTION_COOLDOWN_ROUNDS, POTION_HEAL_PERCENT, ZONES, ZONE_LABELS } from '../data/config/balance'
import type { Character, CombatAction, Enemy, EnemyAction, RoundInput, RoundResult, Zone } from '../types/game'

export function resolveBlock(attackZone: Zone, defendZone: Zone): boolean {
  return attackZone === defendZone
}

export function calculateDamage(attack: number, blocked: boolean, random: () => number = Math.random): number {
  if (blocked) return 0
  const multiplier = 1 - DAMAGE_SPREAD + random() * DAMAGE_SPREAD * 2
  return Math.max(1, Math.round(attack * multiplier))
}

export function selectEnemyTarget(party: Character[], random: () => number = Math.random): Character | null {
  const alive = party.filter((member) => member.alive && member.currentHP > 0)
  if (!alive.length) return null
  return alive[Math.floor(random() * alive.length)] ?? alive[0]
}

export function generateEnemyAction(enemy: Enemy, party: Character[], random: () => number = Math.random): EnemyAction {
  const attackNumber = enemy.attackCount + 1
  const isGroupAttack = enemy.kind === 'boss' && attackNumber % 3 === 0
  const target = isGroupAttack ? null : selectEnemyTarget(party, random)
  return {
    attackZone: ZONES[Math.floor(random() * ZONES.length)],
    defendZone: ZONES[Math.floor(random() * ZONES.length)],
    targetId: target?.id ?? null,
    isGroupAttack,
  }
}

export function tickPotionCooldown(cooldown: number): number {
  return Math.max(0, cooldown - 1)
}

function applyDamage(member: Character, damage: number): Character {
  const currentHP = Math.max(0, member.currentHP - damage)
  return { ...member, currentHP, alive: currentHP > 0 }
}

export function canCharacterAct(character: Character): boolean {
  return character.alive && character.currentHP > 0
}

export function resolveRound(input: RoundInput): RoundResult {
  const random = input.random ?? Math.random
  let party = input.party.map((member) => ({ ...member, ready: false }))
  let enemy = { ...input.enemy, attackCount: input.enemy.attackCount + 1 }
  const log: string[] = []
  let nextCooldown = tickPotionCooldown(input.potionCooldown)
  const nextCooldowns: Record<string, number> = {}
  for (const member of party) {
    nextCooldowns[member.id] = tickPotionCooldown(input.potionCooldowns?.[member.id] ?? (member.id === party[0]?.id ? input.potionCooldown : 0))
  }

  // 1. Actions are already locked by the caller. 2. Every valid potion heals before attacks.
  for (let index = 0; index < party.length; index += 1) {
    const member = party[index]
    const action = input.actions[member.id]
    const cooldown = input.potionCooldowns?.[member.id] ?? (index === 0 ? input.potionCooldown : 0)
    if (!canCharacterAct(member) || action?.type !== 'potion' || cooldown !== 0) continue
    const healing = Math.round(member.maxHP * POTION_HEAL_PERCENT)
    const healedHP = Math.min(member.maxHP, member.currentHP + healing)
    party[index] = { ...member, currentHP: healedHP }
    nextCooldowns[member.id] = POTION_COOLDOWN_ROUNDS
    if (index === 0) nextCooldown = POTION_COOLDOWN_ROUNDS
    log.push(`${member.name} відновлює ${healedHP - member.currentHP} HP зіллям.`)
  }

  // 3–4. Party attacks are resolved against the enemy defense.
  for (const member of party) {
    if (!canCharacterAct(member)) continue
    const action = input.actions[member.id]
    if (!action || action.type !== 'attack' || !action.attackZone || enemy.currentHP <= 0) continue
    const blocked = resolveBlock(action.attackZone, input.enemyAction.defendZone)
    const damage = calculateDamage(member.attack, blocked, random)
    enemy.currentHP = Math.max(0, enemy.currentHP - damage)
    log.push(blocked
      ? `${member.name}: удар у ${ZONE_LABELS[action.attackZone].toLowerCase()} заблоковано.`
      : `${member.name} завдає ${damage} шкоди.`)
  }

  if (enemy.currentHP > 0) {
    const targets = input.enemyAction.isGroupAttack
      ? party.filter(canCharacterAct)
      : party.filter((member) => member.id === input.enemyAction.targetId && canCharacterAct(member))

    for (const target of targets) {
      const defendZone = input.actions[target.id]?.defendZone
      const blocked = defendZone ? resolveBlock(input.enemyAction.attackZone, defendZone) : false
      const damage = calculateDamage(enemy.attack, blocked, random)
      party = party.map((member) => member.id === target.id ? applyDamage(member, damage) : member)
      log.push(blocked
        ? `${target.name} блокує удар у ${ZONE_LABELS[input.enemyAction.attackZone].toLowerCase()}.`
        : `${target.name} отримує ${damage} шкоди.`)
    }
  }

  // 5–6. Deaths are encoded in applyDamage; return a deterministic round log.
  const deaths = party.filter((member, index) => input.party[index]?.alive && !member.alive)
  deaths.forEach((member) => log.push(`${member.name} вибуває з бою.`))
  if (enemy.currentHP <= 0) log.push(`${enemy.name} переможений.`)

  return { party, enemy, potionCooldown: nextCooldown, potionCooldowns: nextCooldowns, log }
}

export function createAttackAction(attackZone: Zone, defendZone: Zone): CombatAction {
  return { type: 'attack', attackZone, defendZone }
}
