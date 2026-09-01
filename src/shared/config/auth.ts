import { isValidUserName } from '@/entities/user';
import { db } from '@/shared/db';
import * as schema from '@/shared/db/schema';
import {
  clearLoginFailures,
  getLoginAttemptRecord,
  isLoginLocked,
  recordLoginFailure,
} from '@/shared/lib/login-rate-limit';
import { getClientIp } from '@/shared/utils/get-client-ip';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Discord from 'next-auth/providers/discord';
import { cache } from 'react';
import { z } from 'zod';

// ユーザー不存在時のダミー照合に使う固定ハッシュ。平文は 'timing-equalizer' で、照合成功する値ではない
const DUMMY_PASSWORD_HASH = '$2b$10$r0Wxh.puvVznam.0yam8y.iNKmj67M6lmfdefoMEouce9ND/5Rjti';

class RateLimitError extends CredentialsSignin {
  code = 'RateLimitExceeded';
}

class InvalidGuestCodeError extends CredentialsSignin {
  code = 'InvalidGuestCode';
}

class UsernameTakenError extends CredentialsSignin {
  code = 'UsernameTaken';
}

// ユーザー不存在とパスワード不一致は同一コードで返す。
// 分けるとレスポンスからユーザー名の存在有無を列挙できてしまう
class InvalidCredentialsError extends CredentialsSignin {
  code = 'InvalidCredentials';
}

class UserSetupIncompleteError extends CredentialsSignin {
  code = 'UserSetupIncomplete';
}

class AccountDisabledError extends CredentialsSignin {
  code = 'AccountDisabled';
}

class InvalidUsernameError extends CredentialsSignin {
  code = 'InvalidUsername';
}

const {
  handlers,
  auth: authUncached,
  signIn,
  signOut,
} = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  session: {
    strategy: 'jwt',
    maxAge: 6 * 60 * 60,
  },
  trustHost: true,
  providers: [
    Discord({
      authorization: 'https://discord.com/api/oauth2/authorize?scope=identify',
      profile(profile) {
        if (profile.avatar === null) {
          const defaultAvatarNumber = parseInt(profile.discriminator) % 5;
          profile.image_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
        } else {
          const format = profile.avatar.startsWith('a_') ? 'gif' : 'png';
          profile.image_url = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
        }
        return {
          id: profile.id,
          name: (profile.global_name ?? profile.username).replace(
            /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g,
            ''
          ),
          image: profile.image_url,
          role: 'USER',
          isOnboardingCompleted: false,
        };
      },
    }),
    Credentials({
      credentials: {
        code: { label: 'Code', type: 'text' },
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        try {
          const parsed = z
            .object({
              code: z.string().trim().optional(),
              username: z.string().min(1),
              password: z.string().refine((val) => [...val].length >= 3 && [...val].length <= 6),
            })
            .safeParse(credentials);

          if (!parsed.success) return null;
          const { code, username, password } = parsed.data;

          const ip = await getClientIp();
          const attemptRecord = await getLoginAttemptRecord(ip);

          if (isLoginLocked(attemptRecord)) {
            console.warn(`IP Limit Exceeded: ${ip}`);
            throw new RateLimitError();
          }

          const recordFailure = (isStrict = false) => recordLoginFailure(ip, attemptRecord, isStrict);

          if (code) {
            const guestCode = await db.query.guestCodes.findFirst({
              where: eq(schema.guestCodes.code, code),
            });

            if (!guestCode || guestCode.disabledAt) {
              console.warn(`Invalid guest code attempt: ${code}`);
              await recordFailure(true);
              throw new InvalidGuestCodeError();
            }

            if (!isValidUserName(username)) {
              await recordFailure();
              throw new InvalidUsernameError();
            }

            const existingUser = await db.query.users.findFirst({
              where: eq(schema.users.name, username),
            });

            if (existingUser) {
              console.warn(`Username taken during signup: ${username}`);
              await recordFailure();
              throw new UsernameTakenError();
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            let newUser: typeof schema.users.$inferSelect;
            try {
              [newUser] = await db
                .insert(schema.users)
                .values({
                  name: username,
                  role: 'GUEST',
                  guestCodeId: code,
                  password: hashedPassword,
                  isOnboardingCompleted: true,
                })
                .returning();
            } catch (error) {
              // 同時登録の競合は user_name_idx の一意制約で片方が落ちる
              if (error instanceof Error && 'code' in error && error.code === '23505') {
                await recordFailure();
                throw new UsernameTakenError();
              }
              throw error;
            }

            if (attemptRecord) {
              await clearLoginFailures(ip);
            }
            return newUser;
          } else {
            const existingUser = await db.query.users.findFirst({
              where: eq(schema.users.name, username),
            });

            if (!existingUser) {
              console.warn(`Login failed: user not found ${username}`);
              // 応答時間の差からユーザー名の存在有無を判別されないよう、不存在でもダミー照合を行う
              await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
              await recordFailure();
              throw new InvalidCredentialsError();
            }

            if (!existingUser.password) {
              console.warn('User setup incomplete (no password)');
              await recordFailure();
              throw new UserSetupIncompleteError();
            }

            const isPasswordValid = await bcrypt.compare(password, existingUser.password);
            if (!isPasswordValid) {
              console.warn('Invalid password attempt');
              await recordFailure();
              throw new InvalidCredentialsError();
            }

            if (existingUser.disabledAt) {
              console.warn('Disabled account attempt');
              throw new AccountDisabledError();
            }

            if (attemptRecord) {
              await clearLoginFailures(ip);
            }
            return existingUser;
          }
        } catch (error) {
          if (error instanceof CredentialsSignin) {
            throw error;
          }
          console.error('Authorize error details:', error);
          throw new Error('InternalServerError');
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.isOnboardingCompleted = user.isOnboardingCompleted;
      }
      return token;
    },
    // 毎回 users を照会して失効・権限変更を即時反映する。頻度は下の cache ラップで抑える
    async session({ session, token }) {
      if (token.sub) {
        try {
          const freshUser = await db.query.users.findFirst({
            where: eq(schema.users.id, token.sub),
            columns: {
              id: true,
              role: true,
              disabledAt: true,
              isOnboardingCompleted: true,
              name: true,
              image: true,
            },
          });

          if (!freshUser || freshUser.disabledAt) {
            return { ...session, user: null };
          }

          session.user.role = freshUser.role;
          session.user.id = freshUser.id;
          session.user.isOnboardingCompleted = freshUser.isOnboardingCompleted;
          session.user.name = freshUser.name;
          session.user.image = freshUser.image;
        } catch (e) {
          console.error('Session refresh failed', e);
        }
      }
      return session;
    },
  },
});

// session コールバックが users を照会するため、同一リクエスト内の auth() を1回に束ねる。
// requireLoginPage と各 Server Action が個別に呼んでも DB 照会は1度で済む
const auth = cache(authUncached);

export { auth, handlers, signIn, signOut };
