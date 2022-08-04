import * as Memcached from "memcached";

export interface CacheRequest {
	setCache(key: number): Promise<void>;
}

const MIN = 60;
const HOUR = 60 * MIN;

class SetCacheRequest implements CacheRequest { // Exception if Memcache is not available
	constructor(private plate: string, private client: Memcached) {}

	async setCache(price: number): Promise<void> {
		const requestKey = `api-${this.plate}`;
		const deleteRequest = new Promise((res, _) => {
			this.client.del(requestKey, (err, result) => res(result));
		});
		const setRequest = await new Promise((res, _) => {
			this.client.set(this.plate, price, HOUR, (err, result) => res(result));
		});
		await deleteRequest;
		await setRequest;
	}
}

export class VehiclePriceCacheRepository {

	private readonly client: Memcached;

	constructor() {
		const port = process.env.MEMCACHE_PORT || 11211;
		this.client = new Memcached(`localhost:${port}`, {
			retries: 0,
			failures: 0
		});
		this.client.on("failure", err => {
			console.error(err);
		});
		this.client.version((err, version) => {
			console.log("Connected to Memcached Server:");
			console.log(version);
		});
	}

	async getCachedPrice(plate: string): Promise<number | null> {
		return new Promise((res, _) => {
			this.client.get(plate, (err, data) => data === undefined ? res(null) : res(data));
		});
	}

	/**
	 *
	 * @param plate
	 */

	async requestSetPrice(plate: string): Promise<CacheRequest | null> {
		const requestKey = `api-${plate}`;
		const requestExists = await new Promise((res, _) => {
			this.client.get(requestKey, (err, data) => data === undefined ? res(false) : res(true));
		});
		if (requestExists) return null;
		return new Promise((res, rej) => {
			this.client.set(requestKey, true, 10_000, (err, result) => {
				if (result) res(new SetCacheRequest(plate, this.client));
				else rej(err);
			});
		});
	}

}

export default new VehiclePriceCacheRepository();