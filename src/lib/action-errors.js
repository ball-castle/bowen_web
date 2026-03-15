export function getActionErrorMessage(error, fallback = "操作失败，请稍后再试") {
  if (error instanceof Error) {
    if (error.message === "Unauthorized") {
      return "登录状态已失效，请刷新页面后重新登录";
    }

    if (error.message) {
      return error.message;
    }
  }

  return fallback;
}
