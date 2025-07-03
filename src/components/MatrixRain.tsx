import { useEffect, useState } from "react";

const MatrixRain = () => {
  const [streams, setStreams] = useState<Array<{ id: number; chars: string[]; left: number; delay: number; speed: number }>>([]);

  useEffect(() => {
    // Matrix characters - mix of code, binary, and tech symbols
    const matrixChars = [
      '0', '1', '{', '}', '(', ')', '[', ']', ';', ':', '/', '\\', 
      '<', '>', '=', '+', '-', '*', '%', '&', '|', '^', '~', '?',
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
      'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'CREATE', 'DROP',
      'auth', 'user', 'team', 'match', 'veto', 'rank', 'score', 'win',
      'ボ', 'ラ', 'ン', 'ト', 'マ', 'ッ', 'チ', // Some katakana for that matrix feel
    ];

    const generateStream = (id: number) => {
      const streamLength = Math.floor(Math.random() * 20) + 10;
      const chars = Array(streamLength).fill(0).map(() => 
        matrixChars[Math.floor(Math.random() * matrixChars.length)]
      );
      
      return {
        id,
        chars,
        left: Math.random() * 100,
        delay: Math.random() * 2000,
        speed: Math.random() * 3 + 1
      };
    };

    // Generate initial streams
    const initialStreams = Array(50).fill(0).map((_, i) => generateStream(i));
    setStreams(initialStreams);

    // Regenerate streams periodically for variation
    const interval = setInterval(() => {
      setStreams(prevStreams => 
        prevStreams.map(stream => 
          Math.random() < 0.1 ? generateStream(stream.id) : stream
        )
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-40">
      {streams.map((stream) => (
        <div
          key={stream.id}
          className="absolute top-0 text-blue-400 opacity-70 font-mono text-sm whitespace-nowrap animate-matrix-fall"
          style={{
            left: `${stream.left}%`,
            animationDelay: `${stream.delay}ms`,
            animationDuration: `${stream.speed}s`,
            filter: 'blur(0.5px)',
            textShadow: '0 0 5px #3b82f6, 0 0 10px #3b82f6'
          }}
        >
          {stream.chars.map((char, index) => (
            <div
              key={index}
              className="block leading-4"
              style={{
                opacity: Math.max(0.1, 1 - (index * 0.1)),
                color: index === 0 ? '#60a5fa' : '#3b82f6'
              }}
            >
              {char}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default MatrixRain;