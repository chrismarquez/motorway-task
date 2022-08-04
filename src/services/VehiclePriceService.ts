import { EventRepository } from "../repositories/EventRepository";
import {VehiclePriceAPIRepository } from "../repositories/VehiclePriceAPIRepository";
import { VehiclePriceCacheRepository } from "../repositories/VehiclePriceCacheRepository";


export class VehiclePriceService {

	constructor(
		private cache: VehiclePriceCacheRepository,
		private api: VehiclePriceAPIRepository,
		private events: EventRepository<number>
	) {}

	async getPrice(plate: string, skipCacheForRead = true): Promise<number> {
		if (skipCacheForRead) return this.api.getExternalPrice(plate);
		const cachedPrice = await this.cache.getCachedPrice(plate);
		if (cachedPrice === null) return await this.tryRequestPrice(plate);
		console.log("Cache Hit");
		return cachedPrice;
	}

	private async tryRequestPrice(plate: string): Promise<number> {
		const request = await this.cache.requestSetPrice(plate);
		if (request === null) return await this.listenForPrice(plate);
		console.log("API Request");
		const price = await this.api.getExternalPrice(plate);
		await request.setCache(price);
		await this.notifyPrice(plate, price);
		return price;
	}

	private async listenForPrice(plate: string): Promise<number> {
		const event = await this.events.consume(plate);
		return event.content;
	}

	private async notifyPrice(plate: string, price: number) {
		await this.events.broadcast({
			id: plate,
			content: price
		});
	}

}