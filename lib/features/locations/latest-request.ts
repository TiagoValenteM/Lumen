export function createLatestRequest() {
  let active: AbortController | undefined;

  function cancel() {
    active?.abort();
    active = undefined;
  }

  return {
    cancel,
    start() {
      cancel();
      const request = new AbortController();
      active = request;
      return {
        signal: request.signal,
        isCurrent: () => active === request,
        finish() {
          if (active !== request) return false;
          active = undefined;
          return true;
        },
      };
    },
  };
}
