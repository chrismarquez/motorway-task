
import { VehiclePriceCacheRepository } from "../../src/repositories/VehiclePriceCacheRepository";
import * as Memcached from "memcached";


jest.mock("memcached");

describe("VehiclePriceCacheRepository", () => {

	afterEach(() => {
		jest.clearAllMocks();
	});

	test("Should return a cached price", async () => {
		const getMock = jest
			.spyOn(Memcached.prototype, "get")
			.mockImplementation((key, cb) => {
				// @ts-ignore
				cb(null, 0.1);
			});

		const repo = new VehiclePriceCacheRepository();
		const cache = await repo.getCachedPrice("test");
		expect(cache).toBe(0.1);
		expect(getMock).toBeCalled();
	});

	test("Should return null on non-cached price", async () => {
		const getMock = jest
			.spyOn(Memcached.prototype, "get")
			.mockImplementation((key, cb) => {
				// @ts-ignore
				cb(undefined, undefined);
			});

		const repo = new VehiclePriceCacheRepository();
		const cache = await repo.getCachedPrice("test");
		expect(cache).toBe(null);
		expect(getMock).toBeCalled();
	});

	test("Should return request object when no request is underway", async () => {
		const getMock = jest
			.spyOn(Memcached.prototype, "get")
			.mockImplementation((key, cb) => {
				// @ts-ignore
				cb(undefined, undefined);
			});

		const setMock = jest
			.spyOn(Memcached.prototype, "set")
			.mockImplementation((key, value, lifetime, cb) => {
				// @ts-ignore
				cb(undefined, true);
			});

		const repo = new VehiclePriceCacheRepository();
		const request = await repo.requestSetPrice("test");
		expect(request).not.toBeNull();
		expect(getMock).toBeCalled();
		expect(setMock).toBeCalled();
	});

	test("Should return null when a request is underway", async () => {
		const getMock = jest
			.spyOn(Memcached.prototype, "get")
			.mockImplementation((key, cb) => {
				// @ts-ignore
				cb(undefined, true);
			});

		const setMock = jest
			.spyOn(Memcached.prototype, "set")
			.mockImplementation((key, value, lifetime, cb) => {
				// @ts-ignore
				cb(undefined, true);
			});

		const repo = new VehiclePriceCacheRepository();
		const request = await repo.requestSetPrice("test");
		expect(request).toBeNull();
		expect(getMock).toBeCalled();
		expect(setMock).not.toBeCalled();
	});

	test("Should clean request data when new value is set", async () => {

		const setCacheValue = 1.0;

		const getMock = jest
			.spyOn(Memcached.prototype, "get")
			.mockImplementation((key, cb) => {
				// @ts-ignore
				cb(undefined, undefined);
			});

		const setMock = jest
			.spyOn(Memcached.prototype, "set")
			.mockImplementationOnce((key, value, lifetime, cb) => {
				expect(key).toBe("api-test");
				expect(value).toBe(true);
				// @ts-ignore
				cb(undefined, true);
			})
			.mockImplementationOnce((key, value, lifetime, cb) => {
				expect(key).toBe("test");
				expect(value).toBe(setCacheValue);
				// @ts-ignore
				cb(undefined, true);
			});

		const delMock = jest
			.spyOn(Memcached.prototype, "del")
			.mockImplementation((key, cb) => {
				expect(key).toBe("api-test");
				// @ts-ignore
				cb(undefined, true);
			});

		const repo = new VehiclePriceCacheRepository();
		const request = await repo.requestSetPrice("test");
		expect(request).not.toBeNull();

		await request?.setCache(setCacheValue);

		expect(getMock).toBeCalled();
		expect(setMock).toBeCalled();
		expect(delMock).toBeCalled();
	});

});