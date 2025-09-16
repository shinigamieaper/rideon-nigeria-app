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
    // Enhanced options for Nigerian ISP network instability
    family: 4, // Use IPv4 only
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    // Keep the pool small in development to reduce NAT/ISP idle drops
    maxPoolSize: 3,
    minPoolSize: 0,
    maxIdleTimeMS: 45000,
    waitQueueTimeoutMS: 5000,
    // Note: TCP keepalive is managed by the driver/OS in Node MongoDB v6; no explicit keepAlive options here.
    // Helpful metadata
    appName: 'RideON-App',
    retryWrites: true,
    retryReads: true,
    // Add server API version for stability
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  // Perform an initial ping so we fail fast if the connection is unhealthy
  global._mongoClientPromise = client.connect().then(async (c) => {
    try {
      await c.db(dbName).command({ ping: 1 });
    } catch (err) {
      console.warn('Initial MongoDB ping failed:', err);
    }
    return c;
  });
}

const clientPromise = global._mongoClientPromise as Promise<MongoClient>;

export async function getDb(): Promise<Db> {
  const client = await clientPromise!;
  return client.db(dbName);
}
