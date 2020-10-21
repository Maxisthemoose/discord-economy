import { Snowflake } from "discord.js";
import { Document } from "mongoose";

export default interface UserInterface extends Document {
    userId: Snowflake;
    guildId: Snowflake;

    level?: number;
    xp?: number;
    totalXp?: number;
}