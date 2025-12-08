const offlineDB = new PouchDB('offline-actions');

async function saveOfflineAction(action) {
  const doc = {
    _id: `${action.type}_${Date.now()}`,
    ...action
  };
  return offlineDB.put(doc);
}

function getOfflineActions() {
  return offlineDB.allDocs({ include_docs: true });
}

function deleteOfflineAction(id, rev) {
  return offlineDB.remove(id, rev);
}