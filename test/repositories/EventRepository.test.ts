
import { Options, Replies } from "amqplib";
import { EventRepository } from "../../src/repositories/EventRepository";

import * as Bluebird from "bluebird";

import * as AMQP from "amqplib";
import AssertExchange = Replies.AssertExchange;
import AssertQueue = Options.AssertQueue;
import Empty = Replies.Empty;

jest.mock("amqplib");

describe("EventRepository", () => {

	afterEach(() => {
		jest.clearAllMocks();
	});

	test("Should broadcast to Fanout Exchange", async () => {

		const channelMock = { assertExchange: jest.fn(), publish: jest.fn() };
		const connectionMock = { createChannel: jest.fn().mockResolvedValueOnce(channelMock), close: jest.fn() };

		// @ts-ignore
		const connectMock = jest.spyOn(AMQP, "connect").mockResolvedValue(connectionMock);

		const assertExchangeMock = jest.spyOn(channelMock, "assertExchange")
			.mockImplementation((exchange, type, _) => {
				expect(exchange).toBe("API-Event-test");
				expect(type).toBe("fanout");
				return Promise.resolve({
					exchange: exchange
				}) as Bluebird<AssertExchange>;
			});

		const publishMock = jest.spyOn(channelMock, "publish")
			.mockImplementation((exchange, _routingKey, buffer) => {
				const obj = JSON.parse(buffer.toString());
				expect(exchange).toBe("API-Event-test");
				expect(obj).toEqual({id: "test", content: 0.1});
				return true;
			});

		const repo = await EventRepository.newInstance<number>();
		await repo.broadcast({
			id: "test", content: 0.1
		});

		expect(connectMock).toBeCalled();
		expect(assertExchangeMock).toBeCalled();
		expect(publishMock).toBeCalled();
	});

	test("Should return null on non-cached price", async () => {
		const channelMock = { assertExchange: jest.fn(), assertQueue: jest.fn(), bindQueue: jest.fn(), consume: jest.fn() };
		const connectionMock = { createChannel: jest.fn().mockResolvedValueOnce(channelMock), close: jest.fn() };

		const event = {id: "test", content: 0.1};
		const rawContent = Buffer.from(JSON.stringify(event));

		// @ts-ignore
		const connectMock = jest.spyOn(AMQP, "connect").mockResolvedValue(connectionMock);

		const assertExchangeMock = jest.spyOn(channelMock, "assertExchange")
			.mockImplementation((exchange, type, _) => {
				expect(exchange).toBe("API-Event-test");
				expect(type).toBe("fanout");
				return Promise.resolve({
					exchange: exchange
				}) as Bluebird<AssertExchange>;
			});

		const assertQueueMock = jest.spyOn(channelMock, "assertQueue")
			.mockImplementation((_queue, _) => {
				return Promise.resolve({
					queue: "test-queue",
					messageCount: 0,
					consumerCount: 0
				}) as Bluebird<AssertQueue>;
			});


		const bindQueue = jest.spyOn(channelMock, "bindQueue")
			.mockImplementation((queue, exchange, _) => {
				expect(exchange).toBe("API-Event-test");
				expect(queue).toBe("test-queue");
				return Promise.resolve({}) as Bluebird<Empty>;
			});

		const channelConsumeMock = jest.spyOn(channelMock, "consume")
			.mockImplementation((queue, onMessage) => {
				expect(queue).toBe("test-queue");
				onMessage({
					content: rawContent
				});
			});

		const repo = await EventRepository.newInstance<number>();
		const result = await repo.consume("test");

		expect(result).toEqual(event);

		expect(connectMock).toBeCalled();
		expect(assertExchangeMock).toBeCalled();
		expect(assertQueueMock).toBeCalled();
		expect(bindQueue).toBeCalled();
		expect(channelConsumeMock).toBeCalled();
	});
});