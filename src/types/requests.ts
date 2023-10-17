interface RegistrationRequest {
    Email: string;
    Attestation: Attestation;
    Challenge: string;
}

interface Attestation {
    CredentialId: string;
    ClientDataJson: string;
    AttestationObject: string;
    Transports: string[];
}

interface AuthenticationRequest {
    SignedWhoamiRequest: SignedTurnkeyRequest;
}

interface ConstructTxParams {
    destination: string; 
    amount: string;
}

interface SendTxParams {
    signedSendTx: SignedTurnkeyRequest;
}

interface SignedTurnkeyRequest {
    Url: string;
    Body: string;
    Stamp: string;
}
