import { useMemo, useState } from 'react'
import { CLASSES } from '../data/config/balance'
import type { Character, CharacterClass } from '../types/game'
import { ensureDevToken } from './devIdentity'

interface Props {
  onCreate: (character: Character) => void
}

export function CharacterCreation({ onCreate }: Props) {
  const [name, setName] = useState('')
  const [classId, setClassId] = useState<CharacterClass>('warrior')
  const selected = useMemo(() => CLASSES[classId], [classId])

  const create = () => {
    const cleanName = name.trim()
    if (!cleanName) return
    onCreate({
      id: ensureDevToken(), name: cleanName, classId, level: 1, currentXP: 0,
      attack: selected.attack, maxHP: selected.maxHP, currentHP: selected.maxHP,
      alive: true, ready: false,
    })
  }

  return (
    <main className="creation-shell">
      <div className="ambient ambient-one" />
      <section className="creation-card">
        <div className="sigil" aria-hidden="true"><span>Ⅰ</span></div>
        <p className="eyebrow">Хроніки Попелястої Межі</p>
        <h1>Оберіть свою долю</h1>
        <p className="lead">Розломи прокинулись. Місту потрібні ті, хто наважиться зазирнути всередину.</p>

        <label className="name-field">
          <span>Імʼя мандрівника</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 18))}
            onKeyDown={(event) => event.key === 'Enter' && create()}
            placeholder="Введіть імʼя"
            autoComplete="off"
            autoFocus
          />
        </label>

        <p className="field-label">Клас</p>
        <div className="class-grid" role="radiogroup" aria-label="Клас персонажа">
          {Object.values(CLASSES).map((item) => (
            <button
              key={item.id}
              className={`class-option ${classId === item.id ? 'selected' : ''}`}
              onClick={() => setClassId(item.id)}
              role="radio"
              aria-checked={classId === item.id}
            >
              <span className="class-glyph">{item.glyph}</span>
              <span>{item.name}</span>
              <small>{item.title}</small>
            </button>
          ))}
        </div>

        <div className="class-detail">
          <div><span>АТАКА</span><strong>{selected.attack}</strong></div>
          <i />
          <div><span>ЗДОРОВʼЯ</span><strong>{selected.maxHP}</strong></div>
          <p>{selected.description}</p>
        </div>

        <button className="primary-button" disabled={!name.trim()} onClick={create}>
          Увійти до міста <span>›</span>
        </button>
      </section>
    </main>
  )
}
