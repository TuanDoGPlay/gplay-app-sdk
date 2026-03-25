import {Directory, Encoding, Filesystem} from "@capacitor/filesystem";

const DB_FILENAME = "appdb.json";

let db: any = {};

async function initDatabase(object:Record<string, any>) {
  try {
    const result = await Filesystem.readFile({
      path: DB_FILENAME,
      directory: Directory.Data,
      encoding: Encoding.UTF8
    });
    db = JSON.parse(result.data as string);
    console.log("Database loaded", db);
  } catch (err) {
    console.log("Database loaded error", err);
    await recreateDb()
  }

  async function recreateDb() {
    db = object

    await saveDB();
  }
}

async function saveDB() {
  await Filesystem.writeFile({
    path: DB_FILENAME,
    directory: Directory.Data,
    data: JSON.stringify(db, null, 2),
    encoding: Encoding.UTF8
  });
  console.log("Database saved", db);
}

async function createTable(table: string) {
  if (!db[table]) {
    db[table] = [];
    await saveDB();
  }
}


async function select<T>(table: string, filter?: Partial<T>): Promise<T[]> {
  if (!db[table]) return [];

  if (!filter) return db[table];

  return db[table].filter((row: T) =>
    Object.entries(filter).every(([k, v]) => (row as any)[k] === v)
  );
}

async function insert(table: string, record: any) {
  if (!db[table]) db[table] = [];

  db[table].push(record);
  await saveDB();
}

async function update(table: string, filter: any, updateData: any) {
  if (!db[table]) return;

  db[table] = db[table].map((row: any) =>
    Object.entries(filter).every(([k, v]) => row[k] === v)
      ? {...row, ...updateData}
      : row
  );

  await saveDB();
}

async function remove(table: string, filter: any) {
  if (!db[table]) return;

  db[table] = db[table].filter(
    (row: any) =>
      !Object.entries(filter).every(([k, v]) => row[k] === v)
  );

  await saveDB();
}

export const Database = {
  initDatabase: initDatabase,
  createTable: createTable,
  selectTable: select,
  insertTable: insert,
  updateTable: update,
  deleteTable: remove,
}
