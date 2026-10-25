import { useCallback, useRef } from "react";

/**
 * Keyboard behaviour for a `role="tablist"`, as the ARIA pattern specifies it.
 *
 * Three tab strips on this page were built as a row of plain buttons wearing
 * `role="tab"`. Announcing yourself as a tablist is a promise about how you can
 * be driven: left and right move between tabs, Home and End jump to the ends,
 * and the strip holds exactly one stop in the page's tab order so Tab moves
 * past the whole group rather than through every option in it. None of that was
 * implemented, so a keyboard user met five separate buttons that claimed to be
 * something they could not operate.
 *
 * `activation` is "automatic" here: moving the focus selects, which is right
 * when the panel is already rendered and switching is free. The alternative —
 * move focus, press Enter to select — is for tabs whose panels are expensive.
 *
 * Returns the props for the strip's buttons plus a ref callback to collect
 * them, so each call site stays a one-liner.
 */
export function useTabKeys<T extends string>(
  ids: readonly T[],
  active: T,
  onSelect: (id: T) => void
) {
  const buttons = useRef(new Map<T, HTMLButtonElement | null>());

  const register = useCallback(
    (id: T) => (node: HTMLButtonElement | null) => {
      buttons.current.set(id, node);
    },
    []
  );

  const go = useCallback(
    (id: T) => {
      onSelect(id);
      const node = buttons.current.get(id);
      if (!node) return;
      node.focus();
      /*
       * The strip scrolls horizontally on a phone, so the tab that was just
       * chosen can be entirely outside the visible part of it — selecting a tab
       * you cannot see is the same as nothing happening. `nearest` keeps the
       * page itself from scrolling at the same time.
       */
      node.scrollIntoView({ block: "nearest", inline: "nearest" });
    },
    [onSelect]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const from = ids.indexOf(active);
      if (from === -1) return;

      let to = from;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          to = (from + 1) % ids.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          to = (from - 1 + ids.length) % ids.length;
          break;
        case "Home":
          to = 0;
          break;
        case "End":
          to = ids.length - 1;
          break;
        default:
          return;
      }

      // Only now, once the key is known to be one we handle: arrow keys must
      // still scroll the page everywhere else.
      e.preventDefault();
      go(ids[to]);
    },
    [ids, active, go]
  );

  /** Spread onto each tab button. `id` is that button's own tab id. */
  const tabProps = useCallback(
    (id: T) => ({
      ref: register(id),
      role: "tab" as const,
      "aria-selected": id === active,
      // The roving stop: the selected tab is the group's single tab stop.
      tabIndex: id === active ? 0 : -1,
      onKeyDown,
      onClick: () => onSelect(id),
    }),
    [active, onKeyDown, onSelect, register]
  );

  return { tabProps };
}
