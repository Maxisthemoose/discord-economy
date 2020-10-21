import { Collection, Snowflake } from "discord.js";
import { Document } from "mongoose";

export default interface Guild extends Document {
    /**
     * The guilds ID
     */
    guildID: Snowflake;

    /**
     * The base amount of XP it takes to level up (Default 500)
     */
    baseXP?: number;

    /**
     * The multiplier for the leveling (Default 1)
     */
    levelMulti?: number;

    /**
     * Ignored users for leveling up
     */
    ignoredUsers?: string[];

    /**
     * Ignored channels for leveling up
     */
    ignoredChannels?: string[];

    /**
     * Optional level up message channel
     */
    levelingChannel?: Snowflake;

    /**
     * The max amount of XP the user can get in one message (Default 45)
     */
    XPMax?: number;

    /**
     * The amount of time inbetween when a user can gain XP from chatting
     */
    timeout?: number;
}