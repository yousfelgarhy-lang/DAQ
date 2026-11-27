export interface DeviceEnvironmentSnapshot {
  hoverHover: boolean | null;
  pointerFine: boolean | null;
  pointerCoarse: boolean | null;
  anyHoverHover: boolean | null;
  anyPointerFine: boolean | null;
  maxTouchPoints?: number;
  viewportWidth?: number;
}

/**
 * Determines whether keyboard shortcut UI hints/instructions should be surfaced.
 * Touch-primary mobile phones and tablets (even at wide 768-1024px+ viewports)
 * return false unless a fine hover-capable pointer is present.
 * Note: actual keyboard event listeners remain active for external hardware keyboards.
 */
export function detectDesktopKeyboardCapability(env: DeviceEnvironmentSnapshot): boolean {
  const hasMatchMediaData =
    env.hoverHover !== null ||
    env.pointerFine !== null ||
    env.pointerCoarse !== null ||
    env.anyHoverHover !== null ||
    env.anyPointerFine !== null;

  if (hasMatchMediaData) {
    if (env.anyHoverHover === true && env.anyPointerFine === true) {
      return true;
    }
    if (env.hoverHover === true && env.pointerFine === true) {
      return true;
    }
    if (env.pointerCoarse === true || env.hoverHover === false) {
      return false;
    }
    if (env.anyPointerFine === true) {
      return true;
    }
    return false;
  }

  const touchPoints = env.maxTouchPoints ?? 0;
  if (touchPoints > 0) return false;
  if (env.viewportWidth !== undefined && env.viewportWidth < 1024) return false;
  return true;
}

function queryMedia(query: string): boolean | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }
  return window.matchMedia(query).matches;
}

export function readCurrentDeviceEnvironment(): DeviceEnvironmentSnapshot {
  if (typeof window === 'undefined') {
    return {
      hoverHover: null,
      pointerFine: null,
      pointerCoarse: null,
      anyHoverHover: null,
      anyPointerFine: null,
      maxTouchPoints: 0,
      viewportWidth: 1280,
    };
  }

  return {
    hoverHover: queryMedia('(hover: hover)'),
    pointerFine: queryMedia('(pointer: fine)'),
    pointerCoarse: queryMedia('(pointer: coarse)'),
    anyHoverHover: queryMedia('(any-hover: hover)'),
    anyPointerFine: queryMedia('(any-pointer: fine)'),
    maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0,
    viewportWidth: window.innerWidth,
  };
}

export function getSupportsKeyboardShortcuts(): boolean {
  return detectDesktopKeyboardCapability(readCurrentDeviceEnvironment());
}
