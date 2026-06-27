import { useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface OtpBoxesProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Digit-box OTP input — auto-advance, auto-submit-on-fill, paste support.
 */
export default function OtpBoxes({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
}: OtpBoxesProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, '').slice(0, length).split('');

  // Focus first empty box on mount
  useEffect(() => {
    if (autoFocus) {
      const idx = Math.min(value.length, length - 1);
      inputs.current[idx]?.focus();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const focus = (idx: number) => inputs.current[Math.max(0, Math.min(idx, length - 1))]?.focus();

  const handleChange = (idx: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const arr = digits.slice();
    arr[idx] = digit;
    const next = arr.join('').replace(/\s/g, '');
    onChange(next);
    if (digit) focus(idx + 1);
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const arr = digits.slice();
        arr[idx] = '';
        onChange(arr.join(''));
      } else {
        focus(idx - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      focus(idx - 1);
    } else if (e.key === 'ArrowRight') {
      focus(idx + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    focus(Math.min(pasted.length, length - 1));
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={el => { inputs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[idx] === ' ' ? '' : digits[idx]}
          disabled={disabled}
          onChange={e => handleChange(idx, e.target.value)}
          onKeyDown={e => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className={cn(
            'w-11 h-14 text-center text-xl font-bold rounded-lg border-2 bg-input text-foreground',
            'transition-all duration-150 outline-none',
            'focus:border-primary focus:ring-2 focus:ring-primary/20',
            digits[idx] && digits[idx] !== ' '
              ? 'border-primary/60 bg-primary/5'
              : 'border-border',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      ))}
    </div>
  );
}
