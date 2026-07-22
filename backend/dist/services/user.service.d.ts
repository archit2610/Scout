import { users, type User } from '../db/schema.js';
export declare const hashPassword: (password: string) => Promise<string>;
export declare const isPasswordCorrect: (plain: string, hashed: string) => Promise<boolean>;
export declare const generateAccessToken: (user: User) => string;
export declare const generateRefreshToken: (user: User) => string;
export declare const generateTemporaryToken: () => {
    unHashedToken: string;
    hashedToken: string;
    tokenExpiry: Date;
};
export declare const findUserByEmail: (email: string) => Promise<User | null>;
export declare const findUserById: (id: string) => Promise<User | null>;
export declare const createUser: (data: {
    email: string;
    username: string;
    password: string;
    fullName?: string;
}) => Promise<User>;
export declare const updateUser: (id: string, data: Partial<typeof users.$inferInsert>) => Promise<User>;
export declare const deleteuser: (id: string) => Promise<User>;
//# sourceMappingURL=user.service.d.ts.map