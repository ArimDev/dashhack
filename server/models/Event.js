import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const EventSchema = new mongoose.Schema({
	event: { type: String, unique: true, required: true },
	logo: { type: String, required: false },
	color: { type: String, required: false },
	settings: {
		password: { type: String, required: true },
		githubToken: { type: String, required: false }
	},
	teams: [
		{
			name: { type: String, required: true },
			color: { type: String, required: true },
			description: { type: String, required: false },
			github: { type: String, required: false }
		}
	]
}, { timestamps: true });

EventSchema.pre('save', async function (next) {
	if (this.isModified('password')) {
		this.settings.password = await bcrypt.hash(this.settings.password, 10);
	}
	next();
});

const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);

export default Event;