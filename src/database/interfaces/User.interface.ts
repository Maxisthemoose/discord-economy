import { Snowflake } from "discord.js";
import { Document } from "mongoose";

export default interface UserInterface extends Document {
    userId: Snowflake;
    guildId: Snowflake;

    /**
     * The current level of the user
     */
    level?: number;
    
    /**
     * The current XP of the given level
     */
    xp?: number;

    /**
     * The total amount of XP gained by that user
     */
    totalXp?: number;
}