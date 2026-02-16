import { useEffect, useMemo, useRef, useState } from 'react';

const PHASE = {
  SETUP: 'setup',
  COLLECTING: 'collecting',
  SPINNING: 'spinning',
  ELIMINATING: 'eliminating',
  RESULT: 'result',
};

const SPIN_MS = 2000;
const ELIMINATION_MS = 550;

const shuffle = (array) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export default function App() {
  const [phase, setPhase] = useState(PHASE.SETUP);
  const [winnerCount, setWinnerCount] = useState(1);
  const [activeTouches, setActiveTouches] = useState([]);
  const [roundTouches, setRoundTouches] = useState([]);
  const [winnerIds, setWinnerIds] = useState([]);
  const [eliminatedIds, setEliminatedIds] = useState([]);

  const knownTouchesRef = useRef(new Map());
  const eliminationTimerRef = useRef(null);
  const spinTimerRef = useRef(null);

  const resetRound = () => {
    setPhase(PHASE.SETUP);
    setActiveTouches([]);
    setRoundTouches([]);
    setWinnerIds([]);
    setEliminatedIds([]);
    knownTouchesRef.current = new Map();
  };

  useEffect(() => () => {
    clearTimeout(spinTimerRef.current);
    clearInterval(eliminationTimerRef.current);
  }, []);

  useEffect(() => {
    if (phase !== PHASE.COLLECTING) {
      return;
    }

    if (activeTouches.length === 0 && knownTouchesRef.current.size > 0) {
      const frozenTouches = Array.from(knownTouchesRef.current.values());
      setRoundTouches(frozenTouches);
      setPhase(PHASE.SPINNING);
    }
  }, [activeTouches.length, phase]);

  useEffect(() => {
    if (phase !== PHASE.SPINNING || roundTouches.length === 0) {
      return;
    }

    spinTimerRef.current = setTimeout(() => {
      const ids = roundTouches.map((touch) => touch.id);
      const shuffled = shuffle(ids);
      const kept = shuffled.slice(0, Math.min(winnerCount, ids.length));
      const out = shuffled.slice(Math.min(winnerCount, ids.length));

      setWinnerIds(kept);
      setEliminatedIds([]);
      setPhase(PHASE.ELIMINATING);

      let cursor = 0;
      eliminationTimerRef.current = setInterval(() => {
        if (cursor >= out.length) {
          clearInterval(eliminationTimerRef.current);
          setPhase(PHASE.RESULT);
          return;
        }

        setEliminatedIds((prev) => [...prev, out[cursor]]);
        cursor += 1;
      }, ELIMINATION_MS);
    }, SPIN_MS);

    return () => clearTimeout(spinTimerRef.current);
  }, [phase, roundTouches, winnerCount]);

  const maxWinnersAllowed = useMemo(() => Math.max(1, roundTouches.length || activeTouches.length || 10), [activeTouches.length, roundTouches.length]);

  const handleStart = () => {
    knownTouchesRef.current = new Map();
    setWinnerIds([]);
    setEliminatedIds([]);
    setRoundTouches([]);
    setActiveTouches([]);
    setPhase(PHASE.COLLECTING);
  };

  const updateFromTouchEvent = (event) => {
    if (phase !== PHASE.COLLECTING) {
      return;
    }

    const nextTouches = Array.from(event.touches).map((touch) => {
      const next = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
      };
      knownTouchesRef.current.set(touch.identifier, next);
      return next;
    });

    setActiveTouches(nextTouches);
  };

  const displayTouches = phase === PHASE.COLLECTING ? activeTouches : roundTouches;

  return (
    <main
      className="app"
      onTouchStart={updateFromTouchEvent}
      onTouchMove={updateFromTouchEvent}
      onTouchEnd={updateFromTouchEvent}
      onTouchCancel={updateFromTouchEvent}
    >
      <section className="overlay">
        {phase === PHASE.SETUP && (
          <div className="card">
            <h1>Finger Picker</h1>
            <p>Choisissez combien de doigts doivent rester.</p>
            <label htmlFor="winnerCount">Doigts conservés</label>
            <input
              id="winnerCount"
              type="number"
              min="1"
              max={maxWinnersAllowed}
              value={winnerCount}
              onChange={(event) => {
                const value = Number(event.target.value);
                setWinnerCount(Number.isNaN(value) ? 1 : Math.max(1, value));
              }}
            />
            <button type="button" onClick={handleStart}>Start</button>
          </div>
        )}

        {phase === PHASE.COLLECTING && (
          <div className="hint">Posez vos doigts sur l&apos;écran 👇</div>
        )}

        {phase === PHASE.RESULT && (
          <div className="card">
            <h2>Résultat prêt</h2>
            <p>{winnerIds.length} doigt(s) conservé(s).</p>
            <button type="button" onClick={resetRound}>Recommencer</button>
          </div>
        )}
      </section>

      <section className="touch-layer">
        {displayTouches.map((touch) => {
          const isWinner = winnerIds.includes(touch.id);
          const isEliminated = eliminatedIds.includes(touch.id);

          return (
            <span
              key={touch.id}
              className={`touch-circle ${phase === PHASE.SPINNING ? 'rotating' : ''} ${isWinner ? 'winner' : ''} ${isEliminated ? 'eliminated' : ''}`}
              style={{ transform: `translate(${touch.x - 35}px, ${touch.y - 35}px)` }}
            />
          );
        })}
      </section>
    </main>
  );
}
