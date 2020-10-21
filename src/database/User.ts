import { Schema, model } from "mongoose";
import UserInterface from "./interfaces/User.interface";

const User = new Schema({
    userId: { type: String, required: true, },
    guildId: { type: String, required: true, },

    level: { type: Number, required: false, default: 1 },
    xp: { type: Number, required: false, default: 0 },
    totalXp: { type: Number, required: false, default: 0 },
});

export default model<UserInterface>("users", User);