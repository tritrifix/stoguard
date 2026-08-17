import webpush from 'web-push';

// Aucune saisie nécessaire (contrairement à hash-password.ts) : ces clés
// sont générées aléatoirement, pas choisies par l'utilisateur. N'écrit nulle
// part, ne dépend d'aucune base de données ni de l'application démarrée.
const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log('\nÀ coller dans .env :\n');
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log(
	'\nVAPID_SUBJECT doit aussi être renseigné (mailto:vous@exemple.fr ou https://votre-domaine),',
	'\nvoir .env.example — ce n\'est pas généré ici.\n'
);
