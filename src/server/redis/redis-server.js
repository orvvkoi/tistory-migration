import redis from 'redis';
import util from 'util';

// create and connect redis client to local instance.
const client = redis.createClient({
    port: process.env.REDIS_PORT, // The port number to connect to.
    host: process.env.REDIS_IP, // The hostname of the database you are connecting to.
    password: process.env.REDIS_PASS // The password for redis database.
});

client.on('connect', () => {
    console.log('Connected to redis database');
});

// redis errors to the console
client.on('error', (err) => console.log('redis error : ', err));

const hgetall = util.promisify(client.hgetall).bind(client);
const hget = util.promisify(client.hget).bind(client);
const hmset = util.promisify(client.hmset).bind(client);
const expireat = util.promisify(client.expireat).bind(client);
const del = util.promisify(client.del).bind(client);
const exists = util.promisify(client.exists).bind(client);

const RedisServer = {
    hgetall,
    hget,
    hmset,
    expireat,
    del,
    exists
};

export default RedisServer;
