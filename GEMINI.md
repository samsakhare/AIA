# Deployment Rules

When you build the project and if it is successful and without error, you MUST perform the following deployment steps to the VPS:

1. Create an archive (tar or zip) of all contents in "D:\Sameer\Genxsys\AIA".
2. Read the following environment variables from the .env file: VPS_IP, VPS_PASSWORD, and VPS_FOLDER.
3. Securely copy (e.g. SCP) the archive to the VPS using the IP and password, placing it in the VPS_FOLDER.
4. SSH into the VPS and extract the archive inside VPS_FOLDER, ensuring that all files are properly extracted and replaced.

**CRITICAL RESTRICTION:** You are NOT allowed to touch or modify any files on the VPS other than the ones located inside the VPS_FOLDER.

After deployment, you may optionally execute docker-compose up -d --build on the VPS to start the services.
