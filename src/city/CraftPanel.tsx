import { useMemo, useState } from 'react'
import type { CharacterState, ClientMessage } from '../../shared/protocol'
import { ITEM_CATALOG } from '../../shared/game-data/catalog'
import { RECIPES } from '../../shared/game-data/recipes'
import { isProfessionClass } from '../../shared/game-data/economy'
import type { RecipeCategory } from '../../shared/game-data/types'
import { CLASSES } from '../data/config/balance'

export function CraftPanel({ state, send }: { state: CharacterState; send: (message: Exclude<ClientMessage, { type: 'HELLO' }>) => void }) {
  const recipes = useMemo(() => state.learnedRecipes.map((id) => RECIPES[id]).filter(Boolean), [state.learnedRecipes])
  const categories = [...new Set(recipes.map((recipe) => recipe.category))]
  const [filter, setFilter] = useState<RecipeCategory | null>(null)
  const active = filter && categories.includes(filter) ? filter : categories[0]
  const quantities = Object.fromEntries(state.inventory.map((entry) => [entry.itemId, (state.inventory.filter((item) => item.itemId === entry.itemId).reduce((sum, item) => sum + item.quantity, 0))]))
  if (!isProfessionClass(state.classId)) return <section className="city-content-panel"><div className="section-heading"><div><span>Реміснича зала</span><h2>Craft</h2></div></div><div className="profession-empty"><span>{CLASSES[state.classId].glyph}</span><h3>{CLASSES[state.classId].name} — бойовий клас</h3><p>Warrior і Ranger не мають crafting recipes. Професійні ресурси можна зберігати для майбутньої торгівлі.</p></div></section>
  return (
    <section className="city-content-panel">
      <div className="section-heading"><div><span>{CLASSES[state.classId].name} · Profession</span><h2>Craft</h2></div><small>{recipes.length} LEARNED</small></div>
      <div className="inventory-filters">{categories.map((category) => <button key={category} className={active === category ? 'selected' : ''} onClick={() => setFilter(category)}>{category}</button>)}</div>
      <div className="recipe-list">{recipes.filter((recipe) => recipe.category === active).map((recipe) => {
        const output = ITEM_CATALOG[recipe.outputItemId]
        const canCraft = Object.entries(recipe.requirements).every(([id, quantity]) => (quantities[id] ?? 0) >= quantity)
        return <article key={recipe.id} className="recipe-card"><div className="recipe-output"><span>{output.icon}</span><div><small>{recipe.category} · {recipe.targetClass ? CLASSES[recipe.targetClass].name : 'All classes'}</small><strong>{recipe.name}</strong><p>{output.equipType ?? 'Consumable'} · {output.attack ? `⚔ +${output.attack}` : ''} {output.hp ? `♥ +${output.hp}` : ''}</p></div></div><div className="requirements">{Object.entries(recipe.requirements).map(([id, quantity]) => <span key={id} className={(quantities[id] ?? 0) >= quantity ? 'enough' : ''}>{ITEM_CATALOG[id].icon} {ITEM_CATALOG[id].name} <strong>{quantities[id] ?? 0}/{quantity}</strong></span>)}</div><button disabled={!canCraft} onClick={() => send({ type: 'CRAFT_ITEM', payload: { recipeId: recipe.id, operationId: crypto.randomUUID() } })}>Craft {recipe.outputQuantity > 1 ? `×${recipe.outputQuantity}` : ''}</button></article>
      })}</div>
    </section>
  )
}
