import { useEffect, useRef, useState } from 'react';

const PHASE = {
  SETUP: 'setup',
  COLLECTING: 'collecting',
  SPINNING: 'spinning',
  ELIMINATING: 'eliminating',
  RESULT: 'result',
};

const GAME = {
  FINGER: 'finger',
  COIN: 'coin',
  DICE: 'dice',
};

const START_DELAY_MS = 2000;
const SPIN_MS = 2000;
const ELIMINATION_MS = 550;
const COIN_FLIP_MS = 1200;
const DICE_ROLL_MS = 900;

const shuffle = (array) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const rollDiceSet = (count) => Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);

const rollUnlockedDice = (currentValues, currentLocked) => currentValues.map((value, index) => (
  currentLocked[index] ? value : Math.floor(Math.random() * 6) + 1
));


const PIP_MAP = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export default function App() {
  const [currentGame, setCurrentGame] = useState(GAME.FINGER);

  const [phase, setPhase] = useState(PHASE.SETUP);
  const [winnerCount, setWinnerCount] = useState(1);
  const [activeTouches, setActiveTouches] = useState([]);
  const [participantIds, setParticipantIds] = useState([]);
  const [winnerIds, setWinnerIds] = useState([]);
  const [eliminatedIds, setEliminatedIds] = useState([]);
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);

  const [coinResult, setCoinResult] = useState(null);
  const [isFlippingCoin, setIsFlippingCoin] = useState(false);

  const [diceCount, setDiceCount] = useState(1);
  const [diceValues, setDiceValues] = useState([1]);
  const [lockedDice, setLockedDice] = useState([false]);
  const [isRollingDice, setIsRollingDice] = useState(false);

  const activeTouchesRef = useRef([]);
  const startDelayTimerRef = useRef(null);
  const spinTimerRef = useRef(null);
  const eliminationTimerRef = useRef(null);
  const coinFlipTimerRef = useRef(null);
  const diceRollTimerRef = useRef(null);

  const clearFingerTimers = () => {
    clearTimeout(startDelayTimerRef.current);
    clearTimeout(spinTimerRef.current);
    clearInterval(eliminationTimerRef.current);
  };

  const resetFingerRound = () => {
    clearFingerTimers();
    setPhase(PHASE.SETUP);
    setActiveTouches([]);
    setParticipantIds([]);
    setWinnerIds([]);
    setEliminatedIds([]);
    setIsCountdownRunning(false);
  };

  const resetCoin = () => {
    clearTimeout(coinFlipTimerRef.current);
    setCoinResult(null);
    setIsFlippingCoin(false);
  };

  const resetDice = () => {
    clearTimeout(diceRollTimerRef.current);
    setIsRollingDice(false);
    setDiceValues(rollDiceSet(diceCount));
    setLockedDice(Array.from({ length: diceCount }, () => false));
  };

  useEffect(
    () => () => {
      clearFingerTimers();
      clearTimeout(coinFlipTimerRef.current);
      clearTimeout(diceRollTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setDiceValues(rollDiceSet(diceCount));
    setLockedDice(Array.from({ length: diceCount }, () => false));
  }, [diceCount]);

  useEffect(() => {
    if (currentGame !== GAME.FINGER || phase !== PHASE.COLLECTING) {
      return;
    }

    clearTimeout(startDelayTimerRef.current);

    if (activeTouches.length === 0) {
      setIsCountdownRunning(false);
      return;
    }

    setIsCountdownRunning(true);

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
  }, [activeTouches.length, currentGame, phase]);

  useEffect(() => {
    if (currentGame !== GAME.FINGER || phase !== PHASE.SPINNING || participantIds.length === 0) {
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
  }, [participantIds, phase, winnerCount, currentGame]);

  const handleStart = () => {
    clearFingerTimers();
    setActiveTouches([]);
    setParticipantIds([]);
    setWinnerIds([]);
    setEliminatedIds([]);
    setIsCountdownRunning(false);
    setPhase(PHASE.COLLECTING);
  };

  const updateFromTouchEvent = (event) => {
    if (currentGame !== GAME.FINGER) {
      return;
    }

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

  const handleGameChange = (game) => {
    setCurrentGame(game);

    if (game !== GAME.FINGER) {
      resetFingerRound();
    }
    if (game !== GAME.COIN) {
      resetCoin();
    }
    if (game !== GAME.DICE) {
      resetDice();
    }
  };

  const launchCoinFlip = () => {
    if (isFlippingCoin) {
      return;
    }

    setIsFlippingCoin(true);
    setCoinResult(null);

    coinFlipTimerRef.current = setTimeout(() => {
      setCoinResult(Math.random() < 0.5 ? 'Pile' : 'Face');
      setIsFlippingCoin(false);
    }, COIN_FLIP_MS);
  };

  const launchDiceRoll = () => {
    if (isRollingDice) {
      return;
    }

    if (lockedDice.every(Boolean)) {
      return;
    }

    setIsRollingDice(true);
    diceRollTimerRef.current = setTimeout(() => {
      setDiceValues((prev) => rollUnlockedDice(prev, lockedDice));
      setIsRollingDice(false);
    }, DICE_ROLL_MS);
  };

  const toggleDieLock = (index) => {
    if (isRollingDice) {
      return;
    }

    setLockedDice((prev) => prev.map((isLocked, idx) => (idx === index ? !isLocked : isLocked)));
  };

  return (
    <main
      className="app"
      onTouchStart={updateFromTouchEvent}
      onTouchMove={updateFromTouchEvent}
      onTouchEnd={updateFromTouchEvent}
      onTouchCancel={updateFromTouchEvent}
    >
      <header className="topbar">
        <h1>Quick Picks</h1>
        <div className="tabs tabs-3">
          <button type="button" className={`tab-btn ${currentGame === GAME.FINGER ? 'active' : ''}`} onClick={() => handleGameChange(GAME.FINGER)}>Doigts</button>
          <button type="button" className={`tab-btn ${currentGame === GAME.COIN ? 'active' : ''}`} onClick={() => handleGameChange(GAME.COIN)}>Pile ou Face</button>
          <button type="button" className={`tab-btn ${currentGame === GAME.DICE ? 'active' : ''}`} onClick={() => handleGameChange(GAME.DICE)}>Dés</button>
        </div>
      </header>

      {currentGame === GAME.FINGER && (
        <>
          <section className="overlay">
            {phase === PHASE.SETUP && (
              <div className="card">
                <h2>Sélecteur de doigts</h2>
                <p>Choisissez combien de doigts doivent rester.</p>
                <div className="counter-wrap">
                  <span className="counter-label">Doigts conservés</span>
                  <div className="counter-row">
                    <button type="button" className="counter-btn" onClick={() => setWinnerCount((prev) => Math.max(1, prev - 1))}>−</button>
                    <span className="counter-value">{winnerCount}</span>
                    <button type="button" className="counter-btn" onClick={() => setWinnerCount((prev) => Math.min(20, prev + 1))}>+</button>
                  </div>
                </div>
                <button type="button" className="start-btn" onClick={handleStart}>Start</button>
              </div>
            )}

            {phase === PHASE.COLLECTING && (
              <div className="hint">
                {activeTouches.length === 0
                  ? 'Posez vos doigts sur l\'écran 👇'
                  : 'Le tirage démarre 2s après le dernier doigt ajouté/retiré.'}
                {isCountdownRunning && <small>Tirage dans ~2s</small>}
              </div>
            )}

            {phase === PHASE.RESULT && (
              <div className="card">
                <h2>Résultat</h2>
                <p>{winnerIds.length} doigt(s) conservé(s).</p>
                <button type="button" className="start-btn" onClick={resetFingerRound}>Recommencer</button>
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
        </>
      )}

      {currentGame === GAME.COIN && (
        <section className="coin-layout">
          <div className="card coin-card">
            <h2>Pile ou Face</h2>
            <p>Un tirage simple et rapide.</p>
            <div className={`coin ${isFlippingCoin ? 'flipping' : ''}`}>
              <div className={`coin-face ${coinResult === 'Pile' || coinResult === null ? 'active' : ''}`}>
                <span className="coin-symbol">₪</span>
                <small>PILE</small>
              </div>
              <div className={`coin-face ${coinResult === 'Face' ? 'active' : ''}`}>
                <span className="coin-symbol">★</span>
                <small>FACE</small>
              </div>
            </div>
            <button type="button" className="start-btn" onClick={launchCoinFlip}>{isFlippingCoin ? 'Lancement...' : 'Lancer la pièce'}</button>
            {coinResult && !isFlippingCoin && <p className="coin-result">Résultat : {coinResult}</p>}
          </div>
        </section>
      )}

      {currentGame === GAME.DICE && (
        <section className="coin-layout">
          <div className="card coin-card">
            <h2>Lancer de dés</h2>
            <p>Choisis de 1 à 6 dés puis lance.</p>

            <div className="counter-wrap">
              <span className="counter-label">Nombre de dés</span>
              <div className="counter-row">
                <button type="button" className="counter-btn" onClick={() => setDiceCount((prev) => Math.max(1, prev - 1))}>−</button>
                <span className="counter-value">{diceCount}</span>
                <button type="button" className="counter-btn" onClick={() => setDiceCount((prev) => Math.min(6, prev + 1))}>+</button>
              </div>
            </div>

            <div className="dice-grid">
              {diceValues.map((value, index) => (
                <button
                  type="button"
                  key={`${value}-${index}`}
                  className={`die ${isRollingDice ? 'rolling' : ''} ${lockedDice[index] ? 'locked' : ''}`}
                  onClick={() => toggleDieLock(index)}
                >
                  <div className="die-face">
                    {Array.from({ length: 9 }).map((_, cellIndex) => (
                      <span
                        key={cellIndex}
                        className={`pip ${PIP_MAP[value].includes(cellIndex) ? 'on' : ''}`}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>

            <p className="dice-help">Touchez un dé pour le figer / défiger.</p>

            <button type="button" className="start-btn" onClick={launchDiceRoll}>
              {isRollingDice ? 'Lancement...' : 'Lancer les dés'}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
