import React, { useLayoutEffect, useRef, useState } from "react";

/**
 * The app is shown in whatever device matches the visitor's own screen, because
 * its responsive classes are viewport media queries rather than container
 * queries — the layout it renders is decided by the real viewport, not by how
 * wide we make the canvas. So the frame has to agree with the app:
 *
 *   under 768px   the app lays out for a phone   -> show it in a phone
 *   768 - 1023px  the app shows its sidebar      -> show it plainly, full width
 *   1024px and up the app is comfortably desktop -> show it in a laptop
 *
 * Framing a phone layout inside a laptop lid, or a sidebar layout inside a
 * phone, is what made the mobile hero long and strange.
 */
const LAPTOP_FROM = "(min-width: 1024px)";
const SIDEBAR_FROM = "(min-width: 768px)";

/**
 * The width the app is laid out at inside each frame, before scaling.
 *
 * These trade size against legibility: the app's text ends up at
 * `frameWidth / DESIGN` of its real size. At a 1024px lid the laptop lands
 * around 85%, which keeps 12px text readable. The phone is laid out at a real
 * handset width so the app's own mobile layout is what gets shown.
 */
const LAPTOP_DESIGN = 1200;
const PHONE_DESIGN = 390;

/** A phone screen is a fixed shape; a laptop lid follows the app's height. */
const PHONE_ASPECT = 390 / 844;
const LID_WIDEST = 16 / 9;
const LID_TALLEST = 1.45;

const useMatches = (query: string) => {
  const [matches, setMatches] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);
    sync();

    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [query]);

  return matches;
};

/**
 * Lays the app out at `design` px wide and scales it to the measured screen.
 * Returns the scale and, when the screen's height follows its contents, the
 * height to give the screen.
 */
const useScaledFit = (
  design: number,
  bounds: { widest: number; tallest: number } | null,
  active: boolean
) => {
  const screenRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastWidth = useRef(0);

  const [scale, setScale] = useState(0);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!active) return;

    const screen = screenRef.current;
    const canvas = canvasRef.current;
    if (!screen || !canvas) return;

    const measure = () => {
      const width = screen.clientWidth;
      if (!width) return;

      setScale(width / design);

      if (!bounds) {
        setHeight(0);
        return;
      }

      const bounded = Math.min(
        Math.max(canvas.scrollHeight, design / bounds.widest),
        design / bounds.tallest
      );
      setHeight(Math.round(bounded * (width / design)));
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;

    /*
     * Width is watched on the screen and height on the canvas. Measuring can
     * set the screen's height, so reacting to the screen's own height would
     * feed back into itself — hence the width guard and the split.
     */
    const onScreen = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (Math.abs(width - lastWidth.current) < 0.5) return;
      lastWidth.current = width;
      measure();
    });
    const onCanvas = new ResizeObserver(measure);

    onScreen.observe(screen);
    onCanvas.observe(canvas);

    return () => {
      onScreen.disconnect();
      onCanvas.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, design, bounds?.widest, bounds?.tallest]);

  return { screenRef, canvasRef, scale, height };
};

interface FrameProps {
  children: React.ReactNode;
  className?: string;
  /** Describes the screen contents for anyone not seeing the frame. */
  label: string;
}

/**
 * Picks the device that matches the visitor's screen. Named for the laptop
 * because that is what most visitors see, but it owns all three cases.
 */
export const LaptopFrame: React.FC<FrameProps> = ({
  children,
  className = "",
  label,
}) => {
  const laptop = useMatches(LAPTOP_FROM);
  const sidebar = useMatches(SIDEBAR_FROM);
  const phone = !sidebar;

  const lid = useScaledFit(
    LAPTOP_DESIGN,
    { widest: LID_WIDEST, tallest: LID_TALLEST },
    laptop
  );
  const handset = useScaledFit(PHONE_DESIGN, null, phone);

  /* ------------------------------------------------------------ phone */
  if (phone) {
    return (
      <figure className={`lp-phone ${className}`} aria-label={label}>
        <div className="lp-phone-body">
          <div className="lp-phone-speaker" aria-hidden="true" />
          <div
            ref={handset.screenRef}
            className="lp-phone-screen lp-product"
            style={{ aspectRatio: String(PHONE_ASPECT) }}
          >
            <div
              ref={handset.canvasRef}
              className="lp-laptop-canvas"
              style={{
                width: PHONE_DESIGN,
                transform: `scale(${handset.scale})`,
                opacity: handset.scale ? 1 : 0,
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </figure>
    );
  }

  /* --------------------------------------- tablet / small desktop: plain */
  if (!laptop) {
    return (
      <div
        className={`lp-product border border-[hsl(var(--lp-rule-strong))] bg-card ${className}`}
        aria-label={label}
      >
        {children}
      </div>
    );
  }

  /* ----------------------------------------------------------- laptop */
  return (
    <figure className={`lp-laptop ${className}`} aria-label={label}>
      <div className="lp-laptop-lid">
        <div className="lp-laptop-camera" aria-hidden="true" />

        <div
          ref={lid.screenRef}
          className="lp-laptop-screen"
          style={lid.height ? { height: lid.height } : { aspectRatio: "16 / 10" }}
        >
          {/*
            Scaled from the top left so the app's own title bar stays pinned to
            the top of the screen. Hidden until measured, which happens before
            paint, so there is no flash of an oversized layout.
          */}
          <div
            ref={lid.canvasRef}
            className="lp-laptop-canvas lp-product"
            style={{
              width: LAPTOP_DESIGN,
              transform: `scale(${lid.scale})`,
              opacity: lid.scale ? 1 : 0,
            }}
          >
            {children}
          </div>
        </div>
      </div>

      <div className="lp-laptop-base" aria-hidden="true">
        <div className="lp-laptop-notch" />
      </div>
    </figure>
  );
};
