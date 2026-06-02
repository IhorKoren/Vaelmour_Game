import { useEffect, useMemo, useState } from 'react';
import './AdminPanel.css';

type PlayerListItem = {
  id: string;
  telegramUserId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  isBanned: boolean;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  save: {
    player_id: string;
    level: number;
    xp: number;
    gold: number;
    current_hp: number;
    max_hp: number;
    selected_location_id: string | null;
    save_version: number;
    updated_at: string;
  } | null;
};

type PlayerDetails = {
  success: boolean;
  player: {
    id: string;
    telegram_user_id: number;
    telegram_username: string | null;
    telegram_first_name: string | null;
    telegram_last_name: string | null;
    telegram_language_code: string | null;
    is_banned: boolean;
    admin_notes: string | null;
    created_at: string;
    updated_at: string;
    last_seen_at: string;
  };
  save: {
    player_id: string;
    hero_json: Record<string, unknown>;
    level: number;
    xp: number;
    gold: number;
    current_hp: number;
    max_hp: number;
    selected_location_id: string | null;
    save_version: number;
    created_at: string;
    updated_at: string;
  } | null;
};

type AdminUpdateFields = {
  level: string;
  xp: string;
  gold: string;
  currentHp: string;
  maxHp: string;
  selectedLocationId: string;
  isBanned: boolean;
  adminNotes: string;
};

const ADMIN_SECRET_STORAGE_KEY = 'vaelmour_admin_secret';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();

  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : text || `Request failed with status ${response.status}`,
    );
  }

  return data as TResponse;
}

export function AdminPanel() {
  const [adminSecret, setAdminSecret] = useState(
    () => window.sessionStorage.getItem(ADMIN_SECRET_STORAGE_KEY) ?? '',
  );
  const [isUnlocked, setIsUnlocked] = useState(() =>
    Boolean(window.sessionStorage.getItem(ADMIN_SECRET_STORAGE_KEY)),
  );

  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [details, setDetails] = useState<PlayerDetails | null>(null);

  const [fields, setFields] = useState<AdminUpdateFields>({
    level: '',
    xp: '',
    gold: '',
    currentHp: '',
    maxHp: '',
    selectedLocationId: '',
    isBanned: false,
    adminNotes: '',
  });

  const [heroJsonText, setHeroJsonText] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedListPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  );

  async function loadPlayers(secret = adminSecret) {
    setIsLoadingList(true);
    setError(null);

    try {
      const data = await postJson<{ success: boolean; players: PlayerListItem[] }>(
        '/.netlify/functions/adminListPlayers',
        {
          adminSecret: secret,
        },
      );

      setPlayers(data.players ?? []);

      if (!selectedPlayerId && data.players?.[0]) {
        setSelectedPlayerId(data.players[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoadingList(false);
    }
  }

  async function loadPlayerDetails(playerId: string, secret = adminSecret) {
    setIsLoadingDetails(true);
    setError(null);

    try {
      const data = await postJson<PlayerDetails>('/.netlify/functions/adminGetPlayer', {
        adminSecret: secret,
        playerId,
      });

      setDetails(data);

      const save = data.save;
      const player = data.player;

      setFields({
        level: String(save?.level ?? ''),
        xp: String(save?.xp ?? ''),
        gold: String(save?.gold ?? ''),
        currentHp: String(save?.current_hp ?? ''),
        maxHp: String(save?.max_hp ?? ''),
        selectedLocationId: save?.selected_location_id ?? '',
        isBanned: Boolean(player.is_banned),
        adminNotes: player.admin_notes ?? '',
      });

      setHeroJsonText(JSON.stringify(save?.hero_json ?? {}, null, 2));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function unlockAdmin() {
    if (!adminSecret.trim()) {
      setError('Введи ADMIN_SECRET.');
      return;
    }

    setError(null);
    setMessage(null);

    try {
      await loadPlayers(adminSecret.trim());

      window.sessionStorage.setItem(ADMIN_SECRET_STORAGE_KEY, adminSecret.trim());
      setIsUnlocked(true);
      setMessage('Адмінку відкрито.');
    } catch {
      // loadPlayers already sets error
    }
  }

  function logout() {
    window.sessionStorage.removeItem(ADMIN_SECRET_STORAGE_KEY);
    setIsUnlocked(false);
    setAdminSecret('');
    setPlayers([]);
    setDetails(null);
    setSelectedPlayerId(null);
  }

  async function savePlayer() {
    if (!selectedPlayerId) {
      setError('Гравець не вибраний.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    let parsedHero: Record<string, unknown>;

    try {
      parsedHero = JSON.parse(heroJsonText) as Record<string, unknown>;
    } catch {
      setIsSaving(false);
      setError('hero_json має бути валідним JSON.');
      return;
    }

    try {
      const updates = {
        level: fields.level === '' ? undefined : Number(fields.level),
        xp: fields.xp === '' ? undefined : Number(fields.xp),
        gold: fields.gold === '' ? undefined : Number(fields.gold),
        currentHp: fields.currentHp === '' ? undefined : Number(fields.currentHp),
        maxHp: fields.maxHp === '' ? undefined : Number(fields.maxHp),
        selectedLocationId: fields.selectedLocationId || undefined,
        isBanned: fields.isBanned,
        adminNotes: fields.adminNotes,
        hero: parsedHero,
      };

      await postJson('/.netlify/functions/adminUpdatePlayer', {
        adminSecret,
        playerId: selectedPlayerId,
        updates,
      });

      setMessage('Гравця оновлено.');

      await loadPlayers();
      await loadPlayerDetails(selectedPlayerId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (isUnlocked) {
      void loadPlayers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked]);

  useEffect(() => {
    if (isUnlocked && selectedPlayerId) {
      void loadPlayerDetails(selectedPlayerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, selectedPlayerId]);

  if (!isUnlocked) {
    return (
      <div className="admin-page">
        <section className="admin-login">
          <h1>Vaelmour Admin</h1>
          <p>Введи ADMIN_SECRET, який збережений у Netlify Environment Variables.</p>

          <input
            type="password"
            value={adminSecret}
            onChange={(event) => setAdminSecret(event.target.value)}
            placeholder="ADMIN_SECRET"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void unlockAdmin();
              }
            }}
          />

          <button type="button" onClick={() => void unlockAdmin()}>
            Увійти
          </button>

          {error && <div className="admin-error">{error}</div>}
        </section>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>Vaelmour Admin</h1>
          <p>Гравці, cloud saves, швидке редагування.</p>
        </div>

        <div className="admin-header__actions">
          <button type="button" onClick={() => void loadPlayers()} disabled={isLoadingList}>
            {isLoadingList ? 'Оновлення...' : 'Оновити'}
          </button>

          <button type="button" onClick={logout}>
            Вийти
          </button>
        </div>
      </header>

      {message && <div className="admin-message">{message}</div>}
      {error && <div className="admin-error">{error}</div>}

      <main className="admin-layout">
        <section className="admin-card admin-players">
          <h2>Гравці</h2>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Telegram</th>
                  <th>Імʼя</th>
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
                    className={player.id === selectedPlayerId ? 'is-selected' : ''}
                    onClick={() => setSelectedPlayerId(player.id)}
                  >
                    <td>
                      <strong>{player.telegramUserId}</strong>
                      <span>@{player.username ?? '—'}</span>
                    </td>
                    <td>{player.firstName ?? '—'}</td>
                    <td>{player.save?.level ?? '—'}</td>
                    <td>{player.save?.gold ?? '—'}</td>
                    <td>
                      {player.save
                        ? `${player.save.current_hp}/${player.save.max_hp}`
                        : '—'}
                    </td>
                    <td>{formatDate(player.lastSeenAt)}</td>
                  </tr>
                ))}

                {players.length === 0 && (
                  <tr>
                    <td colSpan={6}>Гравців ще немає.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-card admin-details">
          <h2>Деталі гравця</h2>

          {!selectedListPlayer && <p>Вибери гравця зі списку.</p>}

          {selectedListPlayer && (
            <>
              <div className="admin-player-summary">
                <div>
                  <span>Telegram ID</span>
                  <strong>{selectedListPlayer.telegramUserId}</strong>
                </div>
                <div>
                  <span>Username</span>
                  <strong>@{selectedListPlayer.username ?? '—'}</strong>
                </div>
                <div>
                  <span>Player ID</span>
                  <strong>{selectedListPlayer.id}</strong>
                </div>
                <div>
                  <span>Save updated</span>
                  <strong>{formatDate(selectedListPlayer.save?.updated_at)}</strong>
                </div>
              </div>

              {isLoadingDetails && <p>Завантаження деталей...</p>}

              {details?.save && (
                <>
                  <div className="admin-form-grid">
                    <label>
                      Level
                      <input
                        type="number"
                        value={fields.level}
                        onChange={(event) =>
                          setFields((current) => ({ ...current, level: event.target.value }))
                        }
                      />
                    </label>

                    <label>
                      XP
                      <input
                        type="number"
                        value={fields.xp}
                        onChange={(event) =>
                          setFields((current) => ({ ...current, xp: event.target.value }))
                        }
                      />
                    </label>

                    <label>
                      Gold
                      <input
                        type="number"
                        value={fields.gold}
                        onChange={(event) =>
                          setFields((current) => ({ ...current, gold: event.target.value }))
                        }
                      />
                    </label>

                    <label>
                      Current HP
                      <input
                        type="number"
                        value={fields.currentHp}
                        onChange={(event) =>
                          setFields((current) => ({
                            ...current,
                            currentHp: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      Max HP
                      <input
                        type="number"
                        value={fields.maxHp}
                        onChange={(event) =>
                          setFields((current) => ({ ...current, maxHp: event.target.value }))
                        }
                      />
                    </label>

                    <label>
                      Location
                      <input
                        value={fields.selectedLocationId}
                        onChange={(event) =>
                          setFields((current) => ({
                            ...current,
                            selectedLocationId: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={fields.isBanned}
                      onChange={(event) =>
                        setFields((current) => ({
                          ...current,
                          isBanned: event.target.checked,
                        }))
                      }
                    />
                    Заблокований гравець
                  </label>

                  <label className="admin-full-label">
                    Admin notes
                    <textarea
                      value={fields.adminNotes}
                      onChange={(event) =>
                        setFields((current) => ({
                          ...current,
                          adminNotes: event.target.value,
                        }))
                      }
                      rows={3}
                    />
                  </label>

                  <label className="admin-full-label">
                    hero_json
                    <textarea
                      className="admin-json-editor"
                      value={heroJsonText}
                      onChange={(event) => setHeroJsonText(event.target.value)}
                      spellCheck={false}
                    />
                  </label>

                  <div className="admin-actions">
                    <button type="button" onClick={() => void savePlayer()} disabled={isSaving}>
                      {isSaving ? 'Збереження...' : 'Зберегти зміни'}
                    </button>

                    <button
                      type="button"
                      onClick={() => selectedPlayerId && void loadPlayerDetails(selectedPlayerId)}
                    >
                      Скасувати локальні зміни
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
