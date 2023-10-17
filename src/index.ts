import { PrismaClient, User } from "@prisma/client";
import express, { NextFunction } from "express";
import { UserTable } from "./data/userTable";
import session from "express-session";
import { TurnkeyClient } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { Request } from 'express';
import { PrivateKeyTable } from "./data/privateKeyTable";
import { TCreateSubOrganizationBody, TCreateWalletBody } from "@turnkey/http/dist/__generated__/services/coordinator/public/v1/public_api.fetcher";

const prisma = new PrismaClient();
const SESSION_SALT = 'your-session-salt';
export const SESSION_USER_ID_KEY = "user_id";

const app = express();
const port = process.env.PORT || 3000;
const PrismaSessionStore = require('./utils/prismaSessionStore')(session.Store, prisma);

app.use(express.json());
app.use(express.raw({ type: "application/vnd.custom-type" }));
app.use(express.text({ type: "text/html" }));


// This stamper produces signatures using the API key pair passed in.
const stamper = new ApiKeyStamper({
  apiPublicKey: process.env.TURNKEY_ORGANIZATION_ID!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
});

// The Turnkey client uses the passed in stamper to produce signed requests
// and sends them to Turnkey
const turnkeyClient = new TurnkeyClient(
  {
    baseUrl: "https://api.turnkey.com",
  },
  stamper
);


app.use(session({
  secret: SESSION_SALT,
  resave: false,
  saveUninitialized: true,
  store: new PrismaSessionStore(),
  cookie: { secure: false, maxAge: 60 * 60 * 24 * 1000 } // 1 day
}));


// /api/whoami
app.get('/api/whoami', async (req, res) => {
  const user = getCurrentUser(req);
  if (user) {
      res.status(200).json(user);
  } else {
      res.status(204).send();
  }
});

// /api/registration/:email
app.get('/api/registration/:email', async (req, res) => {
  try {
      const email = req.params.email;
      const user = await UserTable.findUserByEmail(email);
      res.status(200).json({
          userId: user.id,
          subOrganizationId: user.subOrganizationId,
      });
  } catch {
      res.status(204).send();
  }
});

// /api/registration/:email
app.post('/api/register', async (req, res) => {
  try {
      const requestBody: RegistrationRequest = req.body;

      const user = await UserTable.createUser(requestBody.Email); // Assume you've the createUser function defined or imported
      
      const subOrganizationBody:TCreateSubOrganizationBody = {
        organizationId: process.env.TURNKEY_ORGANIZATION_ID!, parameters: {
          subOrganizationName: requestBody.Email,
          rootUsers: [],
          rootQuorumThreshold: 0,
          privateKeys: []
        },
        type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V3",
        timestampMs: ""
      }
      const subOrganizationId = await turnkeyClient.createSubOrganization(subOrganizationBody);
      
      await UserTable.updateUserTurnkeySubOrganization(user.id, subOrganizationId.activity.organizationId);
      const createWalletBody:TCreateWalletBody = {
        organizationId: subOrganizationId.activity.organizationId,
        parameters: {
          walletName: requestBody.Email,
          accounts: []
        },
        type: "ACTIVITY_TYPE_CREATE_WALLET",
        timestampMs: ""
      }
      const privateKeyId = await turnkeyClient.createWallet(createWalletBody);
      const addresses = await turnkeyClient.getPrivateKey({organizationId:process.env.TURNKEY_ORGANIZATION_ID!,privateKeyId:privateKeyId.activity.id})

      const pk = await PrivateKeyTable.savePrivateKeyForUser(user, privateKeyId.activity.id, addresses.privateKey.addresses[0].address as string);
      startUserLoginSession(req, user.id); 
      
      res.status(200).send('Account successfully created');
  } catch (error:unknown) {
      res.status(500).send((error as any).message);
  }
});

// /api/authenticate
app.post('/api/authenticate', async (req, res) => {
  try {
      const reqBody: AuthenticationRequest = req.body;
      
      const { status, bodyBytes } = await turnkeyClient.???(reqBody.SignedWhoamiRequest.Url, reqBody.SignedWhoamiRequest.Body, reqBody.SignedWhoamiRequest.Stamp, true);

      if(status !== 200) {
          throw new Error(`Expected 200 when forwarding whoami request. Got ${status}`);
      }

      let parsedBody = JSON.parse(bodyBytes);  // Assuming bodyBytes is converted to a string named bodyString
      let subOrganizationId = parsedBody.organizationId;
      const user = await UserTable.findUserBySubOrganizationId(subOrganizationId);
      
      startUserLoginSession(req, user.id);
      res.status(200).send('Successful login');
  } catch (error: unknown) {
      res.status(500).send((error as any).message);
  }
});

// /api/wallet/drop
app.post('/api/wallet/drop', async (req, res) => {
  try {
  } catch (error: unknown) {
    res.status(500).send((error as any).message);
}
});

// /api/wallet/construct-tx
app.post('/api/wallet/construct-tx', async (req, res) => {
  try {
  } catch (error: unknown) {
    res.status(500).send((error as any).message);
}
});

// /api/wallet/send-tx
app.post('/api/wallet/send-tx', async (req, res) => {
  try {
  } catch (error: unknown) {
    res.status(500).send((error as any).message);
}
});

// /api/wallet/history
app.post('/api/wallet/history', async (req, res) => {
  try {
  } catch (error: unknown) {
    res.status(500).send((error as any).message);
}
});

// /api/logout
app.post('/api/logout', (req, res) => {
  endUserSession(req);
  res.status(http.NO_CONTENT).send('');
});

// /api/suborganization
app.get('/api/suborganization', async (req, res) => {
  const user = getCurrentUser(req);
  if (!user) {
      res.status(http.FORBIDDEN).send('no current user');
      return;
  }

  if (!user.subOrganizationId) {
      res.status(http.INTERNAL_SERVER_ERROR).send('null sub-organization id for current user');
  } else {
      try {
          const subOrganization = await turnkeyClient.getSubOrganization(user.subOrganizationId);
          res.status(http.OK).json(subOrganization);
      } catch (err) {
          res.status(http.INTERNAL_SERVER_ERROR).send(err.message);
      }
  }
});

// /api/wallet
app.get('/api/wallet', async (req, res) => {
  const user = getCurrentUser(req);
  if (!user) {
      res.status(http.FORBIDDEN).send('no current user');
      return;
  }

  try {
      const privateKey = await PrivateKeyTable.getPrivateKeyForUser(user);
      const balance = await ethereum.getBalance(privateKey.ethereumAddress);
      res.status(http.OK).json({
          address: privateKey.ethereumAddress,
          turnkeyUuid: privateKey.turnkeyUUID,
          balance: formatBalance(balance),
          dropsLeft: privateKey.dropsLeft()
      });
  } catch (err) {
      res.status(http.INTERNAL_SERVER_ERROR).send(errors.wrap(err, 'unable to retrieve key for current user').message);
  }
});



app.listen(Number(port), "0.0.0.0", () => {
    console.log(`Example app listening at http://localhost:${port}`);
});


export function getCurrentUser(req: Request): Promise<User | null> {
  const userIdOrNil = (req.session as any)[SESSION_USER_ID_KEY];

  
  if (userIdOrNil === undefined) {
    console.log("session.Get returned undefined; no session provided?");
    return Promise.resolve(null);
  }

  const userId: number = userIdOrNil; // Assuming userId is stored as number in session
  return prisma.user.findUnique({
    where: { id: userId }
  })
  .catch(err => {
    console.error(`Error while getting current user "${userId}": ${err}`);
    return null;
  });
}

export function startUserLoginSession(req: Request, userId: number) {
  if (!req.session) return;

  (req.session as any)[SESSION_USER_ID_KEY] = userId;
  req.session.save(err => {
    if (err) {
      console.error(`Error while saving session for user ${userId}: ${err}`);
    }
  });
}

export function endUserSession(req: Request, res: Response, next: NextFunction) {
  const userIdOrNil = (req.session as any)[SESSION_USER_ID_KEY];

  if (userIdOrNil === undefined) {
    console.error("Error: trying to end session but no user ID data");
    return;
  }

  req.session?.destroy(err => {
    if (err) {
      console.error(`Error while deleting current session: ${err}`);
    } else {
      console.log(`Success: user ${userIdOrNil} was logged out`);
      next();
    }
  });
}