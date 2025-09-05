import { MongoClient, Db, ServerApiVersion } from 'mongodb';
import { setServers } from 'node:dns';

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB as string;

if (!uri) throw new Error('Missing MONGODB_URI environment variable');
if (!dbName) throw new Error('Missing MONGODB_DB environment variable');

// Programmatic DNS override to mitigate ISP DNS issues resolving SRV/TXT for MongoDB Atlas
// Uses Google and Cloudflare public DNS. Safe no-op if already configured.
setServers(['8.8.8.8', '1.1.1.1']);

let client: MongoClient | undefined;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, {
    // Enhanced options for Nigerian ISP DNS issues
    family: 4, // Use IPv4 only
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    maxPoolSize: 10,
    retryWrites: true,
    retryReads: true,
    // Add server API version for stability
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  global._mongoClientPromise = client.connect();
}

const clientPromise = global._mongoClientPromise as Promise<MongoClient>;

export async function getDb(): Promise<Db> {
  const client = await clientPromise!;
  return client.db(dbName);
}
