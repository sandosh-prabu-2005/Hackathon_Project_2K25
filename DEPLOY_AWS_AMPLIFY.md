# AWS Deployment (Amplify + FastAPI Backend)

This project should be deployed as:
- Frontend (`Hackathon_Project_2K25-1`) on AWS Amplify Hosting
- Backend (`Backend/merged_app.py`) on AWS App Runner (container)

Amplify does not natively run this Python ML backend directly.

## 1. Deploy Backend to App Runner

1. Build and push backend image to ECR:
```powershell
cd Backend
aws ecr create-repository --repository-name disaster-backend
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
docker build -t disaster-backend:latest .
docker tag disaster-backend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/disaster-backend:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/disaster-backend:latest
```

2. In AWS App Runner:
- Create service from ECR image
- Port: `8080`
- Start command: use Docker default (`python merged_app.py`)
- Add environment variables from `Backend/.env` (or secrets manager)

3. Save backend URL, for example:
`https://abc123.ap-south-1.awsapprunner.com`

## 2. Deploy Frontend to Amplify

1. In AWS Amplify Hosting:
- Connect your Git repository
- Branch: your deploy branch
- App root: `Hackathon_Project_2K25-1`
- Build spec: use repository `amplify.yml` (already added)

2. Add Amplify environment variable:
- `VITE_API_BASE=https://<your-apprunner-url>`

3. Deploy.

## 3. Post-deploy checks

After Amplify deploys, verify:
- Frontend loads without blank page
- `GET <VITE_API_BASE>/health` returns `{"status":"ok"...}`
- Chat, weather, flood, earthquake, landslide calls succeed from UI
- Browser console has no mixed-content errors

## 4. Required AWS services

- Amplify Hosting (frontend)
- ECR (backend container image)
- App Runner (backend runtime)
- Optional: Route53 + ACM for custom domains
