(() => {
  const moodClassNames = [
    "pet-mood-开心",
    "pet-mood-普通",
    "pet-mood-疲惫",
    "pet-mood-生气",
    "pet-energy-low",
    "pet-energy-high",
    "pet-schedule-sleep",
    "pet-schedule-study",
    "pet-schedule-evening"
  ];

  function clearMoodClasses() {
    document.body.classList.remove(...moodClassNames);
  }

  function applyMoodEffects(settings = {}, background = null) {
    clearMoodClasses();
    if (settings.moodAnimationEnabled === false) return;

    const linked = background?.linkedStatus;
    const mood = linked?.petMood || settings.petMood || "普通";
    const energy = Number(linked?.energy ?? settings.energy ?? 70);
    document.body.classList.add(`pet-mood-${mood}`);
    document.body.dataset.petMood = mood;
    document.body.dataset.petEnergy = String(Number.isFinite(energy) ? Math.round(energy) : 70);

    if (energy <= 30) document.body.classList.add("pet-energy-low");
    if (energy >= 80) document.body.classList.add("pet-energy-high");

    const current = settings.currentAiSchedule;
    const activity = current?.activity || "";
    if (/休息|做梦|睡/.test(activity)) document.body.classList.add("pet-schedule-sleep");
    if (/学习|项目|处理/.test(activity)) document.body.classList.add("pet-schedule-study");
    if (/聊天|复盘|陪/.test(activity)) document.body.classList.add("pet-schedule-evening");
  }

  async function refreshMoodEffects() {
    if (!window.tablePet?.getSettings) return;
    try {
      const settings = await window.tablePet.getSettings();
      const background = window.tablePet.getBackgroundInfo
        ? await window.tablePet.getBackgroundInfo({ force: false })
        : null;
      applyMoodEffects(settings, background);
    } catch {
      clearMoodClasses();
    }
  }

  window.addEventListener("tablepet-settings-updated", (event) => applyMoodEffects(event.detail || {}));
  refreshMoodEffects();
  window.setInterval(refreshMoodEffects, 60 * 1000);
})();
