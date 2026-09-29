import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";

export interface VirtualStickProps {
  onVector(x: number, y: number): void;
}

export function VirtualStick({ onVector }: VirtualStickProps): ReactElement {
  const activePointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const release = (pointerId?: number) => {
    if (
      pointerId !== undefined &&
      activePointer.current !== null &&
      pointerId !== activePointer.current
    ) return;
    activePointer.current = null;
    setKnob({ x: 0, y: 0 });
    onVector(0, 0);
  };

  const update = (element: HTMLElement, clientX: number, clientY: number) => {
    const rect = element.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
    let x = (clientX - (rect.left + rect.width / 2)) / radius;
    let y = (clientY - (rect.top + rect.height / 2)) / radius;
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }
    setKnob({ x, y });
    onVector(x, y);
  };

  useEffect(() => {
    const handleBlur = () => release();
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
      release();
    };
  }, [onVector]);

  const begin = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== null) return;
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    update(event.currentTarget, event.clientX, event.clientY);
  };

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    update(event.currentTarget, event.clientX, event.clientY);
  };

  return (
    <div
      aria-label="Movement stick"
      className="virtual-stick touch-control"
      onLostPointerCapture={(event) => release(event.pointerId)}
      onPointerCancel={(event) => release(event.pointerId)}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={(event) => release(event.pointerId)}
      role="application"
    >
      <span
        className="virtual-stick-knob"
        style={{ transform: `translate(${knob.x * 34}px, ${knob.y * 34}px)` }}
      />
    </div>
  );
}
