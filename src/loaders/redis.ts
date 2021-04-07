import redis from 'redis';
import util from 'util';
import config from '../config';

// create and connect redis client to local instance.
const client = redis.createClient({
    port: config.redisPort, // The port number to connect to.
    host: config.redisIP, // The hostname of the database you are connecting to.
    password: config.redisPass // The password for redis database.
});

client.on("ready", () => {
    console.log("Redis is ready");
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
