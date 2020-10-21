import { Schema, model } from "mongoose";
import GuildInterface from "./interfaces/Guild.interface";

const Guild = new Schema({
    guildID: { type: String, required: true },

    baseXP: { type: Number, required: false, default: 500 },
    levelMulti: { type: Number, required: false, default: 1 },
    ignoredUsers: { type: Array, required: false, default: [] },
    ignoredChannels: { type: Array, required: false, default: [] },
    levelingChannel: { type: String, required: false, default: "" },
    XPMax: { type: Number, required: false, default: 45 },
    timeout: { type: Number, required: false, default: 60 * 1000 },
});

export default model<GuildInterface>("guilds", Guild);