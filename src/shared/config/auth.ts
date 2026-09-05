import { isValidUserName } from '@/entities/user/constants';
import { db } from '@/shared/db';
import * as schema from '@/shared/db/schema';
import {
  clearLoginFailures,
  getLoginAttemptRecord,
  isLoginLocked,
  type LoginAttemptRecord,
  recordLoginFailure,
} from '@/shared/lib/login-rate-limit';
import { getClientIp } from '@/shared/utils/get-client-ip';
import { splitGraphemes } from '@/shared/utils/graphemes';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
// 照合を libuv スレッドプールで行う native 実装を使う。純 JS の bcryptjs はメインスレッドを
// 塞ぎ、一斉ログインが直列化して30人同時で数秒待ちになる。ハッシュ形式は bcryptjs と互換
import { compare, hash } from '@node-rs/bcrypt';
import { eq } from 'drizzle-orm';
import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Discord, { type DiscordProfile } from 'next-auth/providers/discord';
import { cache } from 'react';
import { z } from 'zod';

// ユーザー不存在時のダミー照合に使う固定ハッシュ。平文は 'timing-equalizer' で、照合成功する値ではない
const DUMMY_PASSWORD_HASH = '$2b$10$r0Wxh.puvVznam.0yam8y.iNKmj67M6lmfdefoMEouce9ND/5Rjti';

class RateLimitError extends CredentialsSignin {
  override code = 'RateLimitExceeded';
}

class InvalidGuestCodeError extends CredentialsSignin {
  override code = 'InvalidGuestCode';
}

class UsernameTakenError extends CredentialsSignin {
  override code = 'UsernameTaken';
}

// ユーザー不存在とパスワード不一致は同一コードで返す。
// 分けるとレスポンスからユーザー名の存在有無を列挙できてしまう
class InvalidCredentialsError extends CredentialsSignin {
  override code = 'InvalidCredentials';
}

class UserSetupIncompleteError extends CredentialsSignin {
  override code = 'UserSetupIncomplete';
}

class AccountDisabledError extends CredentialsSignin {
  override code = 'AccountDisabled';
}

class InvalidUsernameError extends CredentialsSignin {
  override code = 'InvalidUsername';
}

interface GuestSignUpInput {
  code: string;
  username: string;
  password: string;
  ip: string;
  attemptRecord: LoginAttemptRecord | null;
}

interface PasswordSignInInput {
  username: string;
  password: string;
  ip: string;
  attemptRecord: LoginAttemptRecord | null;
}

/**
 * ゲストコードで新規ユーザーを登録し、作成したユーザーを返す。
 * コード無効・名前不正・重複名はいずれも失敗を記録してから CredentialsSignin 系のエラーを投げる。
 * コード誤りだけは総当たりを疑う失敗として厳格に記録する。
 * 失敗回数の消去は登録が成立したときだけ行う。呼び出し側でロック判定を済ませてある前提。
 */
async function signUpGuest({
  code,
  username,
  password,
  ip,
  attemptRecord,
}: GuestSignUpInput): Promise<typeof schema.users.$inferSelect> {
  const guestCode = await db.query.guestCodes.findFirst({
    where: eq(schema.guestCodes.code, code),
  });

  if (!guestCode || guestCode.disabledAt) {
    console.warn(`Invalid guest code attempt: ${code}`);
    await recordLoginFailure(ip, attemptRecord, true);
    throw new InvalidGuestCodeError();
  }

  if (!isValidUserName(username)) {
    await recordLoginFailure(ip, attemptRecord);
    throw new InvalidUsernameError();
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.name, username),
  });

  if (existingUser) {
    console.warn(`Username taken during signup: ${username}`);
    await recordLoginFailure(ip, attemptRecord);
    throw new UsernameTakenError();
  }

  const hashedPassword = await hash(password, 10);
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
      await recordLoginFailure(ip, attemptRecord);
      throw new UsernameTakenError();
    }
    throw error;
  }

  if (attemptRecord) {
    await clearLoginFailures(ip);
  }
  return newUser;
}

/**
 * ユーザー名とパスワードで認証し、該当ユーザーを返す。
 * ユーザーが存在しない場合もダミーハッシュとの照合を行い、応答時間から存在有無が漏れないようにする。
 * 不存在・パスワード未設定・不一致は失敗を記録してから CredentialsSignin 系のエラーを投げる。
 * 失敗回数の消去は認証が成立したときだけ行う。呼び出し側でロック判定を済ませてある前提。
 */
async function signInWithPassword({
  username,
  password,
  ip,
  attemptRecord,
}: PasswordSignInInput): Promise<typeof schema.users.$inferSelect> {
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.name, username),
  });

  if (!existingUser) {
    console.warn(`Login failed: user not found ${username}`);
    // 応答時間の差からユーザー名の存在有無を判別されないよう、不存在でもダミー照合を行う
    await compare(password, DUMMY_PASSWORD_HASH);
    await recordLoginFailure(ip, attemptRecord);
    throw new InvalidCredentialsError();
  }

  if (!existingUser.password) {
    console.warn('User setup incomplete (no password)');
    await recordLoginFailure(ip, attemptRecord);
    throw new UserSetupIncompleteError();
  }

  const isPasswordValid = await compare(password, existingUser.password);
  if (!isPasswordValid) {
    console.warn('Invalid password attempt');
    await recordLoginFailure(ip, attemptRecord);
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

const {
  handlers,
  auth: authUncached,
  signIn,
  signOut,
} = NextAuth({
  // strategy jwt のため session / verificationToken テーブルは使われず、テーブルごと廃止済み
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
  }),
  session: {
    strategy: 'jwt',
    maxAge: 6 * 60 * 60,
  },
  trustHost: true,
  providers: [
    Discord({
      authorization: 'https://discord.com/api/oauth2/authorize?scope=identify',
      // Discord \u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u3092\u30A2\u30D7\u30EA\u306E\u30E6\u30FC\u30B6\u30FC\u3078\u5199\u3059\u3002\u30A2\u30D0\u30BF\u30FC\u672A\u8A2D\u5B9A\u306A\u3089 discriminator \u304B\u3089
      // \u65E2\u5B9A\u30A2\u30D0\u30BF\u30FC\u3092\u9078\u3073\u3001\u8A2D\u5B9A\u6E08\u307F\u306A\u3089\u30CF\u30C3\u30B7\u30E5\u304B\u3089 CDN \u306E URL \u3092\u7D44\u307F\u7ACB\u3066\u308B\u3002
      // \u8868\u793A\u540D\u306F\u82F1\u6570\u5B57\u3068\u304B\u306A\u30AB\u30CA\u6F22\u5B57\u3060\u3051\u306B\u7D5E\u308A\u3001\u8A18\u53F7\u3084\u7D75\u6587\u5B57\u3092\u843D\u3068\u3059
      profile(profile: DiscordProfile) {
        let imageUrl: string;
        if (profile.avatar === null) {
          const defaultAvatarNumber = parseInt(profile.discriminator) % 5;
          imageUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
        } else {
          const format = profile.avatar.startsWith('a_') ? 'gif' : 'png';
          imageUrl = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
        }
        return {
          id: profile.id,
          name: (profile.global_name ?? profile.username).replace(
            /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g,
            ''
          ),
          image: imageUrl,
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
              password: z.string().refine((val) => {
                const length = splitGraphemes(val).length;
                return length >= 3 && length <= 6;
              }),
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

          // await してから返す。await を外すと分岐先の失敗を下の catch が受けられない
          if (code) {
            return await signUpGuest({ code, username, password, ip, attemptRecord });
          }
          return await signInWithPassword({ username, password, ip, attemptRecord });
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
