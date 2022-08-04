import { sleep } from "./Util";


export class VehiclePriceAPIRepository {

	async getExternalPrice(_: string): Promise<number> {
		await sleep(15_000);
		return Math.random();
	}

}

export default new VehiclePriceAPIRepository();