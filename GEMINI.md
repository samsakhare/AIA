# Deployment Rules

When you build the project and if it is successful and without error, you MUST perform the following deployment steps to the VPS:

1. **Dashboard Version Bump**: Every time you commit something, you MUST bump the version of the `aia-admin` by running `npm version patch` in the `apps/dashboard` directory. The layout reads from `package.json` to show the current version in the footer.
2. Run `git add .`, `git commit -m "..."`, and `git push` to push the latest code to GitHub.
3. Read the following environment variables from the `.env` file: `VPS_IP`, `VPS_PASSWORD`, and `VPS_FOLDER`.
4. SSH into the VPS using the IP and password, navigate to `VPS_FOLDER`, and run `git pull origin main`.
5. Execute `docker compose up -d --build` on the VPS to rebuild and restart the services.

**CRITICAL RESTRICTION:** You are NOT allowed to touch or modify any files on the VPS other than the ones located inside the VPS_FOLDER.
