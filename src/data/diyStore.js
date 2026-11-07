const DATABASE = 'kotoba-diy-questions';
const STORE = 'questions';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 题目、录音和 SVG Blob 保存在本机 IndexedDB，不会上传到服务器。
export async function saveDiyQuestion(question) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(question);
    transaction.oncomplete = () => { db.close(); resolve(question); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

export async function listDiyQuestions() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    request.onsuccess = () => { db.close(); resolve(request.result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}
