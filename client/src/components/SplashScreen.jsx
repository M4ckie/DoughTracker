import { useState, useEffect } from 'react';
import './SplashScreen.css';

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('in'); // in | hold | out

  useEffect(() => {
    const toHold = setTimeout(() => setPhase('hold'), 300);
    const toOut  = setTimeout(() => setPhase('out'),  1400);
    const toDone = setTimeout(() => onDone(),          1900);
    return () => { clearTimeout(toHold); clearTimeout(toOut); clearTimeout(toDone); };
  }, []);

  return (
    <div className={`splash splash-${phase}`}>
      <img src="/DonutLogo.png" alt="DoughTracker" className="splash-logo" />
      <span className="splash-title">DoughTracker</span>
    </div>
  );
}
