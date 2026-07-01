const { screen } = require("electron");

const WINDOW_BASE_SIZE = {
  collapsed: { width: 560, height: 360 },
  chat: { width: 820, height: 680 },
  settings: { width: 940, height: 720 }
};

const COLLAPSED_PORTRAIT_BOTTOM_INSET = 8;
const COLLAPSED_PORTRAIT_DOCK_WIDTH = 310;

function clampPetScale(value, fallback = 1) {
  const scale = Number(value || fallback || 1);
  if (!Number.isFinite(scale)) return Number(fallback) || 1;
  return Math.min(1.5, Math.max(0.7, scale));
}

function getWindowBounds(nextChatVisible = false, scale = 1) {
  const safeScale = clampPetScale(scale);
  const baseSize = nextChatVisible ? WINDOW_BASE_SIZE.chat : WINDOW_BASE_SIZE.collapsed;
  const workArea = screen.getPrimaryDisplay().workArea;
  const margin = Math.round(10 * safeScale);
  const width = Math.min(
    Math.round(baseSize.width * safeScale),
    Math.max(320, workArea.width - margin * 2)
  );
  const height = Math.min(
    Math.round(baseSize.height * safeScale),
    Math.max(340, workArea.height - margin * 2)
  );

  return {
    width,
    height,
    x: Math.round(workArea.x + workArea.width - width - margin),
    y: Math.round(workArea.y + workArea.height - height - margin)
  };
}

function getSettingsWindowBounds(scale = 1) {
  const safeScale = clampPetScale(scale);
  const workArea = screen.getPrimaryDisplay().workArea;
  const margin = Math.round(16 * safeScale);
  const width = Math.min(Math.round(WINDOW_BASE_SIZE.settings.width * safeScale), workArea.width - margin * 2);
  const height = Math.min(Math.round(WINDOW_BASE_SIZE.settings.height * safeScale), workArea.height - margin * 2);

  return {
    width,
    height,
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2)
  };
}

function getPortraitAnchorOffset(bounds, nextChatVisible, scale = 1) {
  const safeScale = clampPetScale(scale);
  const dockWidth = Math.min(bounds.width, Math.round(COLLAPSED_PORTRAIT_DOCK_WIDTH * safeScale));
  const bottomInset = Math.round(COLLAPSED_PORTRAIT_BOTTOM_INSET * safeScale);

  return {
    x: Math.round(bounds.width - dockWidth / 2),
    y: Math.round(bounds.height - bottomInset)
  };
}

function getPortraitScreenAnchor(bounds, nextChatVisible, scale = 1) {
  const offset = getPortraitAnchorOffset(bounds, nextChatVisible, scale);
  return {
    x: Math.round(bounds.x + offset.x),
    y: Math.round(bounds.y + offset.y)
  };
}

function clampWindowBounds(bounds, { fullyVisible = false } = {}) {
  const display = screen.getDisplayMatching(bounds) || screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const margin = 8;

  if (!fullyVisible) {
    return {
      ...bounds,
      x: Math.min(
        workArea.x + workArea.width - margin,
        Math.max(workArea.x - bounds.width + margin, Math.round(bounds.x))
      ),
      y: Math.min(
        workArea.y + workArea.height - margin,
        Math.max(workArea.y - bounds.height + margin, Math.round(bounds.y))
      )
    };
  }

  const minX = workArea.x + margin;
  const minY = workArea.y + margin;
  const maxX = workArea.x + workArea.width - bounds.width - margin;
  const maxY = workArea.y + workArea.height - bounds.height - margin;

  return {
    ...bounds,
    x: Math.round(Math.min(Math.max(bounds.x, minX), Math.max(minX, maxX))),
    y: Math.round(Math.min(Math.max(bounds.y, minY), Math.max(minY, maxY)))
  };
}

function getWindowDockState(bounds) {
  if (!bounds) return { edge: "none", bottom: false };
  const display = screen.getDisplayMatching(bounds) || screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const threshold = 28;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const bottomDistance = Math.abs(bounds.y + bounds.height - (workArea.y + workArea.height));
  const leftDistance = Math.abs(bounds.x - workArea.x);
  const rightDistance = Math.abs(bounds.x + bounds.width - (workArea.x + workArea.width));
  const topDistance = Math.abs(bounds.y - workArea.y);

  let edge = "none";
  if (leftDistance <= threshold && centerY >= workArea.y && centerY <= workArea.y + workArea.height) edge = "left";
  if (rightDistance <= threshold && centerY >= workArea.y && centerY <= workArea.y + workArea.height) edge = "right";
  if (topDistance <= threshold && centerX >= workArea.x && centerX <= workArea.x + workArea.width) edge = "top";

  return {
    edge,
    bottom: bottomDistance <= threshold,
    workArea: {
      x: workArea.x,
      y: workArea.y,
      width: workArea.width,
      height: workArea.height
    }
  };
}

module.exports = {
  WINDOW_BASE_SIZE,
  clampPetScale,
  getWindowBounds,
  getSettingsWindowBounds,
  getPortraitAnchorOffset,
  getPortraitScreenAnchor,
  clampWindowBounds,
  getWindowDockState
};
