(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("visibilityProbe") !== "1") return;

  function addProbe() {
    document.documentElement.style.background = "#ffffff";
    document.body.style.background = "#ffffff";
    document.body.style.outline = "8px solid #ff2d75";
    document.body.style.outlineOffset = "-8px";
    document.body.style.minHeight = "100vh";

    let probe = document.getElementById("tablePetVisibilityProbe");
    if (!probe) {
      probe = document.createElement("div");
      probe.id = "tablePetVisibilityProbe";
      document.body.appendChild(probe);
    }

    probe.textContent = "Table Pet renderer is visible";
    probe.style.cssText = [
      "position:fixed",
      "left:16px",
      "top:16px",
      "z-index:999999",
      "padding:14px 18px",
      "border-radius:12px",
      "background:#ffffff",
      "color:#111111",
      "font:700 16px/1.3 Microsoft YaHei UI, Segoe UI, sans-serif",
      "box-shadow:0 0 0 4px #ff2d75,0 18px 40px rgba(0,0,0,.35)",
      "pointer-events:none"
    ].join(";");
  }

  window.addEventListener("error", (event) => {
    console.error("Table Pet renderer error:", event.error || event.message);
    addProbe();
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("Table Pet renderer rejection:", event.reason);
    addProbe();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addProbe, { once: true });
  } else {
    addProbe();
  }
})();
