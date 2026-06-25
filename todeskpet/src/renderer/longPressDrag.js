(() => {
  const portrait = document.querySelector("#portrait");
  if (!portrait || !window.tablePet?.startWindowDrag) return;

  const holdMs = 380;
  const moveTolerance = 10;
  let timer = null;
  let state = null;
  let suppressClick = false;

  function isSettingsLocked() {
    return document.body.classList.contains("settings-open") || document.querySelector("#settingsDialog")?.open;
  }

  function blockNextClick() {
    suppressClick = true;
    window.setTimeout(() => {
      suppressClick = false;
    }, 220);
  }

  function clearTimer() {
    if (!timer) return;
    window.clearTimeout(timer);
    timer = null;
  }

  function clearState({ endDrag = false } = {}) {
    clearTimer();
    document.body.classList.remove("pet-long-press-dragging");
    state = null;
    if (endDrag && window.tablePet?.endWindowDrag) {
      window.tablePet.endWindowDrag()
        .then((result) => {
          window.dispatchEvent(new CustomEvent("tablepet:dockState", { detail: result?.dockState || {} }));
        })
        .catch(() => undefined);
    }
  }

  portrait.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isSettingsLocked()) return;

    state = {
      pointerId: event.pointerId,
      startX: event.screenX,
      startY: event.screenY,
      active: false
    };

    try {
      portrait.setPointerCapture(event.pointerId);
    } catch {
      // Best-effort only; drag movement is controlled by the main process.
    }

    timer = window.setTimeout(async () => {
      if (!state) return;
      try {
        const result = await window.tablePet.startWindowDrag(state.startX, state.startY);
        if (!result?.ok || !state) return;
        state.active = true;
        document.body.classList.add("pet-long-press-dragging");
        window.dispatchEvent(new CustomEvent("tablepet:interaction", { detail: { state: "drag", duration: 0 } }));
        blockNextClick();
      } catch {
        clearState();
      }
    }, holdMs);
  });

  portrait.addEventListener("pointermove", (event) => {
    if (!state || event.pointerId !== state.pointerId) return;

    const moved = Math.hypot(event.screenX - state.startX, event.screenY - state.startY);
    if (!state.active && moved > moveTolerance) {
      clearState();
      return;
    }

    if (!state.active) return;
    event.preventDefault();
  });

  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
    portrait.addEventListener(eventName, (event) => {
      if (state && event.pointerId !== state.pointerId) return;
      const wasActive = Boolean(state?.active);
      clearState({ endDrag: wasActive });
      if (wasActive) blockNextClick();
    });
  });

  window.addEventListener("tablepet:settings-lock", () => {
    const wasActive = Boolean(state?.active);
    clearState({ endDrag: wasActive });
  });

  portrait.addEventListener("click", (event) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
