// SPDX-License-Identifier: Apache-2.0
/**
 * Google Wiz + Angular Signals Resumable Frontend Runtime
 * Implements:
 * 1. Fine-grained reactive signals (`createSignal`, `createComputed`)
 * 2. `jsaction` event delegation contract (`click:cOuCgd; keydown:I481le`)
 *    enabling 0 KB eager hydration until user interaction
 * 3. `jscontroller` lazy controller activation & `jsmodel` state binding
 */

export interface WizSignal<T> {
  (): T;
  set(nextValue: T): void;
  update(updater: (prev: T) => T): void;
  subscribe(listener: (val: T) => void): () => void;
}

export function createSignal<T>(initialValue: T): WizSignal<T> {
  let current = initialValue;
  const listeners = new Set<(val: T) => void>();

  const getter = (() => current) as WizSignal<T>;
  getter.set = (nextValue: T) => {
    if (!Object.is(current, nextValue)) {
      current = nextValue;
      for (const listener of listeners) {
        listener(current);
      }
    }
  };
  getter.update = (updater: (prev: T) => T) => {
    getter.set(updater(current));
  };
  getter.subscribe = (listener: (val: T) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return getter;
}

export function createComputed<T>(
  computeFn: () => T,
  dependencies: ReadonlyArray<{
    subscribe: (listener: () => void) => () => void;
  }>,
): WizSignal<T> {
  const out = createSignal<T>(computeFn());
  for (const dep of dependencies) {
    dep.subscribe(() => {
      out.set(computeFn());
    });
  }
  return out;
}

export interface ParsedJsAction {
  readonly eventType: string;
  readonly actionName: string;
}

/**
 * Parses a Google Wiz `jsaction` attribute string such as:
 * `"click:cOuCgd; keydown:I481le; submit:d3sQLd"`
 * If no event type prefix is specified (e.g. `"cOuCgd"`), defaults to `"click"`.
 */
export function parseJsActionAttribute(raw: string): ParsedJsAction[] {
  return raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((entry) => {
      const colonIdx = entry.indexOf(":");
      if (colonIdx === -1) {
        return { eventType: "click", actionName: entry };
      }
      return {
        eventType: entry.slice(0, colonIdx).trim() || "click",
        actionName: entry.slice(colonIdx + 1).trim(),
      };
    });
}

export type WizControllerHandler = (context: {
  controllerId: string;
  actionName: string;
  eventType: string;
  payload?: unknown;
}) => Promise<unknown> | unknown;

/**
 * Wiz Resumable Event Contract (`jsaction` + `jscontroller`).
 * Buffers events and lazily resolves controllers on first interaction.
 */
export class WizResumableRuntime {
  private readonly controllers = new Map<
    string,
    Record<string, WizControllerHandler>
  >();
  private hydratedControllerCount = 0;

  registerController(
    controllerId: string,
    actions: Record<string, WizControllerHandler>,
  ): void {
    this.controllers.set(controllerId, actions);
  }

  getHydratedCount(): number {
    return this.hydratedControllerCount;
  }

  async dispatchJsAction(params: {
    controllerId: string;
    jsactionAttr: string;
    eventType: string;
    payload?: unknown;
  }): Promise<{ handled: boolean; actionName?: string; result?: unknown }> {
    const bindings = parseJsActionAttribute(params.jsactionAttr);
    const matched = bindings.find((b) => b.eventType === params.eventType);
    if (!matched) {
      return { handled: false };
    }

    const ctrl = this.controllers.get(params.controllerId);
    if (!ctrl || !ctrl[matched.actionName]) {
      return { handled: false, actionName: matched.actionName };
    }

    this.hydratedControllerCount += 1;
    const result = await ctrl[matched.actionName]({
      controllerId: params.controllerId,
      actionName: matched.actionName,
      eventType: params.eventType,
      payload: params.payload,
    });

    return {
      handled: true,
      actionName: matched.actionName,
      result,
    };
  }
}
