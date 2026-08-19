# Deployment & Development Rules

**CRITICAL WORKFLOW:** Do NOT commit, push, or deploy changes automatically after writing code.

1. Make changes locally.
2. We will test and verify the changes locally together.
3. If there are any bugs, tweaks, or fixes needed, I will instruct you to fix them locally.
4. **ONLY when I explicitly tell you to commit and push**, you will proceed with the deployment steps below.

## VPS Deployment Steps

Once I have given you explicit approval to deploy, you MUST perform the following steps:

1. **Dashboard Version Bump**: You MUST bump the version of the `aia-admin` by running `npm version patch` in the `apps/dashboard` directory. The layout reads from `package.json` to show the current version in the footer.
2. Run `git add .`, `git commit -m "..."`, and `git push` to push the latest code to GitHub.
3. Read the following environment variables from the `.env` file: `VPS_IP`, `VPS_PASSWORD`, and `VPS_FOLDER`.
4. SSH into the VPS using the IP and password, navigate to `VPS_FOLDER`, and run `git pull origin main`.
5. Execute `docker compose up -d --build` on the VPS to rebuild and restart the services.
6. Check for completion natively via task manager or status (Wait reasonably long, e.g. 60 seconds if polling, but avoid rapid manual polling - wait for background task alerts).

**CRITICAL RESTRICTION:** You are NOT allowed to touch or modify any files on the VPS other than the ones located inside the VPS_FOLDER.
