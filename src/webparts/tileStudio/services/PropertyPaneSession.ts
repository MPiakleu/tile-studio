/**
 * Tracks the *currently mounted* SharePoint property-pane field. SharePoint may
 * mount a replacement before disposing the previous field. Disposing a stale
 * field must never invalidate the replacement's change callback.
 *
 * Kept independent of SPFx and React so the lifecycle can be regression-tested.
 */
export type PropertyChangeCallback = (targetProperty?: string, newValue?: unknown, isValidEntry?: boolean) => void;

export class PropertyPaneSession<THost> {
  private activeHost: THost | undefined;
  private activeCallback: PropertyChangeCallback | undefined;

  /** Returns a replaced host (if any) for the caller to unmount. */
  public attach(host: THost, callback?: PropertyChangeCallback): THost | undefined {
    const replaced = this.activeHost !== host ? this.activeHost : undefined;
    if (this.activeHost !== host) {
      this.activeHost = host;
      // Never keep a callback supplied by a different, disposed field.
      this.activeCallback = callback;
    } else if (callback) {
      // SPFx can re-render the same host with an updated callback.
      this.activeCallback = callback;
    }
    return replaced;
  }

  /** Returns false for out-of-order disposal of a *previous* host. */
  public detach(host: THost): boolean {
    if (this.activeHost !== host) return false;
    this.activeHost = undefined;
    this.activeCallback = undefined;
    return true;
  }

  public clear(): void {
    this.activeHost = undefined;
    this.activeCallback = undefined;
  }

  public get host(): THost | undefined { return this.activeHost; }
  public get changeCallback(): PropertyChangeCallback | undefined { return this.activeCallback; }
}
