Deployment instructions for the SMS worker

Option A — Cloud Run (recommended for managed infra)

1) Build and push image (gcloud):

```bash
# set project and region
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region asia-southeast1

# build and push image to Artifact Registry or Container Registry
# example using Container Registry (gcr)
gcloud builds submit --tag gcr.io/$GOOGLE_CLOUD_PROJECT/sms-worker:latest functions/

# deploy to Cloud Run
gcloud run deploy sms-worker \
  --image gcr.io/$GOOGLE_CLOUD_PROJECT/sms-worker:latest \
  --platform managed \
  --region asia-southeast1 \
  --memory 256Mi \
  --concurrency 1 \
  --set-env-vars SMS_PROVIDER_URL=...,SMS_PROVIDER_API_KEY=... \
  --service-account YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com \
  --allow-unauthenticated=false
```

Notes:
- Assign the service account proper roles: Firestore Admin / Realtime DB Admin, or finely-scoped roles.
- Cloud Run will use Workload Identity by default for ADC.
- Set `SMS_PROVIDER_URL`/`SMS_PROVIDER_API_KEY` if using a real provider.

Option B — Small VM (Compute Engine)

1) Create a small VM (e.g., e2-micro) with Node.js installed or install Node.js 18.
2) Copy `functions/` directory to the VM (scp, git clone, etc.).
3) Install dependencies and run as systemd service.

Example systemd service file: `/etc/systemd/system/sms-worker.service`

```ini
[Unit]
Description=SMS Worker
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/youruser/functions
ExecStart=/usr/bin/node smsWorkerSample.js
Restart=on-failure
RestartSec=5
Environment="GOOGLE_APPLICATION_CREDENTIALS=/home/youruser/creds.json"
Environment="SMS_PROVIDER_URL=https://..."
Environment="SMS_PROVIDER_API_KEY=..."

[Install]
WantedBy=multi-user.target
```

Commands to enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable sms-worker
sudo systemctl start sms-worker
sudo journalctl -u sms-worker -f
```

Security notes:
- Prefer Cloud Run with Workload Identity or attach a service account to the VM rather than embedding credentials file.
- Ensure network egress to the SMS provider is allowed.

If you want, I can:
- create a `cloudbuild.yaml` for CI builds, or
- create a `gcloud` deploy script, or
- patch `functions/index.js` to normalize `sms` statuses to match the worker's `sent`/`error` naming.
