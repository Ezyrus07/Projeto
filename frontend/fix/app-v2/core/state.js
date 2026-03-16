(() => {
  const globalKey = "__DOKE_V2_STATE__";
  if (window[globalKey]) return;

  const listeners = new Set();
  const state = {
    auth: {
      ready: false,
      loggedIn: false,
      profile: null
    },
    ui: {
      sidebarExpanded: false
    }
  };

  const api = {
    get() {
      return state;
    },
    patch(partial) {
      if (!partial || typeof partial !== "object") return;
      if (partial.auth && typeof partial.auth === "object") {
        Object.assign(state.auth, partial.auth);
      }
      if (partial.ui && typeof partial.ui === "object") {
        Object.assign(state.ui, partial.ui);
      }
      listeners.forEach((fn) => {
        try { fn(state); } catch (_e) {}
      });
    },
    subscribe(fn) {
      if (typeof fn !== "function") return () => {};
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };

  window[globalKey] = api;
})();

