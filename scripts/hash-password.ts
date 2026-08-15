import { hacherMotDePasse } from '../src/lib/server/auth.ts';

// Ne dépend que de node:crypto (via auth.ts) : aucune base de données, aucun
// import Prisma, donc utilisable avant même le premier "docker compose up".

// Caracteres de controle bruts (invisibles ci-dessous) : 0x04 Ctrl-D,
// 0x03 Ctrl-C, 0x7f Backspace. setRawMode livre les octets tels quels, sans
// terminal readline capable d'interpreter un echappement \u lisible.
const ENTREE = '\n';
const ENTREE_CR = '\r';
const CTRL_D = '';
const CTRL_C = '';
const BACKSPACE = '';
const BACKSPACE_ALT = '\b';

function demanderMotDePasseMasque(question: string): Promise<string> {
	return new Promise((resolve, reject) => {
		process.stdout.write(question);

		const stdin = process.stdin;
		const etaitBrut = stdin.isTTY ? stdin.isRaw : undefined;
		if (stdin.isTTY) stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding('utf8');

		let motDePasse = '';

		const terminer = () => {
			stdin.removeListener('data', surDonnee);
			if (stdin.isTTY) stdin.setRawMode(etaitBrut ?? false);
			stdin.pause();
		};

		// Le terminal peut livrer plusieurs caracteres dans un seul evenement
		// "data" (frappe rapide, collage) : on traite donc chaque caractere du
		// paquet individuellement plutot que de supposer un evenement par touche.
		const surDonnee = (paquet: string) => {
			for (const touche of paquet) {
				switch (touche) {
					case ENTREE:
					case ENTREE_CR:
					case CTRL_D:
						terminer();
						process.stdout.write('\n');
						resolve(motDePasse);
						return;
					case CTRL_C:
						terminer();
						process.stdout.write('\n');
						reject(new Error('Interrompu.'));
						return;
					case BACKSPACE:
					case BACKSPACE_ALT:
						motDePasse = motDePasse.slice(0, -1);
						break;
					default:
						// Ignore les autres touches de contrôle (flèches, etc.).
						if (touche >= ' ') motDePasse += touche;
						break;
				}
			}
		};

		stdin.on('data', surDonnee);
	});
}

async function main() {
	if (!process.stdin.isTTY) {
		console.error(
			'Ce script doit être lancé dans un terminal interactif (saisie masquée requise).'
		);
		process.exitCode = 1;
		return;
	}

	const motDePasse = await demanderMotDePasseMasque('Mot de passe : ');
	if (motDePasse.length === 0) {
		console.error('Mot de passe vide, abandon.');
		process.exitCode = 1;
		return;
	}

	const confirmation = await demanderMotDePasseMasque('Confirmer le mot de passe : ');
	if (motDePasse !== confirmation) {
		console.error('Les deux saisies ne correspondent pas, abandon.');
		process.exitCode = 1;
		return;
	}

	const hash = hacherMotDePasse(motDePasse);
	console.log('\nAUTH_PASSWORD_HASH à coller dans .env :\n');
	console.log(hash);
	console.log();
}

main().catch((erreur: Error) => {
	console.error(erreur.message);
	process.exitCode = 1;
});
