# Deployment Rules

When you build the project and if it is successful and without error, you MUST perform the following deployment steps to the VPS:

1. Run git add ., git commit -m "Deployment commit", and git push to push the latest code to GitHub.
2. Read the following environment variables from the .env file: VPS_IP, VPS_PASSWORD, and VPS_FOLDER.
3. SSH into the VPS using the IP and password, navigate to VPS_FOLDER, and run git pull origin main.
4. Execute docker compose up -d --build on the VPS to rebuild and restart the services.

**CRITICAL RESTRICTION:** You are NOT allowed to touch or modify any files on the VPS other than the ones located inside the VPS_FOLDER.
