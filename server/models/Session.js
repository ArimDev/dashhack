import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
    sessionID: { type: String, unique: true, required: true },
    username: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 3 * 60 * 60 }
});

const Session = mongoose.models.Session || mongoose.model('Session', SessionSchema);

export default Session;