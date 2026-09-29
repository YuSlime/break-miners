import type { ReactElement } from "react";

export interface ErrorScreenProps {
  message: string;
  onRetry: () => void;
}

export function ErrorScreen({ message, onRetry }: ErrorScreenProps): ReactElement {
  return (
    <section className="error-panel" role="alert">
      <h2>MINING SYSTEM OFFLINE</h2>
      <p>{message}</p>
      <button className="secondary-button" onClick={onRetry} type="button">
        RETRY
      </button>
    </section>
  );
}
