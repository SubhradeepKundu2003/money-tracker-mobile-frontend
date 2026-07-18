import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportGuestData, importGuestData } from './localStore';
import { todayIso } from '../utils/format';

const SCHEMA = 'money-tracker-backup';

// Writes a JSON snapshot of all on-device data to the cache dir and opens the
// native share sheet so the user can save it to Drive/Files/email/etc.
export async function exportBackup() {
  const data = await exportGuestData();
  const payload = {
    schema: SCHEMA,
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  };

  const file = new File(Paths.cache, `money-tracker-backup-${todayIso()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(payload, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export Money Tracker data',
  });
}

// Lets the user pick a previously exported JSON file and replaces all
// on-device data with its contents. Returns the parsed payload, or `null` if
// the user canceled the file picker.
export async function importBackup() {
  const pick = await File.pickFileAsync({ mimeTypes: 'application/json' });
  if (pick.canceled) return null;

  let payload;
  try {
    payload = JSON.parse(await pick.result.text());
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const shapeOk =
    payload &&
    ['accounts', 'categories', 'transactions', 'budgets'].every((k) => Array.isArray(payload[k]));
  if (!shapeOk) {
    throw new Error("This doesn't look like a Money Tracker backup file.");
  }

  await importGuestData(payload);
  return payload;
}
