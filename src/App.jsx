import { useEffect, useRef, useState } from 'react';

const PHASE = {
  SETUP: 'setup',
  COLLECTING: 'collecting',
  SPINNING: 'spinning',
  ELIMINATING: 'eliminating',
  RESULT: 'result',
};

const START_DELAY_MS = 2500;
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
  const [participantIds, setParticipantIds] = useState([]);
  const [winnerIds, setWinnerIds] = useState([]);
  const [eliminatedIds, setEliminatedIds] = useState([]);
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);

  const activeTouchesRef = useRef([]);
  const startDelayTimerRef = useRef(null);
  const spinTimerRef = useRef(null);
  const eliminationTimerRef = useRef(null);

  const clearTimers = () => {
    clearTimeout(startDelayTimerRef.current);
    clearTimeout(spinTimerRef.current);
    clearInterval(eliminationTimerRef.current);
  };

  const resetRound = () => {
    clearTimers();
    setPhase(PHASE.SETUP);
    setActiveTouches([]);
    setParticipantIds([]);
    setWinnerIds([]);
    setEliminatedIds([]);
    setIsCountdownRunning(false);
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    if (phase !== PHASE.COLLECTING) {
      return;
    }

    if (activeTouches.length === 0) {
      clearTimeout(startDelayTimerRef.current);
      setIsCountdownRunning(false);
      return;
    }

    setIsCountdownRunning(true);
    clearTimeout(startDelayTimerRef.current);

    startDelayTimerRef.current = setTimeout(() => {
      const ids = activeTouchesRef.current.map((touch) => touch.id);
      if (ids.length === 0) {
        setIsCountdownRunning(false);
        return;
      }

      setParticipantIds(ids);
      setPhase(PHASE.SPINNING);
      setIsCountdownRunning(false);
    }, START_DELAY_MS);
  }, [activeTouches, phase]);

  useEffect(() => {
    if (phase !== PHASE.SPINNING || participantIds.length === 0) {
      return;
    }

    spinTimerRef.current = setTimeout(() => {
      const safeWinnerCount = Math.max(1, Math.min(winnerCount, participantIds.length));
      const shuffled = shuffle(participantIds);
      const kept = shuffled.slice(0, safeWinnerCount);
      const out = shuffled.slice(safeWinnerCount);

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
  }, [participantIds, phase, winnerCount]);

  const handleStart = () => {
    clearTimers();
    setActiveTouches([]);
    setParticipantIds([]);
    setWinnerIds([]);
    setEliminatedIds([]);
    setIsCountdownRunning(false);
    setPhase(PHASE.COLLECTING);
  };

  const updateFromTouchEvent = (event) => {
    if (![PHASE.COLLECTING, PHASE.SPINNING, PHASE.ELIMINATING].includes(phase)) {
      return;
    }

    const nextTouches = Array.from(event.touches).map((touch) => ({
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
    }));

    activeTouchesRef.current = nextTouches;
    setActiveTouches(nextTouches);
  };

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

            <div className="counter-wrap">
              <span className="counter-label">Doigts conservés</span>
              <div className="counter-row">
                <button
                  type="button"
                  className="counter-btn"
                  onClick={() => setWinnerCount((prev) => Math.max(1, prev - 1))}
                >
                  −
                </button>
                <span className="counter-value">{winnerCount}</span>
                <button
                  type="button"
                  className="counter-btn"
                  onClick={() => setWinnerCount((prev) => Math.min(20, prev + 1))}
                >
                  +
                </button>
              </div>
            </div>

            <button type="button" className="start-btn" onClick={handleStart}>Start</button>
          </div>
        )}

        {phase === PHASE.COLLECTING && (
          <div className="hint">
            {activeTouches.length === 0
              ? 'Posez vos doigts sur l\'écran 👇'
              : 'Gardez vos doigts appuyés et immobiles...'}
            {isCountdownRunning && <small>Tirage dans ~2.5s</small>}
          </div>
        )}

        {phase === PHASE.RESULT && (
          <div className="card">
            <h2>Résultat</h2>
            <p>{winnerIds.length} doigt(s) conservé(s).</p>
            <button type="button" className="start-btn" onClick={resetRound}>Recommencer</button>
          </div>
        )}
      </section>

      <section className="touch-layer">
        {activeTouches.map((touch) => {
          const isWinner = winnerIds.includes(touch.id);
          const isEliminated = eliminatedIds.includes(touch.id);
          const isLoserAtResult = phase === PHASE.RESULT && winnerIds.length > 0 && !isWinner;

          return (
            <span
              key={touch.id}
              className={`touch-circle ${phase === PHASE.SPINNING ? 'spinning' : ''} ${isWinner ? 'winner' : ''} ${isEliminated || isLoserAtResult ? 'eliminated' : ''}`}
              style={{ transform: `translate(${touch.x - 55}px, ${touch.y - 55}px)` }}
            />
          );
        })}
      </section>
    </main>
  );
}
