import mongoose from "mongoose";

const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };
let isConnected = false;

export async function connectDB() {
	if (isConnected) return;

	const config = useRuntimeConfig();

	await mongoose.connect(config.mongoUri, clientOptions);

	isConnected = true;
	//TODO: Bug, we dont handle error when connecting
	
	console.log("> ✅ MongoDB connected!");
}
