import { useEffect, useRef } from "react";
import { createGame } from "./game/createGame";

export function App() {
  const gameHost = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameHost.current) {
      return;
    }

    const game = createGame(gameHost.current);

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="Racing game foundation">
        <div ref={gameHost} className="game-host" />
      </section>
    </main>
  );
}
