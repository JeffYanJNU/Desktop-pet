(() => {
  const DEFAULT_TIMEOUT = 3600;
  const MAX_ITEMS = 4;
  let root = null;
  let nextId = 1;
  const recentMessages = new Map();
  const nativeAlert = window.alert?.bind(window);

  function ensureRoot() {
    if (root) return root;
    root = document.createElement("section");
    root.id = "notificationRoot";
    root.className = "notification-root";
    root.setAttribute("aria-live", "polite");
    root.setAttribute("aria-label", "通知");
    document.body.append(root);
    return root;
  }

  function normalizeMessage(message) {
    if (message instanceof Error) return message.message || String(message);
    if (typeof message === "object" && message !== null) {
      return message.message || message.error || JSON.stringify(message);
    }
    return String(message || "").trim() || "操作失败";
  }

  function remove(node) {
    if (!node || !node.parentElement) return;
    node.classList.add("is-leaving");
    window.setTimeout(() => node.remove(), 180);
  }

  function notify(type, message, options = {}) {
    const normalizedMessage = normalizeMessage(message);
    const dedupeKey = `${type || "info"}:${normalizedMessage}`;
    const now = Date.now();
    if (!options.allowDuplicate && now - Number(recentMessages.get(dedupeKey) || 0) < 1400) {
      return { id: 0, close() {}, update() {} };
    }
    recentMessages.set(dedupeKey, now);

    const container = ensureRoot();
    const item = document.createElement("article");
    const id = nextId++;
    const title = options.title || {
      success: "完成",
      warning: "注意",
      error: "出错了",
      loading: "处理中",
      info: "提示"
    }[type] || "提示";
    const timeout = Number.isFinite(Number(options.timeout)) ? Number(options.timeout) : DEFAULT_TIMEOUT;

    item.className = `notification-item notification-${type || "info"}`;
    item.dataset.notificationId = String(id);
    item.innerHTML = `
      <div class="notification-copy">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(normalizedMessage)}</span>
      </div>
      <button type="button" aria-label="关闭通知">×</button>
    `;

    item.querySelector("button")?.addEventListener("click", () => remove(item));
    container.prepend(item);

    while (container.children.length > MAX_ITEMS) {
      remove(container.lastElementChild);
    }

    if (type !== "loading" && timeout > 0) {
      window.setTimeout(() => remove(item), timeout);
    }

    return {
      id,
      close: () => remove(item),
      update(nextType, nextMessage, nextOptions = {}) {
        item.className = `notification-item notification-${nextType || "info"}`;
        item.querySelector("strong").textContent = nextOptions.title || title;
        item.querySelector("span").textContent = normalizeMessage(nextMessage);
        if (nextType !== "loading") window.setTimeout(() => remove(item), Number(nextOptions.timeout || DEFAULT_TIMEOUT));
      }
    };
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.tablePetNotify = {
    success: (message, options) => notify("success", message, options),
    warning: (message, options) => notify("warning", message, options),
    error: (message, options) => notify("error", message, { timeout: 5200, ...options }),
    info: (message, options) => notify("info", message, options),
    loading: (message, options) => notify("loading", message, { timeout: 0, ...options }),
    fromResult(result, successMessage = "操作完成") {
      if (result?.error) return this.error(result.error);
      return this.success(successMessage);
    },
    capture(error, fallback = "操作失败", options) {
      const message = normalizeMessage(error || fallback);
      console.error(fallback, error);
      return this.error(message, options);
    },
    async promise(promise, messages = {}) {
      const pending = messages.loading ? this.loading(messages.loading) : null;
      try {
        const result = await promise;
        pending?.close?.();
        if (messages.success) this.success(messages.success);
        return result;
      } catch (error) {
        pending?.close?.();
        this.capture(error, messages.error || "操作失败");
        throw error;
      }
    },
    alert(message, options) {
      return this.warning(message, { title: "提示", ...options });
    },
    nativeAlert
  };

  window.alert = (message) => {
    window.tablePetNotify.alert(message);
  };

  window.addEventListener("error", (event) => {
    window.tablePetNotify.error(event.error || event.message || "界面发生错误");
  });

  window.addEventListener("unhandledrejection", (event) => {
    window.tablePetNotify.error(event.reason || "异步操作失败");
  });
})();
