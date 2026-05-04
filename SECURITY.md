# Security Incident Response

## Security Contact
If you discover a security vulnerability, please contact: security@lyriclearn.example.com

## Token Revocation Procedures

### Spotify
If Spotify client secrets are compromised:
1. Go to the Spotify Developer Dashboard.
2. Select the WordMusa application.
3. Click "Rotate Client Secret".
4. Update `SPOTIFY_CLIENT_SECRET` in Firebase Secret Manager:
   ```bash
   firebase secrets:set SPOTIFY_CLIENT_SECRET
   ```

### Musixmatch
If Musixmatch API key is compromised:
1. Contact Musixmatch support or regenerate via dashboard.
2. Update `MUSIXMATCH_API_KEY` in Firebase Secret Manager.

### Anthropic
If Anthropic API key is compromised:
1. Log into the Anthropic Console.
2. Disable the compromised key.
3. Generate a new key.
4. Update `ANTHROPIC_API_KEY` in Firebase Secret Manager.

*Note: An Anthropic API key was found in git history (commit a2bc3860). It must be rotated immediately.*

## Emergency Lockdown
To lock down Firestore access during an incident:
1. Open `backend/firestore.rules`.
2. Temporarily change all allow rules to `false`:
   ```javascript
   match /{document=**} {
     allow read, write: if false;
   }
   ```
3. Deploy rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Incident Log Template
```markdown
### Incident: [Date] - [Title]
- **Time Detected:**
- **Affected Components:**
- **Impact:**
- **Actions Taken:**
- **Resolution:**
```
