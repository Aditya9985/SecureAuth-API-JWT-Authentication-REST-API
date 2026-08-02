import "dotenv/config";
import {neon} from "@neondatabase/serverless";
import {drizzle} from "drizzle-orm/http";
const sql = neon(process.env.DB_URL);
const db = drizzle(sql);
export  {db,sql};