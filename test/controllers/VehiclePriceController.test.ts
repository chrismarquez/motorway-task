
import * as AMQP from "amqplib";
import { VehiclePriceService } from "../../src/services/VehiclePriceService";
import Application from "../../src/Application";
import * as request from "supertest";

jest.mock("amqplib");
jest.mock("memcached");

describe("VehiclePriceRouter", () => {

	const channelMock = {  };
	const connectionMock = { createChannel: jest.fn().mockResolvedValueOnce(channelMock), close: jest.fn() };
	// @ts-ignore
	jest.spyOn(AMQP, "connect").mockResolvedValue(connectionMock);

	afterEach(() => {
		jest.clearAllMocks();
	});

	test("Should GET a price response", async () => {
		const getPriceMock = jest
			.spyOn(VehiclePriceService.prototype, "getPrice")
			.mockImplementation(async () => 0.1);

		const path = "/vehicle/test";

		const expectedResponse = {
			price: 0.1
		};
		const application = await Application.newInstance();
		const res = await request(application.app).get(path);

		expect(res.statusCode).toBe(200);
		expect(res.body).toEqual(expectedResponse);

		expect(getPriceMock).toBeCalled();
	});

});