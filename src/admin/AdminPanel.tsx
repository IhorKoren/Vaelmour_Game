import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import './AdminPanel.css';

const ADMIN_SECRET_STORAGE_KEY = 'vaelmour_admin_secret';

const ADMIN_LIST_PLAYERS_ENDPOINT = '/.netlify/functions/adminListPlayers';
const ADMIN_GET_PLAYER_ENDPOINT = '/.netlify/functions/adminGetPlayer';
const ADMIN_UPDATE_PLAYER_ENDPOINT = '/.netlify/functions/adminUpdatePlayer';

type AdminListSave = {
  player_id: string;
  level: number;
  xp: number;
  gold: number;
  current_hp: number;
  max_hp: number;
  selected_location_id: string | null;
  save_version: number;
  updated_at: string;
};

type AdminPlayerListItem = {
  id: string;
  telegramUserId: number | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  isBanned: boolean;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
  save: AdminListSave | null;
};

type AdminPlayerDb = {
  id: string;
  telegram_user_id: number | null;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  telegram_language_code: string | null;
  is_banned: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
};

type AdminDetailedSave = {
  player_id: string;
  hero_json: Record<string, unknown> | null;
  level: number;
  xp: number;
  gold: number;
  current_hp: number;
  max_hp: number;
  selected_location_id: string | null;
  save_version: number;
  created_at: string;
  updated_at: string;
};

type AdminListPlayersResponse = {
  success: boolean;
  players: AdminPlayerListItem[];
  error?: string;
  details?: string;
};

type AdminGetPlayerResponse = {
  success: boolean;
  player: AdminPlayerDb;
  save: AdminDetailedSave | null;
  warning?: string;
  error?: string;
  details?: string;
};

type AdminUpdatePlayerResponse = {
  success: boolean;
  message?: string;
  player?: AdminPlayerDb;
  save?: AdminDetailedSave;
  error?: string;
  details?: string;
};

type PlayerEditorState = {
  level: string;
  xp: string;
  gold: string;
  currentHp: string;
  maxHp: string;
  selectedLocationId: string;
  isBanned: boolean;
  adminNotes: string;
  heroJson: string;
};

function createEmptyEditorState(): PlayerEditorState {
  return {
    level: '',
    xp: '',
    gold: '',
    currentHp: '',
    maxHp: '',
    selectedLocationId: '',
    isBanned: false,
    adminNotes: '',
    heroJson: '{}',
  };
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPlayerName(player: AdminPlayerListItem | null): string {
  if (!player) return '—';

  const fullName = [player.firstName, player.lastName].filter(Boolean).join(' ').trim();

  if (fullName) return fullName;
  if (player.username) return `@${player.username}`;

  return `Telegram ID ${player.telegramUserId ?? '—'}`;
}

function formatDetailedPlayerName(player: AdminPlayerDb | null): string {
  if (!player) return '—';

  const fullName = [player.telegram_first_name, player.telegram_last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (fullName) return fullName;
  if (player.telegram_username) return `@${player.telegram_username}`;

  return `Telegram ID ${player.telegram_user_id ?? '—'}`;
}

function normalizeUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function numberOrEmpty(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';

  return String(value);
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();

  if (!trimmed) return undefined;

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Некоректне число: ${value}`);
  }

  return parsed;
}

async function postJson<TResponse>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<TResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as TResponse & {
    error?: string;
    details?: string;
  };

  if (!response.ok) {
    throw new Error(payload.details || payload.error || `HTTP ${response.status}`);
  }

  return payload;
}

function buildEditorState(player: AdminPlayerDb, save: AdminDetailedSave | null): PlayerEditorState {
  return {
    level: numberOrEmpty(save?.level),
    xp: numberOrEmpty(save?.xp),
    gold: numberOrEmpty(save?.gold),
    currentHp: numberOrEmpty(save?.current_hp),
    maxHp: numberOrEmpty(save?.max_hp),
    selectedLocationId: save?.selected_location_id ?? '',
    isBanned: player.is_banned,
    adminNotes: player.admin_notes ?? '',
    heroJson: JSON.stringify(save?.hero_json ?? {}, null, 2),
  };
}

export function AdminPanel() {
  const [adminSecret, setAdminSecret] = useState(() => {
    return localStorage.getItem(ADMIN_SECRET_STORAGE_KEY) ?? '';
  });

  const [secretInput, setSecretInput] = useState(adminSecret);
  const [players, setPlayers] = useState<AdminPlayerListItem[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<AdminPlayerDb | null>(null);
  const [selectedSave, setSelectedSave] = useState<AdminDetailedSave | null>(null);
  const [editor, setEditor] = useState<PlayerEditorState>(() => createEmptyEditorState());

  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedPlayerFromList = useMemo(() => {
    return players.find((player) => player.id === selectedPlayerId) ?? null;
  }, [players, selectedPlayerId]);

  const hasAdminSecret = adminSecret.trim().length > 0;

  async function loadPlayers(secret = adminSecret) {
    if (!secret.trim()) return;

    setIsLoadingPlayers(true);
    setError('');
    setMessage('');

    try {
      const payload = await postJson<AdminListPlayersResponse>(ADMIN_LIST_PLAYERS_ENDPOINT, {
        adminSecret: secret,
      });

      if (!payload.success) {
        throw new Error(payload.error || 'Не вдалося завантажити гравців');
      }

      setPlayers(payload.players ?? []);

      if (payload.players?.length && !selectedPlayerId) {
        setSelectedPlayerId(payload.players[0].id);
      }

      setMessage(`Гравців завантажено: ${payload.players?.length ?? 0}`);
    } catch (caughtError) {
      setError(normalizeUnknownError(caughtError));
    } finally {
      setIsLoadingPlayers(false);
    }
  }

  async function loadPlayer(playerId: string) {
    if (!adminSecret.trim() || !playerId) return;

    setIsLoadingPlayer(true);
    setError('');
    setMessage('');

    try {
      const payload = await postJson<AdminGetPlayerResponse>(ADMIN_GET_PLAYER_ENDPOINT, {
        adminSecret,
        playerId,
      });

      if (!payload.success) {
        throw new Error(payload.error || 'Не вдалося завантажити гравця');
      }

      setSelectedPlayer(payload.player);
      setSelectedSave(payload.save);
      setEditor(buildEditorState(payload.player, payload.save));

      if (payload.warning) {
        setMessage(payload.warning);
      }
    } catch (caughtError) {
      setError(normalizeUnknownError(caughtError));
      setSelectedPlayer(null);
      setSelectedSave(null);
      setEditor(createEmptyEditorState());
    } finally {
      setIsLoadingPlayer(false);
    }
  }

  useEffect(() => {
    if (hasAdminSecret) {
      void loadPlayers(adminSecret);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPlayerId) {
      void loadPlayer(selectedPlayerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId]);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSecret = secretInput.trim();

    if (!nextSecret) {
      setError('Введи ADMIN_SECRET');
      return;
    }

    localStorage.setItem(ADMIN_SECRET_STORAGE_KEY, nextSecret);
    setAdminSecret(nextSecret);
    setMessage('');
    setError('');

    void loadPlayers(nextSecret);
  }

  function handleLogout() {
    localStorage.removeItem(ADMIN_SECRET_STORAGE_KEY);

    setAdminSecret('');
    setSecretInput('');
    setPlayers([]);
    setSelectedPlayerId(null);
    setSelectedPlayer(null);
    setSelectedSave(null);
    setEditor(createEmptyEditorState());
    setMessage('');
    setError('');
  }

  function updateEditorField<TKey extends keyof PlayerEditorState>(
    key: TKey,
    value: PlayerEditorState[TKey],
  ) {
    setEditor((currentEditor) => ({
      ...currentEditor,
      [key]: value,
    }));
  }

  async function handleSavePlayer() {
    if (!selectedPlayerId) {
      setError('Спочатку вибери гравця');
      return;
    }

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const hero = JSON.parse(editor.heroJson) as Record<string, unknown>;

      const level = parseOptionalNumber(editor.level);
      const xp = parseOptionalNumber(editor.xp);
      const gold = parseOptionalNumber(editor.gold);
      const currentHp = parseOptionalNumber(editor.currentHp);
      const maxHp = parseOptionalNumber(editor.maxHp);

      const payload = await postJson<AdminUpdatePlayerResponse>(ADMIN_UPDATE_PLAYER_ENDPOINT, {
        adminSecret,
        playerId: selectedPlayerId,
        updates: {
          hero,
          level,
          xp,
          gold,
          currentHp,
          maxHp,
          selectedLocationId: editor.selectedLocationId.trim() || undefined,
          isBanned: editor.isBanned,
          adminNotes: editor.adminNotes,
        },
      });

      if (!payload.success) {
        throw new Error(payload.error || 'Не вдалося зберегти гравця');
      }

      setMessage(payload.message || 'Гравця збережено');

      await loadPlayers(adminSecret);
      await loadPlayer(selectedPlayerId);
    } catch (caughtError) {
      setError(normalizeUnknownError(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  function handleHealToFull() {
    setEditor((currentEditor) => {
      const maxHp = currentEditor.maxHp.trim();

      return {
        ...currentEditor,
        currentHp: maxHp || currentEditor.currentHp,
      };
    });
  }

  function handleAddGold(amount: number) {
    setEditor((currentEditor) => {
      const currentGold = Number(currentEditor.gold || 0);
      const nextGold = Number.isFinite(currentGold) ? currentGold + amount : amount;

      return {
        ...currentEditor,
        gold: String(nextGold),
      };
    });
  }

  function handleJsonFormat() {
    try {
      const parsed = JSON.parse(editor.heroJson) as Record<string, unknown>;

      updateEditorField('heroJson', JSON.stringify(parsed, null, 2));
      setError('');
    } catch (caughtError) {
      setError(`JSON помилка: ${normalizeUnknownError(caughtError)}`);
    }
  }

  if (!hasAdminSecret) {
    return (
      <div className="admin-page">
        <form className="admin-login" onSubmit={handleLogin}>
          <h1>Vaelmour Admin</h1>
          <p>Введи ADMIN_SECRET, який ти додав у Netlify Environment Variables.</p>

          {error ? <div className="admin-error">{error}</div> : null}

          <input
            type="password"
            value={secretInput}
            onChange={(event) => setSecretInput(event.target.value)}
            placeholder="ADMIN_SECRET"
            autoComplete="current-password"
          />

          <button type="submit">Увійти</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>Vaelmour Admin</h1>
          <p>Керування гравцями, сейвами, HP, золотом, баном і hero_json.</p>
        </div>

        <div className="admin-header__actions">
          <button type="button" onClick={() => void loadPlayers(adminSecret)} disabled={isLoadingPlayers}>
            {isLoadingPlayers ? 'Оновлення...' : 'Оновити список'}
          </button>

          <button type="button" onClick={handleLogout}>
            Вийти
          </button>
        </div>
      </header>

      {message ? <div className="admin-message">{message}</div> : null}
      {error ? <div className="admin-error">{error}</div> : null}

      <div className="admin-layout">
        <section className="admin-card">
          <h2>Гравці</h2>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Гравець</th>
                  <th>Lvl</th>
                  <th>Gold</th>
                  <th>HP</th>
                  <th>Last seen</th>
                </tr>
              </thead>

              <tbody>
                {players.map((player) => (
                  <tr
                    key={player.id}
                    className={player.id === selectedPlayerId ? 'is-selected' : undefined}
                    onClick={() => setSelectedPlayerId(player.id)}
                  >
                    <td>
                      <strong>{formatPlayerName(player)}</strong>
                      <span>
                        {player.username ? `@${player.username}` : 'без username'} · TG:{' '}
                        {player.telegramUserId ?? '—'}
                      </span>
                      {player.isBanned ? <span>Забанений</span> : null}
                    </td>

                    <td>{player.save?.level ?? '—'}</td>
                    <td>{player.save?.gold ?? '—'}</td>
                    <td>
                      {player.save ? `${player.save.current_hp}/${player.save.max_hp}` : '—'}
                    </td>
                    <td>{formatDate(player.lastSeenAt)}</td>
                  </tr>
                ))}

                {!players.length && !isLoadingPlayers ? (
                  <tr>
                    <td colSpan={5}>Гравців поки не знайдено.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-card">
          <h2>Обраний гравець</h2>

          {isLoadingPlayer ? <div className="admin-message">Завантаження гравця...</div> : null}

          {!selectedPlayer && !isLoadingPlayer ? (
            <p>Вибери гравця зі списку зліва.</p>
          ) : null}

          {selectedPlayer ? (
            <>
              <div className="admin-player-summary">
                <div>
                  <span>Гравець</span>
                  <strong>{formatDetailedPlayerName(selectedPlayer)}</strong>
                </div>

                <div>
                  <span>Telegram ID</span>
                  <strong>{selectedPlayer.telegram_user_id ?? '—'}</strong>
                </div>

                <div>
                  <span>Username</span>
                  <strong>
                    {selectedPlayer.telegram_username
                      ? `@${selectedPlayer.telegram_username}`
                      : '—'}
                  </strong>
                </div>

                <div>
                  <span>Player ID</span>
                  <strong>{selectedPlayer.id}</strong>
                </div>

                <div>
                  <span>Локація</span>
                  <strong>
                    {selectedSave?.selected_location_id ??
                      selectedPlayerFromList?.save?.selected_location_id ??
                      '—'}
                  </strong>
                </div>

                <div>
                  <span>Останній вхід</span>
                  <strong>{formatDate(selectedPlayer.last_seen_at)}</strong>
                </div>
              </div>

              <div className="admin-form-grid">
                <label>
                  Рівень
                  <input
                    value={editor.level}
                    onChange={(event) => updateEditorField('level', event.target.value)}
                    inputMode="numeric"
                  />
                </label>

                <label>
                  XP
                  <input
                    value={editor.xp}
                    onChange={(event) => updateEditorField('xp', event.target.value)}
                    inputMode="numeric"
                  />
                </label>

                <label>
                  Gold
                  <input
                    value={editor.gold}
                    onChange={(event) => updateEditorField('gold', event.target.value)}
                    inputMode="numeric"
                  />
                </label>

                <label>
                  Current HP
                  <input
                    value={editor.currentHp}
                    onChange={(event) => updateEditorField('currentHp', event.target.value)}
                    inputMode="numeric"
                  />
                </label>

                <label>
                  Max HP
                  <input
                    value={editor.maxHp}
                    onChange={(event) => updateEditorField('maxHp', event.target.value)}
                    inputMode="numeric"
                  />
                </label>

                <label>
                  Location ID
                  <input
                    value={editor.selectedLocationId}
                    onChange={(event) =>
                      updateEditorField('selectedLocationId', event.target.value)
                    }
                    placeholder="LOC_001"
                  />
                </label>
              </div>

              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={editor.isBanned}
                  onChange={(event) => updateEditorField('isBanned', event.target.checked)}
                />
                Забанити гравця
              </label>

              <label className="admin-full-label">
                Admin notes
                <textarea
                  value={editor.adminNotes}
                  onChange={(event) => updateEditorField('adminNotes', event.target.value)}
                  rows={3}
                  placeholder="Нотатки адміністратора"
                />
              </label>

              <label className="admin-full-label">
                Hero JSON
                <textarea
                  className="admin-json-editor"
                  value={editor.heroJson}
                  onChange={(event) => updateEditorField('heroJson', event.target.value)}
                  spellCheck={false}
                />
              </label>

              <div className="admin-actions">
                <button type="button" onClick={handleSavePlayer} disabled={isSaving}>
                  {isSaving ? 'Збереження...' : 'Зберегти гравця'}
                </button>

                <button type="button" onClick={handleHealToFull}>
                  HP до максимуму
                </button>

                <button type="button" onClick={() => handleAddGold(100)}>
                  +100 Gold
                </button>

                <button type="button" onClick={() => handleAddGold(1000)}>
                  +1000 Gold
                </button>

                <button type="button" onClick={handleJsonFormat}>
                  Форматувати JSON
                </button>

                <button
                  type="button"
                  onClick={() => selectedPlayerId && void loadPlayer(selectedPlayerId)}
                >
                  Скасувати зміни
                </button>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default AdminPanel;