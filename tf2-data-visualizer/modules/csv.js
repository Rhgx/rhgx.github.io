// CSV parsing via Web Worker using PapaParse inside the worker.
const workerUrl = "./modules/workers/csvWorker.js";

let csvWorker = null;

const ensureWorker = () => {
  if (csvWorker && csvWorker._alive) return csvWorker;
  csvWorker = new Worker(workerUrl);
  csvWorker._alive = true;
  return csvWorker;
};

const callWorker = (payload) =>
  new Promise((resolve, reject) => {
    const w = ensureWorker();

    const onMessage = (e) => {
      const msg = e.data || {};
      if (msg.id !== payload.id) return;
      if (msg.type === "done") {
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
        resolve(msg.result);
      } else if (msg.type === "error") {
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
        reject(new Error(msg.error || "Worker error"));
      }
    };

    const onError = (err) => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      reject(err);
    };

    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    w.postMessage(payload);
  });

const uid = () => Math.random().toString(36).slice(2);

export const parseCSVFile = async (file, options = {}) => {
  const id = uid();
  const result = await callWorker({
    id,
    action: "parseFile",
    options: {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      ...options,
    },
    file,
  });
  // { data, meta }
  return result;
};

export const parseCSVText = async (text, options = {}) => {
  const id = uid();
  const result = await callWorker({
    id,
    action: "parseText",
    options: {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      ...options,
    },
    text,
  });
  return result;
};