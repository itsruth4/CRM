# Lead Ledger

## Run with MongoDB

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to your MongoDB Atlas connection string. Keep this file private.
3. Run `npm start`.
4. Open `http://localhost:3000/login.html` and sign in.

The app stores leads in the `leads` collection and team members in the `team` collection inside the database named by `MONGODB_DB`.

Login settings are controlled by `APP_USERNAME`, `APP_PASSWORD`, and `SESSION_SECRET` in `.env`. Change the default password before deploying this app publicly, and use a long random `SESSION_SECRET`.

## Open from another device on the same Wi-Fi

1. Keep the computer running `npm start`.
2. On the other device, connect to the same Wi-Fi network.
3. Open `http://192.168.1.74:3000/lead-ledger.html`.
4. If Windows Firewall asks, allow Node.js on private networks.

The local IP can change when the computer reconnects to Wi-Fi. Run `ipconfig` and use the current IPv4 address if this URL stops working.

For access from outside this Wi-Fi network, deploy the Node server to a hosting service instead of exposing port 3000 directly to the internet.

## Deploy for a remote team

1. Create a private GitHub repository and upload this project. Do not upload `.env`.
2. Create a Render account at `render.com` and choose **New + > Blueprint**.
3. Select the GitHub repository. Render will detect `render.yaml`.
4. Add these secret environment variables when Render asks:
	- `MONGODB_URI`: your MongoDB Atlas connection string
	- `APP_PASSWORD`: a strong team password
5. In MongoDB Atlas **Network Access**, allow the deployed service to connect. For a quick setup, `0.0.0.0/0` allows connections from anywhere; keep database credentials strong and use least-privilege access.
6. Deploy and share the Render HTTPS URL ending in `/login.html` with your team.

Your computer does not need to stay on after the Render deployment is live. The cloud service connects to MongoDB and serves the dashboard for all team members.