import dotenv from "dotenv";

dotenv.config();

import { PrismaClient } from "@prisma/client";

// Shared client — import this instead of `new PrismaClient()` elsewhere.
// Connection comes from DATABASE_URL (see .env / docker-compose.yml).
// NOTE: if the password contains @ : / % ? or #, percent-encode it
// in the URL (e.g. p@ss -> p%40ss).
export const prisma = new PrismaClient();
