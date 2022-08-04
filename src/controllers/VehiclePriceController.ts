
import * as Express from "express";
import { VehiclePriceService } from "../services/VehiclePriceService";
import IController from "./IController";

export class VehiclePriceController implements IController {

	readonly router = Express.Router();

	constructor(private service: VehiclePriceService) {
		this.router.get("/:plate", this.getPrice.bind(this));
	}

	private async getPrice(req: Express.Request, res: Express.Response) {
		const plate = req.params.plate;
		const price = await this.service.getPrice(plate, false);
		const payload = {
			price
		};
		res.json(payload);
	}

}