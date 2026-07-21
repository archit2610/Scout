import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt, { SignOptions } from 'jsonwebtoken'
import { db } from '../db/index.js'
import { users, type User } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import type { StringValue } from "ms";

const accessOptions: SignOptions = {
    expiresIn: (process.env.ACCESS_TOKEN_EXPIRY || "15m") as StringValue,
};

const refreshOptions: SignOptions = {
    expiresIn: (process.env.REFRESH_TOKEN_EXPIRY || "7d") as StringValue,
};

export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, 10)
}

export const isPasswordCorrect = async (
    plain: string,
    hashed: string
): Promise<boolean> => {
    return bcrypt.compare(plain, hashed)
}


export const generateAccessToken = (user: User): string => {
    return jwt.sign(
        { id: user.id, email: user.email, username: user.username },
        process.env.ACCESS_TOKEN_SECRET!,
        accessOptions
    )
}

export const generateRefreshToken = (user: User): string => {
    return jwt.sign(
        { id: user.id },
        process.env.REFRESH_TOKEN_SECRET!,
        refreshOptions
    )
}

export const generateTemporaryToken = (): {
    unHashedToken: string
    hashedToken: string
    tokenExpiry: Date
} => {
    const unHashedToken = crypto.randomBytes(20).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(unHashedToken).digest('hex')
    const tokenExpiry = new Date(Date.now() + 20 * 60 * 1000) // 20 minutes
    return { unHashedToken, hashedToken, tokenExpiry }
}


export const findUserByEmail = async (email: string): Promise<User | null> => {
    const [user] = await db.select().from(users).where(eq(users.email, email))
    console.log(user);
    return user ?? null
}

export const findUserById = async (id: string): Promise<User | null> => {
    const [user] = await db.select().from(users).where(eq(users.id, id))
    return user ?? null
}

export const createUser = async (data: {
    email: string
    username: string
    password: string
    fullName?: string
}): Promise<User> => {
    const hashed = await hashPassword(data.password)
    const [user] = await db.insert(users).values({
        ...data,
        password: hashed,
    }).returning()

    if (!user) {
        throw new Error('Failed to create user')
    }

    return user
}

export const updateUser = async (
    id: string,
    data: Partial<typeof users.$inferInsert>
): Promise<User> => {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning()

    if (!user) {
        throw new Error('User not found')
    }

    return user
}

export const deleteuser = async (id: string): Promise<User> => {
    const [user] = await db.delete(users).where(eq(users.id, id)).returning()
    if (!user) {
        throw new Error('User not found')
    }
    return user
}
