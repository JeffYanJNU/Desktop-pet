(() => {
  function notifyError(message) {
    window.tablePetNotify?.error?.(message);
  }

  function wrapAsync(target, eventName, handler, options) {
    if (!target || typeof handler !== "function") return;
    target.addEventListener(eventName, (event) => {
      Promise.resolve(handler(event)).catch((error) => {
        notifyError(error?.message || error || "操作失败");
      });
    }, options);
  }

  window.tablePetErrorBoundary = {
    notifyError,
    wrapAsync
  };
})();
