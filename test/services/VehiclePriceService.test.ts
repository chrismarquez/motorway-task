import * as AMQP from "amqplib";
import { Event, EventRepository } from "../../src/repositories/EventRepository";
import { VehiclePriceService } from "../../src/services/VehiclePriceService";

import { VehiclePriceCacheRepository } from "../../src/repositories/VehiclePriceCacheRepository";
import { VehiclePriceAPIRepository } from "../../src/repositories/VehiclePriceAPIRepository";


jest.mock("../../src/repositories/VehiclePriceCacheRepository");
jest.mock("../../src/repositories/VehiclePriceAPIRepository");
jest.mock("memcached");

describe("VehiclePriceService", () => {

	const channelMock = {  };
	const connectionMock = { createChannel: jest.fn().mockResolvedValueOnce(channelMock), close: jest.fn() };
	// @ts-ignore
	jest.spyOn(AMQP, "connect").mockResolvedValue(connectionMock);
	
	afterEach(() => {
		jest.clearAllMocks();
	});

	test("Should return a cached value", async () => {
		const getCachedPriceMock = jest
			.spyOn(VehiclePriceCacheRepository.prototype, "getCachedPrice")
			.mockImplementation(async () => 0.1);

		const service = new VehiclePriceService(
			new VehiclePriceCacheRepository(),
			new VehiclePriceAPIRepository(),
			await EventRepository.newInstance<number>()
		);
		const price = await service.getPrice("test", false);
		expect(price).toBe(0.1);
		expect(getCachedPriceMock).toBeCalled();
	});

	test("Should request API directly when cache is disabled", async () => {
		const getCachedPriceMock = jest
			.spyOn(VehiclePriceCacheRepository.prototype, "getCachedPrice")
			.mockImplementation(async () => 0.1);

		const getExternalPriceMock = jest
			.spyOn(VehiclePriceAPIRepository.prototype, "getExternalPrice")
			.mockImplementation(async () => 0.1);

		const service = new VehiclePriceService(
			new VehiclePriceCacheRepository(),
			new VehiclePriceAPIRepository(),
			await EventRepository.newInstance<number>()
		);
		const price = await service.getPrice("test", true);
		expect(price).toBe(0.1);
		expect(getCachedPriceMock).not.toBeCalled();
		expect(getExternalPriceMock).toBeCalled();
	});

	test("Should request a non-cached value", async () => {
		const getCachedPriceMock = jest
			.spyOn(VehiclePriceCacheRepository.prototype, "getCachedPrice")
			.mockImplementation(async () => null);

		const requestSetPriceMock = jest
			.spyOn(VehiclePriceCacheRepository.prototype, "requestSetPrice")
			.mockImplementation(async () => {
				return {
					setCache: (_: number) => Promise.resolve()
				};
			});

		const getExternalPriceMock = jest
			.spyOn(VehiclePriceAPIRepository.prototype, "getExternalPrice")
			.mockImplementation(async () => 0.1);

		const broadcastMock = jest
			.spyOn(EventRepository.prototype, "broadcast")
			.mockImplementation(async (event: Event<number>) => {
				expect(event).toEqual({
					id: "test",
					content: 0.1
				});
			});

		const service = new VehiclePriceService(
			new VehiclePriceCacheRepository(),
			new VehiclePriceAPIRepository(),
			await EventRepository.newInstance<number>()
		);
		const price = await service.getPrice("test", false);
		expect(price).toBe(0.1);
		expect(getCachedPriceMock).toBeCalled();
		expect(requestSetPriceMock).toBeCalled();
		expect(getExternalPriceMock).toBeCalled();
		expect(broadcastMock).toBeCalled();
	});

	test("Must wait for API event when API call is underway", async () => {
		const getCachedPriceMock = jest
			.spyOn(VehiclePriceCacheRepository.prototype, "getCachedPrice")
			.mockImplementation(async () => null);

		const requestSetPriceMock = jest
			.spyOn(VehiclePriceCacheRepository.prototype, "requestSetPrice")
			.mockImplementation(async () => null);

		const getExternalPriceMock = jest
			.spyOn(VehiclePriceAPIRepository.prototype, "getExternalPrice");

		const consumeMock = jest
			.spyOn(EventRepository.prototype, "consume")
			.mockImplementation(async id => {
				expect(id).toEqual("test");
				return {
					id: id,
					content: 0.1
				};
			});

		const service = new VehiclePriceService(
			new VehiclePriceCacheRepository(),
			new VehiclePriceAPIRepository(),
			await EventRepository.newInstance<number>()
		);

		const price = await service.getPrice("test", false);
		expect(price).toBe(0.1);
		expect(getCachedPriceMock).toBeCalled();
		expect(requestSetPriceMock).toBeCalled();
		expect(consumeMock).toBeCalled();
		expect(getExternalPriceMock).not.toBeCalled();
	});

});