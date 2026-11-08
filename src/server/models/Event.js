import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const StickyNoteSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    content: { type: String, default: '' },
    color: { type: String, default: '#ffeb3b' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, default: 'To Do' }
});

const WallPostSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['x', 'instagram', 'manual'], default: 'manual' },
    authorName: { type: String, default: '' },
    handle: { type: String, default: '' },
    text: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
    approved: { type: Boolean, default: true },
    hidden: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    status: { type: String, enum: ['approved', 'pending', 'rejected'], default: 'approved' },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

const WallSettingsSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: true },
    publicUploadEnabled: { type: Boolean, default: true },
    moderationMode: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    windowMinutes: { type: Number, default: 1440 },
    idleCycleSeconds: { type: Number, default: 25 },
    idleWaitSeconds: { type: Number, default: 30 },
    queryHashtags: [{ type: String }],
    xEnabled: { type: Boolean, default: false },
    xPollIntervalMinutes: { type: Number, default: 5 },
    xQueryHashtags: [{ type: String }],
    xQueryHandles: [{ type: String }],
    xLastPollAt: { type: Date, default: null },
    blacklistedKeywords: [{ type: String }],
    whitelistedKeywords: [{ type: String }],
    blacklistedAuthors: [{ type: String }],
    whitelistedAuthors: [{ type: String }],
}, { _id: false });

const EventSchema = new mongoose.Schema({
    event: { type: String, unique: true, required: true, },
    logo: { type: String, required: false, },
    color: { type: String, required: false, },
    settings: {
        password: { type: String, required: true, },
        githubToken: { type: String, required: false, },
    },
    teams: [
        {
            name: { type: String, required: true, },
            color: { type: String, required: true, },
            description: { type: String, required: false, },
            github: { type: String, required: false, },
            stickyNotes: [StickyNoteSchema],
        },
    ],
    wall: {
        type: WallSettingsSchema,
        default: {
            enabled: true,
            publicUploadEnabled: true,
            moderationMode: 'auto',
            windowMinutes: 1440,
            idleCycleSeconds: 25,
            idleWaitSeconds: 30,
            queryHashtags: [],
            xEnabled: false,
            xPollIntervalMinutes: 5,
            xQueryHashtags: [],
            xQueryHandles: [],
            xLastPollAt: null,
            blacklistedKeywords: [],
            whitelistedKeywords: [],
            blacklistedAuthors: [],
            whitelistedAuthors: [],
        }
    },
    posts: [WallPostSchema],
}, { timestamps: true });

EventSchema.pre('save', async function (next) {
    if (this.isModified('settings.password')) {
        this.settings.password = await bcrypt.hash(this.settings.password, 10);
    }
    next();
});

const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);

export default Event;