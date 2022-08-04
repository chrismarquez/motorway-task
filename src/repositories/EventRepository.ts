
import * as AMQP from "amqplib";

export interface Event<T> {
	id: string
	content: T
}

export class EventRepository<T> {

	private static getExchange(id: string): string {
		return `API-Event-${id}`;
	}

	static async newInstance<T>(): Promise<EventRepository<T>> {
		const url = process.env.RABBIT_URL || "amqp://user:password@localhost";
		try {
			const connection = await AMQP.connect(url);
			return new EventRepository(connection);
		} catch (e) {
			throw new Error("Could not connect to RabbitMQ");
		}
	}

	private constructor(private connection: AMQP.Connection) {}

	async broadcast(event: Event<T>) {
		const exchange = EventRepository.getExchange(event.id);
		const channel = await this.connection.createChannel();
		await channel.assertExchange(exchange, "fanout");
		const payload = JSON.stringify(event);
		channel.publish(exchange, "", Buffer.from(payload));
	}

	async consume(id: string): Promise<Event<T>> {
		const exchange = EventRepository.getExchange(id);
		const channel = await this.connection.createChannel();
		await channel.assertExchange(exchange, "fanout");
		const queueData = await channel.assertQueue("", { exclusive: true });
		await channel.bindQueue(queueData.queue, exchange, "");
		const rawMessage: Buffer = await new Promise((res, rej) => {
			channel.consume(queueData.queue, msg => {
				const content = msg?.content;
				if (content === undefined) {
					rej("Receive error");
				} else {
					res(content);
				}
			});
		});
		const payload = rawMessage.toString();
		return JSON.parse(payload) as Event<T>;
	}

}