/* global Papa */
importScripts(
  "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"
);

self.onmessage = (e) => {
  const msg = e.data || {};
  const { id, action, options } = msg;

  const done = (result) => {
    self.postMessage({ id, type: "done", result });
  };
  const fail = (err) => {
    self.postMessage({ id, type: "error", error: err?.message || String(err) });
  };

  try {
    if (action === "parseFile") {
      Papa.parse(msg.file, {
        ...options,
        worker: false, // already in a worker
        complete: (res) => done({ data: res.data, meta: res.meta }),
        error: (err) => fail(err),
      });
    } else if (action === "parseText") {
      Papa.parse(msg.text, {
        ...options,
        worker: false,
        complete: (res) => done({ data: res.data, meta: res.meta }),
        error: (err) => fail(err),
      });
    } else {
      fail(new Error("Unknown action"));
    }
  } catch (err) {
    fail(err);
  }
};