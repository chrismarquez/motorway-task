import * as AMQP from "amqplib";
import * as request from "supertest";
import Application from "../src/Application";

jest.mock("amqplib");

describe("App Default Handlers", () => {

	const channelMock = {  };
	const connectionMock = { createChannel: jest.fn().mockResolvedValueOnce(channelMock), close: jest.fn() };
	// @ts-ignore
	jest.spyOn(AMQP, "connect").mockResolvedValue(connectionMock);


	afterEach(() => {
		jest.clearAllMocks();
	});

	test("Should Respond with Not Found on Unavailable Endpoints", async () => {

		const application = await Application.newInstance();

		const path = "/does/not/exist";

		const expectedResponse = {
			name: "Error",
			message: "Resource Not Found: /does/not/exist"
		};

		const res = await request(application.app).get(path);

		expect(res.statusCode).toBe(404);
		expect(res.body).toEqual(expectedResponse);
	});

});