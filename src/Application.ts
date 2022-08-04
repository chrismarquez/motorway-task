import { Request, Response, NextFunction } from "express";
import * as Express from "express";
import IController from "./controllers/IController";
import { NotFoundException, HttpException } from "./exceptions/HttpExceptions";

import { VehiclePriceController } from "./controllers/VehiclePriceController";
import { EventRepository } from "./repositories/EventRepository";
import { VehiclePriceService } from "./services/VehiclePriceService";
import APIRepo from "./repositories/VehiclePriceAPIRepository";
import CacheRepo from "./repositories/VehiclePriceCacheRepository";


interface Controllers {
	[route: string]: IController;
}

export default class Application {

	readonly app = Express();

	private static async initControllers(): Promise<Controllers> {
		const eventRepo = await EventRepository.newInstance<number>();
		const vehiclePriceService = new VehiclePriceService(CacheRepo, APIRepo, eventRepo);
		const vehiclePriceController = new VehiclePriceController(vehiclePriceService);
		return {
			"/vehicle": vehiclePriceController
		};
	}

	static async newInstance(): Promise<Application> {
		const controllers = await Application.initControllers();
		return new Application(controllers);
	}

	constructor(controllers: Controllers) {
		this.app.use(Express.json());

		for (const [route, controller] of Object.entries(controllers)) {
			this.app.use(route, controller.router);
		}

		this.app.use((req, res, next) => {
			const resource = req.path;
			const error = new NotFoundException(resource);
			next(error);
		});
		this.app.use((err: HttpException, req: Request, res: Response, _: NextFunction) => {
			const statusCode = err.statusCode || 500;
			const name = err.name || "Error";
			const payload = {
				name, message: err.message
			};
			res.status(statusCode);
			res.json(payload);
		});
	}

}