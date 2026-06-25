(() => {
  function notifySuccess(message) {
    window.tablePetNotify?.success?.(message);
  }

  function notifyWarning(message) {
    window.tablePetNotify?.warning?.(message);
  }

  function notifyError(message) {
    window.tablePetNotify?.error?.(message);
  }

  window.tablePetPortraitNotify = {
    cleanup(result) {
      notifySuccess(`已清理 ${result?.removedCount || 0} 个未使用图片，保留 ${result?.keptCount || 0} 个。`);
    },
    importError(error) {
      notifyError(`导入失败：${error}`);
    },
    importWarnings(warnings) {
      if (warnings?.length) notifyWarning(`图片已导入，但有建议：${warnings.join("；")}`);
    },
    imported() {
      notifySuccess("图片已导入");
    },
    cleared() {
      notifySuccess("图片已清除");
    }
  };
})();
