# WorkLink - Frontend

Platform de freelance - Application Angular 21.

## Prerequisites

- Node.js 18+
- npm 9+ ou yarn

## Configuration

### 1. Copier le fichier d'environnement

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
```

### 2. Configurer les variables

Ouvrir `src/environments/environment.ts` et remplir:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',

  // Google OAuth (https://console.cloud.google.com/)
  googleClientId: 'votre-google-client-id.apps.googleusercontent.com',

  // LinkedIn OAuth (https://www.linkedin.com/developers/)
  linkedInClientId: 'votre-linkedin-client-id',
  linkedInRedirectUri: 'http://localhost:4200/auth/linkedin/callback',
};
```

### 3. Créer environment.prod.ts pour la production

```bash
cp src/environments/environment.example.ts src/environments/environment.prod.ts
```

Modifier `production: true` et ajuster l'URL de l'API.

## Installation

```bash
npm install
```

## Development server

```bash
ng serve
```

L'application sera disponible sur `http://localhost:4200`

## Building

```bash
ng build
```

Pour la production:

```bash
ng build --configuration production
```

## Structure

```
src/app/
├── core/            # Services, Guards, Interceptors
├── features/        # Composants de pages
│   ├── auth/        # Login, Register
│   └── edit-profile # Édition profil
├── shared/          # Composants réutilisables
│   └── components/
│       ├── navbar/
│       └── file-upload/
└── environments/    # Configuration
```

## Fonctionnalités

- Authentification JWT
- OAuth Google & LinkedIn
- Upload de photo de profil
- Upload de CV
- Édition de profil complet
- CV manuel étape par étape
- Thème clair/sombre
