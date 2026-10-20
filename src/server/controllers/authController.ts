import { Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User as UserModel } from '../models/User';
import { AuditLog as AuditLogModel } from '../models/AuditLog';
import { isDbConnected } from '../config/db';
import { memoryStore } from '../config/memoryStore';
import { JWT_SECRET } from '../config/jwt';
import { getConfiguredAppUrl, isConfiguredOAuthValue } from '../config/oauthConfig';
import { ADMIN_PASSWORD } from '../config/adminCredentials';
import { User as UserType } from '../../types';

const getAppUrl = (req: Request): string => {
  const configuredUrl = getConfiguredAppUrl();
  if (configuredUrl && (process.env.NODE_ENV !== 'production' || configuredUrl.startsWith('https://'))) {
    return configuredUrl;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Set APP_URL to a valid public HTTPS application URL before using authentication callbacks.');
  }
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  return `${protocol}://${host}`;
};

const getAuthStorageMode = (res: Response): 'database' | 'memory' | null => {
  if (isDbConnected()) return 'database';
  if (process.env.NODE_ENV !== 'production') return 'memory';

  res.status(503).json({
    success: false,
    code: 'AUTH_STORAGE_UNAVAILABLE',
    message: 'Authentication storage is temporarily unavailable. Please try again later.',
  });
  return null;
};

type OAuthProvider = 'google' | 'facebook';

const oauthStateCookieName = (provider: OAuthProvider): string =>
  `marketly_oauth_${provider}_state`;

const readCookie = (req: Request, name: string): string | undefined => {
  const cookie = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return cookie ? cookie.slice(name.length + 1) : undefined;
};

const matchesOAuthState = (req: Request, provider: OAuthProvider, state: unknown): state is string => {
  const expected = readCookie(req, oauthStateCookieName(provider));
  if (typeof state !== 'string' || !expected) return false;
  const suppliedBytes = Buffer.from(state);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
};

const setOAuthStateCookie = (req: Request, res: Response, provider: OAuthProvider): string => {
  const state = randomBytes(32).toString('hex');
  res.cookie(oauthStateCookieName(provider), state, {
    httpOnly: true,
    secure: getAppUrl(req).startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60 * 1000,
  });
  return state;
};

const consumeOAuthState = (
  req: Request,
  res: Response,
  provider: OAuthProvider,
  state: unknown
): boolean => {
  const isValid = matchesOAuthState(req, provider, state);
  res.clearCookie(oauthStateCookieName(provider), { path: '/' });
  return isValid;
};

const safeInlineJson = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, '\\u003c');

const sendOAuthCallback = (req: Request, res: Response, provider: OAuthProvider): void => {
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const providerError = typeof req.query.error === 'string' ? req.query.error : '';
  const validState = matchesOAuthState(req, provider, state);
  const callbackError = providerError || (!code ? 'Authorization code was not returned.' : '');
  const message = validState
    ? callbackError
      ? { type: 'OAUTH_AUTH_ERROR', provider, error: callbackError }
      : { type: 'OAUTH_AUTH_CODE', provider, code, state }
    : { type: 'OAUTH_AUTH_ERROR', provider, error: 'OAuth state validation failed.' };

  res.status(validState ? 200 : 400).send(`<!DOCTYPE html>
<html>
<head><title>Marketly Authentication</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 40px; background: #F8FAFC;">
  <h3>${validState ? 'Completing authentication...' : 'Authentication could not be verified.'}</h3>
  <p>${validState ? 'Please wait while your credentials are authenticated.' : 'Close this window and try again.'}</p>
  <script>
    if (window.opener) {
      window.opener.postMessage(${safeInlineJson(message)}, window.location.origin);
      setTimeout(() => window.close(), 600);
    } else {
      window.location.replace('/account');
    }
  </script>
</body>
</html>`);
};

const EMAIL_DELIVERY_DISABLED_MESSAGE =
  'Email delivery has been disabled in this Marketly deployment. Please contact support or your administrator for account access help.';

// 1. Email/Password Registration
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, message: 'Full name is required.' });
      return;
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ success: false, message: 'A valid email address is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if registration is enabled in settings
    if (!memoryStore.authSettings.emailRegistrationEnabled) {
      res.status(403).json({
        success: false,
        message: 'Public email registration is currently disabled by administrator.',
      });
      return;
    }

    const storageMode = getAuthStorageMode(res);
    if (!storageMode) return;

    if (storageMode === 'database') {
      const existing = await UserModel.findOne({ email: normalizedEmail });
      if (existing) {
        res.status(409).json({
          success: false,
          message: 'An account with this email address already exists. Please sign in.',
        });
        return;
      }

      // Explicitly enforce role='customer' (never grant admin via public registration)
      const user = await UserModel.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: 'customer',
        authProvider: 'local',
        isEmailVerified: true,
        addresses: [],
      });

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      await AuditLogModel.create({
        actor: user.name,
        action: 'Account Registered',
        resource: 'Auth',
        details: `Customer registered: ${user.email}. Email verification is disabled; account is active immediately.`,
      });

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          isEmailVerified: true,
          addresses: user.addresses,
        },
        message: 'Account registered successfully. Email delivery is disabled, so no verification email is sent.',
      });
      return;
    }

    const existingMem = memoryStore.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (existingMem) {
      res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.',
      });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser: UserType = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: normalizedEmail,
      role: 'customer',
      authProvider: 'local',
      passwordHash,
      isEmailVerified: true,
      addresses: [],
    };

    memoryStore.users.push(newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    memoryStore.logAudit(
      newUser.name,
      'Account Registered',
      'Auth',
      `Customer registered: ${newUser.email}. Email verification is disabled; account is active immediately.`
    );

    const { passwordHash: _, ...safeUser } = newUser;

    res.status(201).json({
      success: true,
      token,
      user: safeUser,
      message: 'Account registered successfully. Email delivery is disabled, so no verification email is sent.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Email/Password Login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const adminEnvEmail = (process.env.ADMIN_EMAIL || 'admin@marketly.com').toLowerCase().trim();
    const adminEnvPassword = ADMIN_PASSWORD;

    if (isDbConnected()) {
      let user = await UserModel.findOne({ email: normalizedEmail }).select('+password');
      if (!user && normalizedEmail === adminEnvEmail && adminEnvPassword) {
        user = await UserModel.create({
          name: 'Administrator',
          email: adminEnvEmail,
          password: adminEnvPassword,
          role: 'super_admin',
          authProvider: 'local',
          isEmailVerified: true,
          addresses: [],
        });
      }

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      await AuditLogModel.create({
        actor: user.name,
        action: 'User Sign In',
        resource: 'Auth',
        details: `Signed in with role: ${user.role}`,
      });

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          addresses: user.addresses,
        },
      });
      return;
    }

    // In-Memory Mode
    let user = memoryStore.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    // If matches configured admin email from environment, auto-provision if missing
    if (!user && normalizedEmail === adminEnvEmail && adminEnvPassword) {
      user = {
        id: 'usr_admin_1',
        name: 'Mahim Haque (Super Admin)',
        email: adminEnvEmail,
        role: 'super_admin',
        authProvider: 'local',
        passwordHash: bcrypt.hashSync(adminEnvPassword, 10),
        isEmailVerified: true,
        addresses: [],
      };
      memoryStore.users.push(user);
    }

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const isHashMatch = user.passwordHash ? bcrypt.compareSync(password, user.passwordHash) : false;

    if (!isHashMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    memoryStore.logAudit(
      user.name,
      'User Sign In',
      'Auth',
      `Signed in with role: ${user.role}`
    );

    const { passwordHash: _, ...safeUser } = user;

    res.json({
      success: true,
      token,
      user: safeUser,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Email Verification Handler
export const verifyEmail = async (_req: Request, res: Response): Promise<void> => {
  res.status(410).json({
    success: false,
    code: 'EMAIL_VERIFICATION_DISABLED',
    message: 'Email verification has been disabled because outbound email delivery is no longer available.',
  });
};

// 4. Resend Verification Email (Route retained as a compatibility stub)
export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ success: false, message: 'Valid email address is required.' });
    return;
  }

  res.status(410).json({
    success: false,
    code: 'EMAIL_VERIFICATION_DISABLED',
    message: `Email verification is disabled for ${String(email).trim()}. Outbound email delivery has been removed from the application.`,
  });
};

// 5. Forgot Password Request
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ success: false, message: 'Email is required.' });
    return;
  }

  res.status(410).json({
    success: false,
    code: 'PASSWORD_RESET_DISABLED',
    message: `Password reset email delivery is disabled for ${String(email).trim()}. Please contact support or your administrator to reset access.`,
  });
};

// 6. Reset Password Handler
export const resetPassword = async (_req: Request, res: Response): Promise<void> => {
  res.status(410).json({
    success: false,
    code: 'PASSWORD_RESET_DISABLED',
    message: 'Password reset email delivery is disabled. Contact support or your administrator to reset access.',
  });
};

// 7. Get Current Authenticated Profile
export const getMe = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    if (isDbConnected()) {
      const user = await UserModel.findById(req.user.id).select('-password');
      if (user) {
        res.json({ success: true, user });
        return;
      }
    }

    const user = memoryStore.users.find(
      (u) => u.id === req.user.id || u.email === req.user.email
    );
    if (user) {
      const { passwordHash: _, ...safeUser } = user;
      res.json({ success: true, user: safeUser });
      return;
    }

    res.json({ success: true, user: req.user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Public Auth Settings
export const getPublicAuthSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = {
      emailRegistrationEnabled: memoryStore.authSettings.emailRegistrationEnabled,
      googleAuthEnabled:
        memoryStore.authSettings.googleAuthEnabled &&
        isConfiguredOAuthValue(memoryStore.authSettings.googleClientId || process.env.GOOGLE_CLIENT_ID) &&
        isConfiguredOAuthValue(process.env.GOOGLE_CLIENT_SECRET),
      googleClientId: memoryStore.authSettings.googleClientId || process.env.GOOGLE_CLIENT_ID || '',
      facebookAuthEnabled:
        memoryStore.authSettings.facebookAuthEnabled &&
        isConfiguredOAuthValue(memoryStore.authSettings.facebookAppId || process.env.FACEBOOK_APP_ID) &&
        isConfiguredOAuthValue(process.env.FACEBOOK_APP_SECRET),
      facebookAppId: memoryStore.authSettings.facebookAppId || process.env.FACEBOOK_APP_ID || '',
    };
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 9. Admin Auth Settings
export const getAdminAuthSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: memoryStore.authSettings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAdminAuthSettings = async (req: any, res: Response): Promise<void> => {
  try {
    const { emailRegistrationEnabled, googleAuthEnabled, googleClientId, facebookAuthEnabled, facebookAppId } = req.body;

    memoryStore.authSettings = {
      ...memoryStore.authSettings,
      ...(emailRegistrationEnabled !== undefined && { emailRegistrationEnabled: Boolean(emailRegistrationEnabled) }),
      ...(googleAuthEnabled !== undefined && { googleAuthEnabled: Boolean(googleAuthEnabled) }),
      ...(googleClientId !== undefined && { googleClientId: String(googleClientId).trim() }),
      ...(facebookAuthEnabled !== undefined && { facebookAuthEnabled: Boolean(facebookAuthEnabled) }),
      ...(facebookAppId !== undefined && { facebookAppId: String(facebookAppId).trim() }),
    };

    memoryStore.logAudit(
      req.user?.name || 'Super Admin',
      'Auth Settings Updated',
      'Settings',
      'Modified third-party OAuth and registration parameters'
    );

    res.json({ success: true, data: memoryStore.authSettings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 10. Google OAuth Flow Endpoints
export const getGoogleAuthUrl = (req: Request, res: Response): void => {
  const clientId = memoryStore.authSettings.googleClientId || process.env.GOOGLE_CLIENT_ID;

  if (!memoryStore.authSettings.googleAuthEnabled ||
      !isConfiguredOAuthValue(clientId) ||
      !isConfiguredOAuthValue(process.env.GOOGLE_CLIENT_SECRET)) {
    res.status(400).json({
      success: false,
      message: 'Google OAuth requires a valid client ID and server-side client secret configuration.',
      code: 'GOOGLE_OAUTH_UNCONFIGURED',
    });
    return;
  }

  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/auth/callback/google`;
  const state = setOAuthStateCookie(req, res, 'google');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ success: true, url: authUrl, redirectUri });
};

export const handleGoogleCallback = (req: Request, res: Response): void => {
  sendOAuthCallback(req, res, 'google');
};

export const verifyGoogleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, credential, state } = req.body;
    const clientId = memoryStore.authSettings.googleClientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (code && !consumeOAuthState(req, res, 'google', state)) {
      res.status(400).json({ success: false, message: 'Google OAuth state validation failed.' });
      return;
    }
    if (!memoryStore.authSettings.googleAuthEnabled) {
      res.status(403).json({ success: false, message: 'Google sign-in is currently disabled.' });
      return;
    }

    let email = '';
    let name = '';
    let googleId = '';
    let avatar = '';

    // 1. Authorization Code Exchange
    if (code && isConfiguredOAuthValue(clientId) && isConfiguredOAuthValue(clientSecret)) {
      const appUrl = getAppUrl(req);
      const redirectUri = `${appUrl}/auth/callback/google`;

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        res.status(400).json({
          success: false,
          message: tokenData.error_description || 'Failed to exchange authorization code with Google.',
        });
        return;
      }

      // Fetch user profile from Google UserInfo endpoint
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!profileRes.ok) {
        res.status(400).json({ success: false, message: 'Google did not return a valid user profile.' });
        return;
      }
      const profile: {
        email?: string;
        email_verified?: boolean;
        name?: string;
        sub?: string;
        picture?: string;
      } = await profileRes.json();

      if (profile.email_verified !== true || !profile.email || !profile.sub) {
        res.status(400).json({ success: false, message: 'Google account did not return a verified identity.' });
        return;
      }

      email = profile.email || '';
      name = profile.name || email.split('@')[0];
      googleId = profile.sub || '';
      avatar = profile.picture || '';
    } else if (credential) {
      // 2. Cryptographic ID Token Verification via Google Tokeninfo API
      try {
        const tokenInfoRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
        );
        if (!tokenInfoRes.ok) {
          res.status(400).json({
            success: false,
            message: 'Google credential token failed cryptographic signature verification.',
          });
          return;
        }

        const tokenInfo: {
          aud?: string;
          iss?: string;
          exp?: string;
          email?: string;
          email_verified?: string | boolean;
          sub?: string;
          name?: string;
          picture?: string;
        } = await tokenInfoRes.json();
        const tokenIsValid =
          isConfiguredOAuthValue(clientId) &&
          tokenInfo.aud === clientId &&
          (tokenInfo.iss === 'accounts.google.com' || tokenInfo.iss === 'https://accounts.google.com') &&
          Number(tokenInfo.exp) > Math.floor(Date.now() / 1000) &&
          (tokenInfo.email_verified === true || tokenInfo.email_verified === 'true') &&
          Boolean(tokenInfo.email && tokenInfo.sub);

        if (!tokenIsValid) {
          res.status(400).json({
            success: false,
            message: 'Google credential token failed identity, audience, or expiry validation.',
          });
          return;
        }

        email = tokenInfo.email || '';
        name = tokenInfo.name || email.split('@')[0];
        googleId = tokenInfo.sub || '';
        avatar = tokenInfo.picture || '';
      } catch (e: any) {
        res.status(400).json({ success: false, message: `Google token verification error: ${e.message}` });
        return;
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Google Client Secret is not configured on the server. Please set GOOGLE_CLIENT_SECRET in .env',
        code: 'GOOGLE_SECRET_MISSING',
      });
      return;
    }

    if (!email || !googleId) {
      res.status(400).json({ success: false, message: 'Google account did not return a verified email.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (isDbConnected()) {
      let dbUser = await UserModel.findOne({ googleId });
      if (!dbUser) dbUser = await UserModel.findOne({ email: normalizedEmail });
      if (!dbUser) {
        dbUser = await UserModel.create({
          name,
          email: normalizedEmail,
          authProvider: 'google',
          googleId,
          avatar,
          isEmailVerified: true, // Google verifies email ownership
          role: 'customer',
          addresses: [],
        });
      } else {
        // Safe account linking: ensure account is not already bound to a different Google ID
        if (dbUser.googleId && dbUser.googleId !== googleId) {
          res.status(409).json({
            success: false,
            message: 'This email account is already associated with another Google identifier.',
          });
          return;
        }
        dbUser.googleId = googleId;
        dbUser.isEmailVerified = true;
        if (!dbUser.avatar && avatar) dbUser.avatar = avatar;
        await dbUser.save();
      }

      const token = jwt.sign(
        { id: dbUser._id, email: dbUser.email, role: dbUser.role, name: dbUser.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: dbUser._id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          avatar: dbUser.avatar,
          isEmailVerified: true,
          addresses: dbUser.addresses,
        },
      });
      return;
    }

    // In-memory
    let memUser = memoryStore.users.find((u) => u.googleId === googleId);
    if (!memUser) {
      memUser = memoryStore.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    }
    if (memUser?.googleId && memUser.googleId !== googleId) {
      res.status(409).json({
        success: false,
        message: 'This email account is already associated with another Google identifier.',
      });
      return;
    }
    if (!memUser) {
      memUser = {
        id: 'usr_' + Date.now(),
        name,
        email: normalizedEmail,
        role: 'customer',
        authProvider: 'google',
        googleId,
        avatar,
        isEmailVerified: true,
        addresses: [],
      };
      memoryStore.users.push(memUser);
    } else {
      memUser.googleId = googleId;
      memUser.isEmailVerified = true;
    }

    const token = jwt.sign(
      { id: memUser.id, email: memUser.email, role: memUser.role, name: memUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const {
      passwordHash: _,
      googleId: _googleId,
      facebookId: _facebookId,
      ...safeUser
    } = memUser;
    res.json({ success: true, token, user: safeUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 11. Facebook OAuth Flow Endpoints
export const getFacebookAuthUrl = (req: Request, res: Response): void => {
  const appId = memoryStore.authSettings.facebookAppId || process.env.FACEBOOK_APP_ID;

  if (!memoryStore.authSettings.facebookAuthEnabled ||
      !isConfiguredOAuthValue(appId) ||
      !isConfiguredOAuthValue(process.env.FACEBOOK_APP_SECRET)) {
    res.status(400).json({
      success: false,
      message: 'Facebook Login requires a valid app ID and server-side app secret configuration.',
      code: 'FACEBOOK_APP_UNCONFIGURED',
    });
    return;
  }

  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/auth/callback/facebook`;
  const state = setOAuthStateCookie(req, res, 'facebook');

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'email,public_profile',
    state,
  });

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  res.json({ success: true, url: authUrl, redirectUri });
};

export const handleFacebookCallback = (req: Request, res: Response): void => {
  sendOAuthCallback(req, res, 'facebook');
};

export const verifyFacebookAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state } = req.body;
    const appId = memoryStore.authSettings.facebookAppId || process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!consumeOAuthState(req, res, 'facebook', state)) {
      res.status(400).json({ success: false, message: 'Facebook OAuth state validation failed.' });
      return;
    }

    if (!code) {
      res.status(400).json({ success: false, message: 'Authorization code is required.' });
      return;
    }

    if (
      !memoryStore.authSettings.facebookAuthEnabled ||
      !isConfiguredOAuthValue(appId) ||
      !isConfiguredOAuthValue(appSecret)
    ) {
      res.status(400).json({
        success: false,
        message: 'Facebook App Secret is not configured. Please set FACEBOOK_APP_SECRET in .env',
        code: 'FACEBOOK_SECRET_MISSING',
      });
      return;
    }

    const appUrl = getAppUrl(req);
    const redirectUri = `${appUrl}/auth/callback/facebook`;

    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.search = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      client_secret: appSecret,
      code,
    }).toString();
    const tokenRes = await fetch(tokenUrl);

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      res.status(400).json({
        success: false,
        message: tokenData.error?.message || 'Failed to exchange authorization code with Facebook.',
      });
      return;
    }

    // Fetch user profile from Facebook Graph API
    const profileRes = await fetch(
      'https://graph.facebook.com/me?fields=id,name,email,picture.type(large)',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    if (!profileRes.ok) {
      res.status(400).json({ success: false, message: 'Facebook did not return a valid user profile.' });
      return;
    }
    const profile: {
      id?: string;
      name?: string;
      email?: string;
      picture?: { data?: { url?: string } };
    } = await profileRes.json();
    if (!profile.id) {
      res.status(400).json({ success: false, message: 'Facebook did not return a valid account identifier.' });
      return;
    }
    if (!profile.email) {
      res.status(400).json({
        success: false,
        message: 'Facebook did not provide an email address. Use email registration or grant email permission.',
      });
      return;
    }

    const email = profile.email;
    const name = profile.name || 'Facebook Customer';
    const facebookId = profile.id;
    const avatar = profile.picture?.data?.url;
    const normalizedEmail = email.toLowerCase().trim();

    if (isDbConnected()) {
      let dbUser = await UserModel.findOne({ facebookId });

      if (!dbUser) {
        const existingEmailUser = await UserModel.findOne({ email: normalizedEmail });
        if (existingEmailUser) {
          res.status(409).json({
            success: false,
            message: 'An account with this email already exists. Sign in to that account before linking Facebook.',
          });
          return;
        }
        dbUser = await UserModel.create({
          name,
          email: normalizedEmail,
          authProvider: 'facebook',
          facebookId,
          avatar,
          isEmailVerified: false,
          role: 'customer',
          addresses: [],
        });
      } else {
        if (!dbUser.avatar && avatar) dbUser.avatar = avatar;
        await dbUser.save();
      }

      const token = jwt.sign(
        { id: dbUser._id, email: dbUser.email, role: dbUser.role, name: dbUser.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: dbUser._id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          avatar: dbUser.avatar,
          isEmailVerified: dbUser.isEmailVerified,
          addresses: dbUser.addresses,
        },
      });
      return;
    }

    // In-memory
    let memUser = memoryStore.users.find((u) => u.facebookId === facebookId);
    if (!memUser && memoryStore.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Sign in to that account before linking Facebook.',
      });
      return;
    }
    if (!memUser) {
      memUser = {
        id: 'usr_' + Date.now(),
        name,
        email: normalizedEmail,
        role: 'customer',
        authProvider: 'facebook',
        facebookId,
        avatar,
        isEmailVerified: false,
        addresses: [],
      };
      memoryStore.users.push(memUser);
    }

    const token = jwt.sign(
      { id: memUser.id, email: memUser.email, role: memUser.role, name: memUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const {
      passwordHash: _,
      googleId: _googleId,
      facebookId: _facebookId,
      ...safeUser
    } = memUser;
    res.json({ success: true, token, user: safeUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
