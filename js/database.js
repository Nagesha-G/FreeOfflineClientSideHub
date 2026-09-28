const DB_NAME = "OfflineClientHubDB";
const DB_VERSION = 2;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("projects")) {
        const store = db.createObjectStore("projects", { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveProject(project) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite");
    tx.objectStore("projects").put(project);
    tx.oncomplete = () => { db.close(); resolve(project); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
async function getProjects() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const req = db.transaction("projects").objectStore("projects").getAll();
    req.onsuccess = () => { db.close(); resolve(req.result.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt))); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}
async function getProject(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const req = db.transaction("projects").objectStore("projects").get(id);
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}
async function deleteProject(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects","readwrite");
    tx.objectStore("projects").delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
async function clearAllProjects() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects","readwrite");
    tx.objectStore("projects").clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}