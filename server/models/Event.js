import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const EventSchema = new mongoose.Schema({
	event: { type: String, unique: true, required: true },
	password: { type: String, required: true }
});

EventSchema.pre('save', async function (next) {
	if (this.isModified('password')) {
		this.password = await bcrypt.hash(this.password, 10);
	}
	next();
});

const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);

export default Event;