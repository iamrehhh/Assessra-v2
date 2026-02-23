import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
    },
    nickname: {
        type: String,
        default: '',
    },
    level: {
        type: String, // 'IGCSE', 'AS Level', 'A Level'
        default: '',
    },
    image: {
        type: String, // Google Avatar URL or Base64 string from upload
        default: '',
    },
    isOnboarded: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
