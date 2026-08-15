import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Paramètres OWASP pour scrypt. N=2^17 exige ~128 Mio de mémoire (128 * N * r
// octets) ; le plafond par défaut de scryptSync est 32 Mio, donc sans maxmem
// explicite l'appel lève "memory limit exceeded".
const SCRYPT_N = 2 ** 17;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 256 * 1024 * 1024;
const CLE_TAILLE = 64;
const SEL_TAILLE = 16;

const FORMAT_HASH = /^[0-9a-f]{32}:[0-9a-f]{128}$/;
const FORMAT_SIGNATURE = /^[0-9a-f]{64}$/;

function scrypt(motDePasse: string, sel: Buffer): Buffer {
	return scryptSync(motDePasse, sel, CLE_TAILLE, {
		N: SCRYPT_N,
		r: SCRYPT_R,
		p: SCRYPT_P,
		maxmem: SCRYPT_MAXMEM
	});
}

/** "sel:hash", tous deux en hexadécimal, à stocker dans AUTH_PASSWORD_HASH. */
export function hacherMotDePasse(motDePasse: string): string {
	const sel = randomBytes(SEL_TAILLE);
	const hash = scrypt(motDePasse, sel);
	return `${sel.toString('hex')}:${hash.toString('hex')}`;
}

export function verifierMotDePasse(motDePasse: string, stocke: string): boolean {
	if (!FORMAT_HASH.test(stocke)) return false;

	const [selHex, hashHex] = stocke.split(':');
	const sel = Buffer.from(selHex, 'hex');
	const hashAttendu = Buffer.from(hashHex, 'hex');
	const hashCalcule = scrypt(motDePasse, sel);

	return timingSafeEqual(hashCalcule, hashAttendu);
}

function signer(payload: string, secret: string): string {
	return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Jeton de session : "<expiration_ms>.<signature>". La signature porte sur
 * l'expiration elle-même, donc la falsifier pour prolonger une session sans
 * connaître SESSION_SECRET est infaisable.
 */
export function creerJeton(expiration: Date, secret: string): string {
	const payload = String(expiration.getTime());
	return `${payload}.${signer(payload, secret)}`;
}

export function verifierJeton(
	jeton: string,
	secret: string,
	maintenant: Date = new Date()
): boolean {
	const separateur = jeton.indexOf('.');
	if (separateur === -1) return false;

	const payload = jeton.slice(0, separateur);
	const signature = jeton.slice(separateur + 1);
	if (!FORMAT_SIGNATURE.test(signature)) return false;

	const signatureAttendue = signer(payload, secret);
	if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(signatureAttendue, 'hex'))) {
		return false;
	}

	const expiration = Number(payload);
	if (!Number.isFinite(expiration)) return false;

	return maintenant.getTime() < expiration;
}
